import { NextRequest } from "next/server";
import { runManagerAgent } from "@/lib/agents/manager";
import { runTrendResearchAgent } from "@/lib/agents/trend-research";
import { runTrendAnalysisAgent } from "@/lib/agents/trend-analysis";
import { runManuscriptWritingAgent } from "@/lib/agents/manuscript-writing";
import { runThumbnailGenerationAgent } from "@/lib/agents/thumbnail-generation";
import { runFactCheckAgent } from "@/lib/agents/fact-check";
import { JobPostingInput } from "@/types/job-posting";
import { AllPlatformPostings } from "@/types/platform";
import { SSEEvent, AgentId } from "@/lib/agents/types";
import { ReferencePostingData } from "@/types/reference";
import { supabase } from "@/lib/supabase";
import { getFormattedKnowledge } from "@/lib/shared-knowledge";
import { getPlatformGuidelines } from "@/lib/platform-guidelines";
import { getCachedTrendResearch, saveTrendResearch } from "@/lib/trend-cache";
import { getOwnedJob } from "@/lib/org-scope";
import { startCostTracking, getTrackedCostYen } from "@/lib/api-cost";
import { requireAuth } from "@/lib/auth-guard";
import { getOrganization, canRunAgents, recordUsage } from "@/lib/billing/usage";
import { settlePendingOverages } from "@/lib/billing/overage";

export const runtime = "nodejs";
export const maxDuration = 300; // 5分

function createSSEMessage(event: SSEEvent): string {
  // JSON内の改行をSSE仕様に従って複数行dataに分割
  const json = JSON.stringify(event);
  const lines = json.split("\n");
  return lines.map((line) => `data: ${line}`).join("\n") + "\n\n";
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  event: SSEEvent
): void {
  controller.enqueue(new TextEncoder().encode(createSSEMessage(event)));
}

function sseErrorResponse(message: string, code: string): Response {
  const event: SSEEvent = {
    type: "workflow_error",
    agentId: "manager",
    message,
    data: { code },
    timestamp: new Date().toISOString(),
  };
  return new Response(createSSEMessage(event), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const org = await getOrganization(auth.user.orgId);
  if (!org) {
    return sseErrorResponse("組織情報が見つかりません", "org_not_found");
  }
  if (!canRunAgents(org)) {
    return sseErrorResponse(
      "プラン契約が必要です。設定 > プランからご契約ください",
      "subscription_required"
    );
  }

  const body = await request.json();
  const jobPostingInput = body as JobPostingInput;
  const usageJobId = typeof body.jobId === "string" ? body.jobId : null;

  const stream = new ReadableStream({
    async start(controller) {
      const now = () => new Date().toISOString();

      // Vercelプロキシの接続切断を防ぐため、15秒ごとにハートビートを送信
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          // ストリームが既に閉じている場合は無視
        }
      }, 15000);

      const startAgent = (agentId: AgentId, message: string) => {
        sendEvent(controller, {
          type: "agent_start",
          agentId,
          message,
          timestamp: now(),
        });
      };

      const progressAgent = (agentId: AgentId, message: string, data?: unknown) => {
        sendEvent(controller, {
          type: "agent_progress",
          agentId,
          message,
          data,
          timestamp: now(),
        });
      };

      const completeAgent = (agentId: AgentId, message: string, data?: unknown) => {
        sendEvent(controller, {
          type: "agent_complete",
          agentId,
          message,
          data,
          timestamp: now(),
        });
      };

      const errorAgent = (agentId: AgentId, message: string) => {
        sendEvent(controller, {
          type: "agent_error",
          agentId,
          message,
          timestamp: now(),
        });
      };

      try {
        // API 利用実費の集計を開始(このリクエスト内の Claude / 画像生成呼び出しが対象)
        startCostTracking();

        // 出力対象媒体（未指定・空は全媒体 = 後方互換）
        const allPlatforms = ["indeed", "airwork", "jobmedley", "hellowork"] as const;
        const targetPlatforms =
          jobPostingInput.selectedPlatforms && jobPostingInput.selectedPlatforms.length > 0
            ? allPlatforms.filter((p) => jobPostingInput.selectedPlatforms!.includes(p))
            : [...allPlatforms];
        const thumbnailPlatforms = targetPlatforms.filter(
          (p): p is "indeed" | "airwork" | "jobmedley" => p !== "hellowork"
        );

        // 媒体別ガイドライン（システム設定）をロード。DB未保存・取得失敗時はコード内デフォルト
        const guidelines = await getPlatformGuidelines(targetPlatforms);

        // DB からシステム参考原稿を取得（同業種・同職種でフィルタ）
        let userReferences: ReferencePostingData[] = [];
        try {
          const industry = jobPostingInput.common.industry;
          const jobType = jobPostingInput.common.jobTitle;

          // 優先度: 同職種&同業種 → 同職種 → 同業種 → フォールバック
          let query = supabase
            .from("SystemReferencePosting")
            .select("*")
            .order("createdAt", { ascending: false });

          if (jobType) query = query.ilike("jobType", `%${jobType}%`);
          if (industry) query = query.ilike("industry", `%${industry}%`);
          query = query.limit(5);

          const { data: refs } = await query;

          // フィルタ結果が少ない場合、フォールバックで追加取得
          let allRefs = refs || [];
          if (allRefs.length < 3) {
            const { data: fallbackRefs } = await supabase
              .from("SystemReferencePosting")
              .select("*")
              .order("createdAt", { ascending: false })
              .limit(5);
            const existingIds = new Set(allRefs.map((r) => r.id));
            const additional = (fallbackRefs || []).filter((r) => !existingIds.has(r.id));
            allRefs = [...allRefs, ...additional].slice(0, 5);
          }

          userReferences = allRefs.map((r) => ({
            id: r.id,
            title: r.title,
            platform: r.platform,
            industry: r.industry,
            jobType: r.jobType,
            postingData: JSON.parse(r.postingData) as Record<string, string>,
            performance: r.performance || undefined,
          }));
          if (userReferences.length > 0) {
            console.log(`[team-a] ${userReferences.length}件の参考原稿をロードしました`);
          }
        } catch (e) {
          console.warn("[team-a] 参考原稿の取得に失敗:", e);
        }

        // 流用作成: 流用元の確定原稿を最優先の参考原稿として注入
        const reuseSourceJobId =
          typeof body.reuseSourceJobId === "string" ? body.reuseSourceJobId : null;
        if (reuseSourceJobId) {
          try {
            const source = await getOwnedJob(reuseSourceJobId, auth.user, "read");
            if (!("error" in source)) {
              const { data: sourceRecords } = await supabase
                .from("JobRecord")
                .select("outputData")
                .eq("jobId", reuseSourceJobId)
                .eq("type", "team-a")
                .order("createdAt", { ascending: false })
                .limit(1);
              const outputData = sourceRecords?.[0]?.outputData;
              const sourceOutput = outputData
                ? (JSON.parse(outputData) as Record<string, Record<string, unknown>>)
                : null;
              if (sourceOutput) {
                const reuseRefs: ReferencePostingData[] = [];
                for (const p of targetPlatforms) {
                  const posting = sourceOutput[p];
                  if (!posting) continue;
                  const postingData: Record<string, string> = {};
                  for (const [k, v] of Object.entries(posting)) {
                    if (typeof v === "string" && v.trim()) postingData[k] = v;
                  }
                  if (Object.keys(postingData).length === 0) continue;
                  reuseRefs.push({
                    id: `reuse-${p}`,
                    title: "流用元の確定原稿（この構成・訴求の書き方を最優先で踏襲する）",
                    platform: p,
                    industry: jobPostingInput.common.industry || "",
                    jobType: jobPostingInput.common.jobTitle || "",
                    postingData,
                    performance: "流用元として選択された実績原稿",
                  });
                }
                if (reuseRefs.length > 0) {
                  userReferences = [...reuseRefs, ...userReferences].slice(0, 8);
                  console.log(`[team-a] 流用元原稿を${reuseRefs.length}媒体分ロードしました`);
                }
              }
            }
          } catch (e) {
            console.warn("[team-a] 流用元原稿の取得に失敗:", e);
          }
        }

        // 共有ナレッジを取得（職種×媒体の成功パターン）
        let sharedKnowledgeText = "";
        try {
          const category = jobPostingInput.common.jobTitle || jobPostingInput.common.industry || "";
          sharedKnowledgeText = await getFormattedKnowledge({ category });
          if (sharedKnowledgeText) {
            console.log(`[team-a] 共有ナレッジをロードしました`);
          }
        } catch (e) {
          console.warn("[team-a] 共有ナレッジの取得に失敗:", e);
        }

        // Step 1: Manager Agent
        startAgent("manager", "要件の確認・チェックを開始します");
        const managerOutput = await runManagerAgent({ jobPostingInput });
        completeAgent("manager", "要件確認完了", {
          summary: managerOutput.summary,
          isValid: managerOutput.isValid,
        });

        if (!managerOutput.isValid) {
          progressAgent(
            "manager",
            `入力情報に問題があります: ${managerOutput.issues.join(", ")}`,
            { issues: managerOutput.issues }
          );
        }

        // Step 2: Trend Research Agent（同条件の調査結果は7日間キャッシュ）
        startAgent("trend-research", "求人トレンドのWeb調査を開始します");
        const trendParams = {
          industry: jobPostingInput.common.industry,
          jobCategory: jobPostingInput.common.jobTitle,
          prefecture: jobPostingInput.common.prefecture,
          employmentType: jobPostingInput.common.employmentType,
        };
        let trendResearch = await getCachedTrendResearch(trendParams);
        const trendFromCache = !!trendResearch;
        if (!trendResearch) {
          trendResearch = await runTrendResearchAgent(trendParams);
          await saveTrendResearch(trendParams, trendResearch);
        }
        completeAgent(
          "trend-research",
          trendFromCache
            ? "トレンド調査完了（7日以内の調査結果を再利用）"
            : "トレンド調査完了",
          {
            resultCount: trendResearch.results.length,
            summary: trendResearch.summary,
          }
        );

        // Step 3: Trend Analysis Agent
        startAgent("trend-analysis", "トレンドデータの分析を開始します");
        const trendAnalysis = await runTrendAnalysisAgent({
          trendResearch,
          jobPostingInput,
        });
        completeAgent("trend-analysis", "トレンド分析完了", {
          popularityFactors: trendAnalysis.popularityFactors,
          recommendedKeywords: trendAnalysis.recommendedKeywords,
        });

        // Step 4: 参考原稿の選定
        // 媒体設定(フォーマット/アルゴリズム/制約)とシステム参考原稿を執筆プロンプトへ
        // 直接注入するため、LLMによる参考パターン生成は廃止(直列1コールぶん短縮)
        startAgent("reference-selection", "参考原稿を選定しています");
        completeAgent(
          "reference-selection",
          userReferences.length > 0
            ? `参考原稿選定完了（${userReferences.length}件を参照）`
            : "参考原稿選定完了（該当する登録原稿なし）",
          { referencesCount: userReferences.length }
        );

        // Step 5 & 6: Manuscript Writing + Thumbnail Generation (並列)
        startAgent("manuscript-writing", `${targetPlatforms.length}媒体の求人原稿を執筆開始します`);
        startAgent(
          "thumbnail-generation",
          thumbnailPlatforms.length > 0
            ? "サムネイル生成を開始します"
            : "サムネイル対象媒体がないため生成をスキップします"
        );

        const socialInsuranceText = Array.isArray(jobPostingInput.common.socialInsurance)
          ? jobPostingInput.common.socialInsurance.join(", ")
          : String(jobPostingInput.common.socialInsurance || "");

        const platformLabels: Record<string, string> = {
          indeed: "Indeed",
          airwork: "AirWork",
          jobmedley: "JobMedley",
          hellowork: "ハローワーク",
        };

        const [manuscriptResult, thumbnailOutput] = await Promise.all([
          runManuscriptWritingAgent({
            jobPostingInput,
            managerOutput,
            trendAnalysis,
            userReferences: userReferences.length > 0 ? userReferences : undefined,
            sharedKnowledge: sharedKnowledgeText || undefined,
            guidelines,
          }, (platform, preview) => {
            // 媒体別の書き上がりをライブプレビューとして配信
            progressAgent(
              "manuscript-writing",
              `${platformLabels[platform] || platform}の原稿が書き上がりました`,
              { platform, preview }
            );
          }).catch((err) => {
            console.error("[team-a] manuscript-writing failed:", err);
            errorAgent("manuscript-writing", err instanceof Error ? err.message : "原稿生成エラー");
            throw err;
          }),
          runThumbnailGenerationAgent({
            jobPostingInput,
            platforms: thumbnailPlatforms,
            manuscript: {
              indeed: {
                jobTitle: jobPostingInput.common.jobTitle,
                // 原稿執筆と並列実行のため確定キャッチコピーは無い。空にして
                // appealPoints → 「◯◯募集中」のフォールバックに任せる（画像に焼き込まれるため）
                catchphrase: "",
                jobDescription: jobPostingInput.common.jobDescription,
                appealPoints: "",
                requirements: jobPostingInput.common.requirements,
                holidays: jobPostingInput.common.holidays || "",
                benefits: jobPostingInput.common.benefits || "",
                access: "",
                socialInsurance: socialInsuranceText,
              },
              airwork: {
                jobTitle: jobPostingInput.common.jobTitle,
                catchphrase: "",
                jobDescription: jobPostingInput.common.jobDescription,
                requirements: jobPostingInput.common.requirements,
                selectionProcess: "",
              },
              jobmedley: {
                appealTitle: "",
                appealText: "",
                jobDescription: jobPostingInput.common.jobDescription,
                employmentTypeAndSalary: "",
                trainingSystem: "",
                workingHours: jobPostingInput.common.workingHours || "",
                requirements: jobPostingInput.common.requirements,
                welcomeRequirements: "",
                access: "",
                selectionProcess: "",
              },
              hellowork: {
                jobTitle: jobPostingInput.common.jobTitle,
                jobDescription: jobPostingInput.common.jobDescription,
                workplaceChange: "",
                jobContentChange: "",
                transferPossibility: "",
                employmentPeriod: "",
                contractRenewal: "",
                wageAmount: "",
                allowances: "",
                commutingAllowance: "",
                bonus: "",
                raise: "",
                salaryClosingDay: "",
                salaryPayDay: "",
                workingHours: jobPostingInput.common.workingHours || "",
                overtime: "",
                breakTime: "",
                holidays: jobPostingInput.common.holidays || "",
                annualHolidays: "",
                annualLeave: "",
                insurance: "",
                pension: "",
                trialPeriod: "",
                retirementAge: "",
                retirementBenefit: "",
                specialNotes: "",
                requirements: jobPostingInput.common.requirements,
                requiredLicenses: "",
                selectionMethod: "",
                selectionResultDays: "",
                applicationDocuments: "",
                applicationMethodHw: "",
                hiringManagerContact: "",
                remarks: "",
              },
            },
          }),
        ]);

        const manuscriptOutput = manuscriptResult;
        completeAgent("manuscript-writing", `原稿執筆完了（${targetPlatforms.length}媒体）`);
        const platformThumbnails = thumbnailOutput.platformThumbnails;
        const totalThumbnailCount =
          platformThumbnails.indeed.length +
          platformThumbnails.airwork.length +
          platformThumbnails.jobmedley.length;
        completeAgent("thumbnail-generation", thumbnailOutput.message, {
          thumbnailCount: totalThumbnailCount,
          status: thumbnailOutput.generationStatus,
        });

        // Step 7: Fact Check Agent
        startAgent("fact-check", "ファクトチェック・自動修正を開始します");
        const factCheckOutput = await runFactCheckAgent({
          jobPostingInput,
          manuscript: manuscriptOutput,
          guidelines,
        });
        completeAgent("fact-check", factCheckOutput.summary, {
          issueCount: factCheckOutput.issues.length,
          isClean: factCheckOutput.isClean,
        });

        // Step 8: Platform Formatter (final assembly)
        const { common } = jobPostingInput;
        const finalManuscript = factCheckOutput.correctedManuscript;

        // ファクトチェックのJSON修復でフィールドが欠落してもワークフロー全体を落とさない
        const countChars = (text?: string) => (text ?? "").length;

        // 固定残業代の表示文字列
        const fixedOvertimeText = common.fixedOvertimePay?.hasFixed
          ? `あり 月${common.fixedOvertimePay.hours ?? "?"}時間分 ${(common.fixedOvertimePay.amount ?? 0).toLocaleString()}円${common.fixedOvertimePay.note ? `（${common.fixedOvertimePay.note}）` : "（超過分は別途支給）"}`
          : common.fixedOvertimePay?.hasFixed === false
          ? "なし"
          : undefined;

        const airworkTrialText = jobPostingInput.airwork?.trialPeriod?.hasProvision
          ? `試用期間あり${jobPostingInput.airwork.trialPeriod.duration ? `（${jobPostingInput.airwork.trialPeriod.duration}）` : ""}${jobPostingInput.airwork.trialPeriod.conditions ? ` / ${jobPostingInput.airwork.trialPeriod.conditions}` : ""}`
          : "試用期間なし";

        const smokingPolicyText = common.smokingPolicy || "屋内全面禁煙";

        const hwInput = jobPostingInput.hellowork || {};
        const airInput = jobPostingInput.airwork || {};
        const idInput = jobPostingInput.indeed || {};
        const jmInput = jobPostingInput.jobmedley || {};
        const hm = common.hiringManager || {};

        // 生成された媒体のみ最終出力に含める
        const fmIndeed = finalManuscript.indeed;
        const fmAirwork = finalManuscript.airwork;
        const fmJobmedley = finalManuscript.jobmedley;
        const fmHellowork = finalManuscript.hellowork;

        const finalOutput: AllPlatformPostings = {
          ...(fmIndeed ? { indeed: {
            companyName: common.companyName,
            postalCode: common.postalCode,
            jobTitle: fmIndeed.jobTitle,
            catchphrase: fmIndeed.catchphrase,
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}名` : "若干名",
            location: `${common.prefecture}${common.city}${common.address || ""}`,
            employmentType: common.employmentType,
            salary: `${common.salaryType} ${Number(common.salaryMin || 0).toLocaleString()}円${common.salaryMax ? `〜${Number(common.salaryMax).toLocaleString()}円` : ""}`,
            salaryDisplayType: common.salaryDisplayType,
            workingHours: common.workingHours,
            socialInsurance: fmIndeed.socialInsurance,
            probationPeriod: fmIndeed.probationPeriod,
            fixedOvertimePay: fixedOvertimeText,
            monthlyWorkingHours: common.monthlyWorkingHours ? `月平均${common.monthlyWorkingHours}時間` : undefined,
            smokingPolicy: common.smokingPolicy,
            hiringManagerName: hm.name,
            contactPhone: hm.phone,
            contactEmail: hm.email,
            applicationMethod: idInput.applicationMethod,
            applicationUrl: idInput.applicationUrl,
            screeningQuestions: idInput.screeningQuestions,
            jobDescription: fmIndeed.jobDescription,
            appealPoints: fmIndeed.appealPoints,
            requirements: fmIndeed.requirements,
            holidays: fmIndeed.holidays,
            access: fmIndeed.access,
            benefits: fmIndeed.benefits,
            featureTags: idInput.featureTags,
            thumbnailUrls: platformThumbnails.indeed,
            recruitmentBudget: idInput.recruitmentBudget?.toString(),
            charCounts: {
              jobTitle: countChars(fmIndeed.jobTitle),
              catchphrase: countChars(fmIndeed.catchphrase),
              jobDescription: countChars(fmIndeed.jobDescription),
              appealPoints: countChars(fmIndeed.appealPoints),
              requirements: countChars(fmIndeed.requirements),
            },
          } } : {}),
          ...(fmAirwork ? { airwork: {
            jobTitle: fmAirwork.jobTitle,
            jobDescription: fmAirwork.jobDescription,
            location: `${common.prefecture}${common.city}`,
            requirements: fmAirwork.requirements,
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}名` : "若干名",
            salary: `${common.salaryType} ${Number(common.salaryMin || 0).toLocaleString()}円${common.salaryMax ? `〜${Number(common.salaryMax).toLocaleString()}円` : ""}`,
            salaryDisplayType: common.salaryDisplayType,
            holidays: common.holidays,
            socialInsurance: Array.isArray(common.socialInsurance) ? common.socialInsurance.join(", ") : String(common.socialInsurance || ""),
            benefits: common.benefits,
            selectionProcess: fmAirwork.selectionProcess,
            trialPeriod: airworkTrialText,
            applicationReceiveMethod: (airInput.applicationReceiveMethod || ["Web"]).join("、"),
            applicantInfoToGet: (airInput.applicantInfoToGet || ["氏名", "連絡先"]).join("、"),
            workDays: airInput.workDays,
            shiftPolicy: airInput.shiftPolicy,
            workPeriod: airInput.workPeriod,
            commuteAllowance: airInput.commuteAllowance,
            featureTags: airInput.featureTags,
            shiftIncomeExample: airInput.shiftIncomeExample,
            seniorStaffMessage: airInput.seniorStaffMessage,
            workplaceAtmosphere: airInput.workplaceAtmosphere,
            applicationFlow: airInput.applicationFlow,
            contactPhone: airInput.contactPhone || hm.phone,
            hpCatchphrase: airInput.hpCatchphrase || airInput.catchphrase,
            smokingPolicy: common.smokingPolicy,
            thumbnailUrls: platformThumbnails.airwork,
            charCounts: {
              jobTitle: countChars(fmAirwork.jobTitle),
              jobDescription: countChars(fmAirwork.jobDescription),
              requirements: countChars(fmAirwork.requirements),
            },
          } } : {}),
          ...(fmJobmedley ? { jobmedley: {
            appealTitle: fmJobmedley.appealTitle,
            appealText: fmJobmedley.appealText,
            jobDescription: fmJobmedley.jobDescription,
            employmentTypeAndSalary: fmJobmedley.employmentTypeAndSalary,
            benefits: common.benefits,
            trainingSystem: fmJobmedley.trainingSystem,
            workingHours: fmJobmedley.workingHours,
            holidays: common.holidays,
            requirements: fmJobmedley.requirements,
            welcomeRequirements: fmJobmedley.welcomeRequirements,
            access: fmJobmedley.access,
            selectionProcess: fmJobmedley.selectionProcess,
            facilityType: jmInput.facilityType,
            hiringManagerName: hm.name,
            contactPhone: hm.phone,
            contactEmail: hm.email,
            longTermHolidays: jmInput.longTermHolidays,
            staffVoice: jmInput.staffVoice,
            workplaceAtmosphere: jmInput.workplaceAtmosphere,
            thumbnailUrls: platformThumbnails.jobmedley,
            charCounts: {
              appealTitle: countChars(fmJobmedley.appealTitle),
              appealText: countChars(fmJobmedley.appealText),
              jobDescription: countChars(fmJobmedley.jobDescription),
            },
          } } : {}),
          ...(fmHellowork ? { hellowork: {
            // 企業基本情報
            corporateNumber: hwInput.corporateNumber || "未入力",
            companyName: common.companyName,
            companyNameKana: common.companyNameKana,
            headOfficeAddress: hwInput.headOfficeAddress,
            representativeName: hwInput.representativeName,
            establishmentYear: hwInput.establishmentYear,
            capital: hwInput.capital,
            totalEmployees: hwInput.totalEmployees?.toString(),
            // 事業所情報
            companyAddress: `${common.prefecture}${common.city}${common.address || ""}`,
            workLocation: `${common.prefecture}${common.city}${common.address || ""}`,
            employmentInsuranceNumber: hwInput.employmentInsuranceNumber || "未入力",
            businessContent: hwInput.businessContent || "未入力",
            companyFeatures: hwInput.companyFeatures,
            smokingPolicy: smokingPolicyText,
            jobCategoryType: hwInput.jobCategoryType || "一般",
            // 仕事の内容
            jobTitle: fmHellowork.jobTitle,
            jobDescription: fmHellowork.jobDescription,
            employmentType: common.employmentType,
            employmentPeriod: fmHellowork.employmentPeriod,
            contractRenewal: fmHellowork.contractRenewal,
            workplaceChange: fmHellowork.workplaceChange,
            jobContentChange: fmHellowork.jobContentChange,
            transferPossibility: fmHellowork.transferPossibility,
            carCommute: hwInput.carCommute,
            hasParking: hwInput.hasParking ? "あり" : undefined,
            // 賃金
            wageType: common.salaryType,
            wageAmount: fmHellowork.wageAmount,
            fixedOvertimePay: fixedOvertimeText,
            allowances: fmHellowork.allowances,
            commutingAllowance: fmHellowork.commutingAllowance,
            bonus: fmHellowork.bonus,
            raise: fmHellowork.raise,
            salaryClosingDay: fmHellowork.salaryClosingDay,
            salaryPayDay: fmHellowork.salaryPayDay,
            // 労働時間
            workingHours: fmHellowork.workingHours,
            overtime: fmHellowork.overtime,
            overtimeAvg: hwInput.overtimeAvg?.toString(),
            breakTime: fmHellowork.breakTime,
            holidays: fmHellowork.holidays,
            annualHolidays: fmHellowork.annualHolidays,
            annualLeave: fmHellowork.annualLeave,
            specialClause36: hwInput.specialClause36,
            // 保険・年金・定年
            insurance: fmHellowork.insurance,
            pension: fmHellowork.pension,
            trialPeriod: fmHellowork.trialPeriod,
            retirementAge: fmHellowork.retirementAge,
            retirementBenefit: fmHellowork.retirementBenefit,
            reEmployment: hwInput.reEmployment ? "あり" : undefined,
            childcareLeaveActual: hwInput.childcareLeaveActual,
            careLeaveActual: hwInput.careLeaveActual,
            nursingLeaveActual: hwInput.nursingLeaveActual,
            specialNotes: fmHellowork.specialNotes,
            // 応募条件
            requirements: fmHellowork.requirements,
            requiredLicenses: fmHellowork.requiredLicenses,
            pcSkills: hwInput.pcSkills,
            educationLevel: hwInput.educationLevel,
            ageRestriction: hwInput.ageRestriction || "不問",
            // 選考
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}人` : "１人",
            selectionMethod: fmHellowork.selectionMethod,
            selectionResultDays: fmHellowork.selectionResultDays,
            applicationDocuments: fmHellowork.applicationDocuments,
            applicationMethodHw: fmHellowork.applicationMethodHw,
            hiringManagerName: hm.name || "未入力",
            hiringManagerPosition: hm.position,
            hiringManagerContact: fmHellowork.hiringManagerContact,
            selectionNotification: "面接選考結果通知",
            // 公開範囲
            publishingScope: hwInput.publishingScope || "1.求人情報を公開する（事業所名等を含む）",
            remarks: fmHellowork.remarks,
            charCounts: {
              jobTitle: countChars(fmHellowork.jobTitle),
              jobDescription: countChars(fmHellowork.jobDescription),
              requirements: countChars(fmHellowork.requirements),
              remarks: countChars(fmHellowork.remarks),
            },
          } } : {}),
          thumbnailUrls: [
            ...platformThumbnails.indeed,
            ...platformThumbnails.airwork,
            ...platformThumbnails.jobmedley,
          ],
          platformThumbnails,
          visualStyle: thumbnailOutput.visualStyle,
          apiCostYen: getTrackedCostYen() ?? undefined,
          generatedAt: now(),
        };

        // 実行成功時のみ課金記録(失敗しても原稿生成は完了扱い)
        try {
          await recordUsage({
            org,
            userId: auth.user.id,
            kind: "team_a",
            jobId: usageJobId,
          });
          await settlePendingOverages(org);
        } catch (e) {
          console.error("[team-a] 課金記録に失敗:", e);
        }

        // ワークフロー完了
        sendEvent(controller, {
          type: "workflow_complete",
          agentId: "platform-formatter",
          message: `選択した${targetPlatforms.length}媒体の求人原稿が完成しました`,
          data: finalOutput,
          timestamp: now(),
        });
      } catch (error) {
        console.error("[team-a] Workflow error:", error);
        sendEvent(controller, {
          type: "workflow_error",
          agentId: "manager",
          message: error instanceof Error ? error.message : "ワークフロー実行中にエラーが発生しました",
          timestamp: now(),
        });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
