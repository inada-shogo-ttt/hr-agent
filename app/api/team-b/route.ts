import { NextRequest } from "next/server";
import { runTeamBManagerAgent } from "@/lib/agents/team-b/manager";
import { runMetricsAnalysisAgent } from "@/lib/agents/team-b/metrics-analysis";
import { runManuscriptAnalysisAgent } from "@/lib/agents/team-b/manuscript-analysis";
import { runTextImprovementAgent } from "@/lib/agents/team-b/text-improvement";
import { runDesignImprovementAgent } from "@/lib/agents/team-b/design-improvement";
import { runBudgetOptimizationAgent } from "@/lib/agents/team-b/budget-optimization";
import { TeamBInput, TeamBOutput, IndeedMetrics } from "@/types/team-b";
import { TeamBSSEEvent, TeamBAgentId } from "@/lib/agents/team-b/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function createSSEMessage(event: TeamBSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  event: TeamBSSEEvent
): void {
  controller.enqueue(new TextEncoder().encode(createSSEMessage(event)));
}

interface TeamBRequestBody extends TeamBInput {
  historyContext?: unknown[];
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = body as TeamBRequestBody;
  const historyContext = input.historyContext;

  const stream = new ReadableStream({
    async start(controller) {
      const now = () => new Date().toISOString();

      const startAgent = (agentId: TeamBAgentId, message: string) => {
        sendEvent(controller, { type: "agent_start", agentId, message, timestamp: now() });
      };

      const completeAgent = (agentId: TeamBAgentId, message: string, data?: unknown) => {
        sendEvent(controller, { type: "agent_complete", agentId, message, data, timestamp: now() });
      };

      try {
        const isIndeed = input.platform === "indeed";
        const isJobMedley = input.platform === "jobmedley";
        const hasMetrics = !isJobMedley && !!input.metrics;

        // Step 1: Manager Agent
        startAgent("tb-manager", "既存原稿の確認・媒体特定を開始します");
        const managerOutput = await runTeamBManagerAgent({
          platform: input.platform,
          existingPosting: input.existingPosting,
          hasMetrics,
        });
        completeAgent("tb-manager", "要件確認完了", {
          summary: managerOutput.summary,
          quality: managerOutput.postingQuality,
        });

        // Step 2: 数値分析（JobMedley以外 & メトリクスあり）
        let metricsAnalysisResult: Awaited<ReturnType<typeof runMetricsAnalysisAgent>> | undefined;
        if (hasMetrics && input.metrics) {
          startAgent("tb-metrics-analysis", "掲載数値の分析を開始します");
          metricsAnalysisResult = await runMetricsAnalysisAgent({
            platform: input.platform,
            metrics: input.metrics,
            existingPosting: input.existingPosting,
            historyContext: historyContext,
          });
          completeAgent("tb-metrics-analysis", "数値分析完了", {
            summary: metricsAnalysisResult.summary,
            issueCount: metricsAnalysisResult.issues.length,
          });
        } else {
          completeAgent("tb-metrics-analysis", isJobMedley ? "JobMedleyは数値分析スキップ" : "数値データなし・スキップ");
        }

        // Step 3: 原稿分析
        startAgent("tb-manuscript-analysis", "原稿の定性分析を開始します");
        const manuscriptAnalysis = await runManuscriptAnalysisAgent({
          platform: input.platform,
          existingPosting: input.existingPosting,
          metricsAnalysis: metricsAnalysisResult?.summary,
          metricsIssues: metricsAnalysisResult?.issues,
          historyContext: historyContext,
        });
        completeAgent("tb-manuscript-analysis", "原稿分析完了", {
          assessment: manuscriptAnalysis.overallAssessment,
          issueCount: manuscriptAnalysis.issues.length,
        });

        // Step 4, 5, 6: テキスト改善 + デザイン改善 + 予算最適化（並列）
        startAgent("tb-text-improvement", "原稿のリライトを開始します");
        startAgent("tb-design-improvement", "改善サムネイルの生成を開始します");
        if (isIndeed && metricsAnalysisResult) {
          startAgent("tb-budget-optimization", "予算最適化の分析を開始します");
        }

        const allIssues = [
          ...(metricsAnalysisResult?.issues || []),
          ...manuscriptAnalysis.issues,
        ];

        const parallelTasks: [
          Promise<Awaited<ReturnType<typeof runTextImprovementAgent>>>,
          Promise<Awaited<ReturnType<typeof runDesignImprovementAgent>>>,
          Promise<Awaited<ReturnType<typeof runBudgetOptimizationAgent>> | null>,
        ] = [
          runTextImprovementAgent({
            platform: input.platform,
            existingPosting: input.existingPosting,
            manuscriptAnalysis,
            metricsIssues: metricsAnalysisResult?.issues,
          }),
          runDesignImprovementAgent({
            platform: input.platform,
            existingPosting: input.existingPosting,
            improvedPosting: input.existingPosting,
            historyContext: historyContext,
          }),
          isIndeed && metricsAnalysisResult && input.metrics
            ? runBudgetOptimizationAgent({
                metrics: input.metrics as IndeedMetrics,
                existingPosting: input.existingPosting,
                metricsAnalysis: metricsAnalysisResult,
              })
            : Promise.resolve(null),
        ];

        const [textResult, designResult, budgetResult] = await Promise.all(parallelTasks);

        completeAgent("tb-text-improvement", `リライト完了（${textResult.improvements.length}箇所改善）`);
        completeAgent("tb-design-improvement", designResult.message, {
          thumbnailCount: designResult.thumbnailUrls.length,
          status: designResult.generationStatus,
        });
        if (isIndeed && budgetResult) {
          completeAgent("tb-budget-optimization", "予算最適化分析完了", {
            recommendedRange: `${budgetResult.recommendation.recommendedMin}〜${budgetResult.recommendation.recommendedMax}円/日`,
          });
        } else if (!isIndeed) {
          completeAgent("tb-budget-optimization", "Indeed以外のため予算分析スキップ");
        }

        // 最終出力を組み立て
        const finalOutput: TeamBOutput = {
          platform: input.platform,
          issuesSummary: allIssues,
          metricsAnalysis: metricsAnalysisResult?.summary,
          manuscriptAnalysis: manuscriptAnalysis.overallAssessment,
          improvements: textResult.improvements,
          improvedPosting: textResult.improvedPosting,
          thumbnailUrls: designResult.thumbnailUrls,
          budgetRecommendation: budgetResult?.recommendation,
          generatedAt: now(),
        };

        sendEvent(controller, {
          type: "workflow_complete",
          agentId: "tb-manager",
          message: "原稿改善が完了しました",
          data: finalOutput,
          timestamp: now(),
        });
      } catch (error) {
        console.error("[team-b] Workflow error:", error);
        sendEvent(controller, {
          type: "workflow_error",
          agentId: "tb-manager",
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
