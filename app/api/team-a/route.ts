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
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300; // 5分

function createSSEMessage(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
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
          const refs = await prisma.referencePosting.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
          });
          userReferences = refs.map((r) => ({
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
                employmentPeriod: "",
                contractRenewal: "",
                wageAmount: "",
                allowances: "",
                commutingAllowance: "",
                bonus: "",
                raise: "",
                workingHours: jobPostingInput.common.workingHours || "",
                overtime: "",
                breakTime: "",
                holidays: jobPostingInput.common.holidays || "",
                annualLeave: "",
                insurance: "",
                pension: "",
                trialPeriod: "",
                specialNotes: "",
                requirements: jobPostingInput.common.requirements,
                requiredLicenses: "",
                selectionMethod: "",
                applicationDocuments: "",
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

        const finalOutput: AllPlatformPostings = {
          indeed: {
            companyName: common.companyName,
            jobTitle: finalManuscript.indeed.jobTitle,
            catchphrase: finalManuscript.indeed.catchphrase,
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}名` : "若干名",
            location: `${common.prefecture}${common.city}${common.address || ""}`,
            employmentType: common.employmentType,
            salary: `${common.salaryType} ${Number(common.salaryMin || 0).toLocaleString()}円${common.salaryMax ? `〜${Number(common.salaryMax).toLocaleString()}円` : ""}`,
            workingHours: common.workingHours,
            socialInsurance: finalManuscript.indeed.socialInsurance,
            probationPeriod: finalManuscript.indeed.probationPeriod,
            jobDescription: finalManuscript.indeed.jobDescription,
            appealPoints: finalManuscript.indeed.appealPoints,
            requirements: finalManuscript.indeed.requirements,
            holidays: finalManuscript.indeed.holidays,
            access: finalManuscript.indeed.access,
            benefits: finalManuscript.indeed.benefits,
            thumbnailUrls: platformThumbnails.indeed,
            recruitmentBudget: jobPostingInput.indeed?.recruitmentBudget?.toString(),
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
            catchphrase: finalManuscript.airwork.catchphrase,
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}名` : "若干名",
            salary: `${common.salaryType} ${Number(common.salaryMin || 0).toLocaleString()}円${common.salaryMax ? `〜${Number(common.salaryMax).toLocaleString()}円` : ""}`,
            workStyle: jobPostingInput.airwork?.workStyle || "出社必須",
            holidays: common.holidays,
            socialInsurance: Array.isArray(common.socialInsurance) ? common.socialInsurance.join(", ") : String(common.socialInsurance || ""),
            benefits: common.benefits,
            selectionProcess: finalManuscript.airwork.selectionProcess,
            thumbnailUrls: platformThumbnails.airwork,
            charCounts: {
              jobTitle: countChars(finalManuscript.airwork.jobTitle),
              catchphrase: countChars(finalManuscript.airwork.catchphrase),
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
            thumbnailUrls: platformThumbnails.jobmedley,
            charCounts: {
              appealTitle: countChars(finalManuscript.jobmedley.appealTitle),
              appealText: countChars(finalManuscript.jobmedley.appealText),
              jobDescription: countChars(finalManuscript.jobmedley.jobDescription),
            },
          },
          hellowork: {
            companyName: common.companyName,
            companyAddress: `${common.prefecture}${common.city}${common.address || ""}`,
            workLocation: `${common.prefecture}${common.city}${common.address || ""}`,
            smokingPolicy: "受動喫煙対策あり",
            jobTitle: finalManuscript.hellowork.jobTitle,
            jobDescription: finalManuscript.hellowork.jobDescription,
            employmentType: common.employmentType,
            employmentPeriod: finalManuscript.hellowork.employmentPeriod,
            contractRenewal: finalManuscript.hellowork.contractRenewal,
            wageType: common.salaryType,
            wageAmount: finalManuscript.hellowork.wageAmount,
            allowances: finalManuscript.hellowork.allowances,
            commutingAllowance: finalManuscript.hellowork.commutingAllowance,
            bonus: finalManuscript.hellowork.bonus,
            raise: finalManuscript.hellowork.raise,
            workingHours: finalManuscript.hellowork.workingHours,
            overtime: finalManuscript.hellowork.overtime,
            breakTime: finalManuscript.hellowork.breakTime,
            holidays: finalManuscript.hellowork.holidays,
            annualLeave: finalManuscript.hellowork.annualLeave,
            insurance: finalManuscript.hellowork.insurance,
            pension: finalManuscript.hellowork.pension,
            trialPeriod: finalManuscript.hellowork.trialPeriod,
            specialNotes: finalManuscript.hellowork.specialNotes,
            requirements: finalManuscript.hellowork.requirements,
            requiredLicenses: finalManuscript.hellowork.requiredLicenses,
            ageRestriction: jobPostingInput.hellowork?.ageRestriction || "不問",
            numberOfHires: common.numberOfHires ? `${common.numberOfHires}人` : "１人",
            selectionMethod: finalManuscript.hellowork.selectionMethod,
            applicationDocuments: finalManuscript.hellowork.applicationDocuments,
            selectionNotification: "面接選考結果通知",
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
