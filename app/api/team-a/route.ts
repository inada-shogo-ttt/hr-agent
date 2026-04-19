import { NextRequest } from "next/server";
import { runManagerAgent } from "@/lib/agents/manager";
import { runTrendResearchAgent } from "@/lib/agents/trend-research";
import { runTrendAnalysisAgent } from "@/lib/agents/trend-analysis";
import { runReferenceSelectionAgent } from "@/lib/agents/reference-selection";
import { runManuscriptWritingAgent } from "@/lib/agents/manuscript-writing";
import { runThumbnailGenerationAgent } from "@/lib/agents/thumbnail-generation";
import { runFactCheckAgent } from "@/lib/agents/fact-check";
import { JobPostingInput } from "@/types/job-posting";
import { AllPlatformPostings } from "@/types/platform";
import { SSEEvent, AgentId } from "@/lib/agents/types";
import { ReferencePostingData } from "@/types/reference";
import { supabase } from "@/lib/supabase";
import { getFormattedKnowledge } from "@/lib/shared-knowledge";

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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const jobPostingInput = body as JobPostingInput;

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
        // DB から参考原稿を取得（同業種・同職種でフィルタ）
        let userReferences: ReferencePostingData[] = [];
        try {
          const industry = jobPostingInput.common.industry;
          const jobType = jobPostingInput.common.jobTitle;

          // 優先度: 同職種&同業種 → 同職種 → 同業種 → フォールバック
          let query = supabase
            .from("ReferencePosting")
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
              .from("ReferencePosting")
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

        // Step 2: Trend Research Agent
        startAgent("trend-research", "求人トレンドのWeb調査を開始します");
        const trendResearch = await runTrendResearchAgent({
          industry: jobPostingInput.common.industry,
          jobCategory: jobPostingInput.common.jobTitle,
          prefecture: jobPostingInput.common.prefecture,
          employmentType: jobPostingInput.common.employmentType,
        });
        completeAgent("trend-research", "トレンド調査完了", {
          resultCount: trendResearch.results.length,
          summary: trendResearch.summary,
        });

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

        // Step 4: Reference Selection Agent
        startAgent("reference-selection", "参考原稿の選定を開始します");
        const referenceSelection = await runReferenceSelectionAgent({
          trendAnalysis,
          jobPostingInput,
          userReferences: userReferences.length > 0 ? userReferences : undefined,
          sharedKnowledge: sharedKnowledgeText || undefined,
        });
        completeAgent("reference-selection", "参考原稿選定完了", {
          referencesCount: referenceSelection.selectedReferences.length,
        });

        // Step 5 & 6: Manuscript Writing + Thumbnail Generation (並列)
        startAgent("manuscript-writing", "4媒体の求人原稿を執筆開始します");
        startAgent("thumbnail-generation", "サムネイル生成を開始します");

        const socialInsuranceText = Array.isArray(jobPostingInput.common.socialInsurance)
          ? jobPostingInput.common.socialInsurance.join(", ")
          : String(jobPostingInput.common.socialInsurance || "");

        const [manuscriptResult, thumbnailOutput] = await Promise.all([
          runManuscriptWritingAgent({
            jobPostingInput,
            managerOutput,
            trendAnalysis,
            referenceSelection,
            userReferences: userReferences.length > 0 ? userReferences : undefined,
            sharedKnowledge: sharedKnowledgeText || undefined,
          }).catch((err) => {
            console.error("[team-a] manuscript-writing failed:", err);
            errorAgent("manuscript-writing", err instanceof Error ? err.message : "原稿生成エラー");
            throw err;
          }),
          runThumbnailGenerationAgent({
            jobPostingInput,
            manuscript: {
              indeed: {
                jobTitle: jobPostingInput.common.jobTitle,
                catchphrase: "生成中...",
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
                catchphrase: "生成中...",
                jobDescription: jobPostingInput.common.jobDescription,
                requirements: jobPostingInput.common.requirements,
                selectionProcess: "",
              },
              jobmedley: {
                appealTitle: "生成中...",
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
        completeAgent("manuscript-writing", "原稿執筆完了（4媒体）");
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
        });
        completeAgent("fact-check", factCheckOutput.summary, {
          issueCount: factCheckOutput.issues.length,
          isClean: factCheckOutput.isClean,
        });

        // Step 8: Platform Formatter (final assembly)
        const { common } = jobPostingInput;
        const finalManuscript = factCheckOutput.correctedManuscript;

        const countChars = (text: string) => text.length;

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

        const finalOutput: AllPlatformPostings = {
          indeed: {
            companyName: common.companyName,
            postalCode: common.postalCode,
            jobTitle: finalManuscript.indeed.jobTitle,
            catchphrase: finalManuscript.indeed.catchphrase,
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}名` : "若干名",
            location: `${common.prefecture}${common.city}${common.address || ""}`,
            employmentType: common.employmentType,
            salary: `${common.salaryType} ${Number(common.salaryMin || 0).toLocaleString()}円${common.salaryMax ? `〜${Number(common.salaryMax).toLocaleString()}円` : ""}`,
            salaryDisplayType: common.salaryDisplayType,
            workingHours: common.workingHours,
            socialInsurance: finalManuscript.indeed.socialInsurance,
            probationPeriod: finalManuscript.indeed.probationPeriod,
            fixedOvertimePay: fixedOvertimeText,
            monthlyWorkingHours: common.monthlyWorkingHours ? `月平均${common.monthlyWorkingHours}時間` : undefined,
            smokingPolicy: common.smokingPolicy,
            hiringManagerName: hm.name,
            contactPhone: hm.phone,
            contactEmail: hm.email,
            applicationMethod: idInput.applicationMethod,
            applicationUrl: idInput.applicationUrl,
            screeningQuestions: idInput.screeningQuestions,
            jobDescription: finalManuscript.indeed.jobDescription,
            appealPoints: finalManuscript.indeed.appealPoints,
            requirements: finalManuscript.indeed.requirements,
            holidays: finalManuscript.indeed.holidays,
            access: finalManuscript.indeed.access,
            benefits: finalManuscript.indeed.benefits,
            featureTags: idInput.featureTags,
            thumbnailUrls: platformThumbnails.indeed,
            recruitmentBudget: idInput.recruitmentBudget?.toString(),
            charCounts: {
              jobTitle: countChars(finalManuscript.indeed.jobTitle),
              catchphrase: countChars(finalManuscript.indeed.catchphrase),
              jobDescription: countChars(finalManuscript.indeed.jobDescription),
              appealPoints: countChars(finalManuscript.indeed.appealPoints),
              requirements: countChars(finalManuscript.indeed.requirements),
            },
          },
          airwork: {
            jobTitle: finalManuscript.airwork.jobTitle,
            jobDescription: finalManuscript.airwork.jobDescription,
            location: `${common.prefecture}${common.city}`,
            requirements: finalManuscript.airwork.requirements,
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}名` : "若干名",
            salary: `${common.salaryType} ${Number(common.salaryMin || 0).toLocaleString()}円${common.salaryMax ? `〜${Number(common.salaryMax).toLocaleString()}円` : ""}`,
            salaryDisplayType: common.salaryDisplayType,
            holidays: common.holidays,
            socialInsurance: Array.isArray(common.socialInsurance) ? common.socialInsurance.join(", ") : String(common.socialInsurance || ""),
            benefits: common.benefits,
            selectionProcess: finalManuscript.airwork.selectionProcess,
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
              jobTitle: countChars(finalManuscript.airwork.jobTitle),
              jobDescription: countChars(finalManuscript.airwork.jobDescription),
              requirements: countChars(finalManuscript.airwork.requirements),
            },
          },
          jobmedley: {
            appealTitle: finalManuscript.jobmedley.appealTitle,
            appealText: finalManuscript.jobmedley.appealText,
            jobDescription: finalManuscript.jobmedley.jobDescription,
            employmentTypeAndSalary: finalManuscript.jobmedley.employmentTypeAndSalary,
            benefits: common.benefits,
            trainingSystem: finalManuscript.jobmedley.trainingSystem,
            workingHours: finalManuscript.jobmedley.workingHours,
            holidays: common.holidays,
            requirements: finalManuscript.jobmedley.requirements,
            welcomeRequirements: finalManuscript.jobmedley.welcomeRequirements,
            access: finalManuscript.jobmedley.access,
            selectionProcess: finalManuscript.jobmedley.selectionProcess,
            facilityType: jmInput.facilityType,
            hiringManagerName: hm.name,
            contactPhone: hm.phone,
            contactEmail: hm.email,
            longTermHolidays: jmInput.longTermHolidays,
            staffVoice: jmInput.staffVoice,
            workplaceAtmosphere: jmInput.workplaceAtmosphere,
            thumbnailUrls: platformThumbnails.jobmedley,
            charCounts: {
              appealTitle: countChars(finalManuscript.jobmedley.appealTitle),
              appealText: countChars(finalManuscript.jobmedley.appealText),
              jobDescription: countChars(finalManuscript.jobmedley.jobDescription),
            },
          },
          hellowork: {
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
            jobTitle: finalManuscript.hellowork.jobTitle,
            jobDescription: finalManuscript.hellowork.jobDescription,
            employmentType: common.employmentType,
            employmentPeriod: finalManuscript.hellowork.employmentPeriod,
            contractRenewal: finalManuscript.hellowork.contractRenewal,
            workplaceChange: finalManuscript.hellowork.workplaceChange,
            jobContentChange: finalManuscript.hellowork.jobContentChange,
            transferPossibility: finalManuscript.hellowork.transferPossibility,
            carCommute: hwInput.carCommute,
            hasParking: hwInput.hasParking ? "あり" : undefined,
            // 賃金
            wageType: common.salaryType,
            wageAmount: finalManuscript.hellowork.wageAmount,
            fixedOvertimePay: fixedOvertimeText,
            allowances: finalManuscript.hellowork.allowances,
            commutingAllowance: finalManuscript.hellowork.commutingAllowance,
            bonus: finalManuscript.hellowork.bonus,
            raise: finalManuscript.hellowork.raise,
            salaryClosingDay: finalManuscript.hellowork.salaryClosingDay,
            salaryPayDay: finalManuscript.hellowork.salaryPayDay,
            // 労働時間
            workingHours: finalManuscript.hellowork.workingHours,
            overtime: finalManuscript.hellowork.overtime,
            overtimeAvg: hwInput.overtimeAvg?.toString(),
            breakTime: finalManuscript.hellowork.breakTime,
            holidays: finalManuscript.hellowork.holidays,
            annualHolidays: finalManuscript.hellowork.annualHolidays,
            annualLeave: finalManuscript.hellowork.annualLeave,
            specialClause36: hwInput.specialClause36,
            // 保険・年金・定年
            insurance: finalManuscript.hellowork.insurance,
            pension: finalManuscript.hellowork.pension,
            trialPeriod: finalManuscript.hellowork.trialPeriod,
            retirementAge: finalManuscript.hellowork.retirementAge,
            retirementBenefit: finalManuscript.hellowork.retirementBenefit,
            reEmployment: hwInput.reEmployment ? "あり" : undefined,
            childcareLeaveActual: hwInput.childcareLeaveActual,
            careLeaveActual: hwInput.careLeaveActual,
            nursingLeaveActual: hwInput.nursingLeaveActual,
            specialNotes: finalManuscript.hellowork.specialNotes,
            // 応募条件
            requirements: finalManuscript.hellowork.requirements,
            requiredLicenses: finalManuscript.hellowork.requiredLicenses,
            pcSkills: hwInput.pcSkills,
            educationLevel: hwInput.educationLevel,
            ageRestriction: hwInput.ageRestriction || "不問",
            // 選考
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}人` : "１人",
            selectionMethod: finalManuscript.hellowork.selectionMethod,
            selectionResultDays: finalManuscript.hellowork.selectionResultDays,
            applicationDocuments: finalManuscript.hellowork.applicationDocuments,
            applicationMethodHw: finalManuscript.hellowork.applicationMethodHw,
            hiringManagerName: hm.name || "未入力",
            hiringManagerPosition: hm.position,
            hiringManagerContact: finalManuscript.hellowork.hiringManagerContact,
            selectionNotification: "面接選考結果通知",
            // 公開範囲
            publishingScope: hwInput.publishingScope || "1.求人情報を公開する（事業所名等を含む）",
            remarks: finalManuscript.hellowork.remarks,
            charCounts: {
              jobTitle: countChars(finalManuscript.hellowork.jobTitle),
              jobDescription: countChars(finalManuscript.hellowork.jobDescription),
              requirements: countChars(finalManuscript.hellowork.requirements),
              remarks: countChars(finalManuscript.hellowork.remarks),
            },
          },
          thumbnailUrls: [
            ...platformThumbnails.indeed,
            ...platformThumbnails.airwork,
            ...platformThumbnails.jobmedley,
          ],
          platformThumbnails,
          visualStyle: thumbnailOutput.visualStyle,
          generatedAt: now(),
        };

        // ワークフロー完了
        sendEvent(controller, {
          type: "workflow_complete",
          agentId: "platform-formatter",
          message: "全媒体の求人原稿が完成しました",
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
