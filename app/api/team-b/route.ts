import { NextRequest } from "next/server";
import { runTeamBManagerAgent } from "@/lib/agents/team-b/manager";
import { runMetricsAnalysisAgent } from "@/lib/agents/team-b/metrics-analysis";
import { runManuscriptAnalysisAgent } from "@/lib/agents/team-b/manuscript-analysis";
import { runTextImprovementAgent } from "@/lib/agents/team-b/text-improvement";
import { runDesignImprovementAgent } from "@/lib/agents/team-b/design-improvement";
import { runBudgetOptimizationAgent } from "@/lib/agents/team-b/budget-optimization";
import { TeamBInput, TeamBOutput, IndeedMetrics } from "@/types/team-b";
import { TeamBSSEEvent, TeamBAgentId } from "@/lib/agents/team-b/types";
import { ReferencePostingData } from "@/types/reference";
import { supabase } from "@/lib/supabase";
import { getFormattedMemories, saveMemories, updateEffectiveness } from "@/lib/agents/team-b/memory";

export const runtime = "nodejs";
export const maxDuration = 300;

function createSSEMessage(event: TeamBSSEEvent): string {
  const json = JSON.stringify(event);
  const lines = json.split("\n");
  return lines.map((line) => `data: ${line}`).join("\n") + "\n\n";
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  event: TeamBSSEEvent
): void {
  controller.enqueue(new TextEncoder().encode(createSSEMessage(event)));
}

interface TeamBRequestBody extends TeamBInput {
  jobId?: string;
  industry?: string;
  jobType?: string;
  historyContext?: unknown[];
  visualStyle?: {
    uniformDescription?: string;
    colorPalette?: string;
    sceneDescription?: string;
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const input = body as TeamBRequestBody;
  const historyContext = input.historyContext;

  // historyContext から Team A の visualStyle を取得
  let visualStyle = input.visualStyle;
  if (!visualStyle && historyContext && historyContext.length > 0) {
    for (const ctx of historyContext) {
      const ctxObj = ctx as Record<string, unknown>;
      const outputData = ctxObj.outputData as Record<string, unknown> | undefined;
      if (outputData?.visualStyle) {
        visualStyle = outputData.visualStyle as unknown as typeof visualStyle;
        break;
      }
    }
  }

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

      const startAgent = (agentId: TeamBAgentId, message: string) => {
        sendEvent(controller, { type: "agent_start", agentId, message, timestamp: now() });
      };

      const completeAgent = (agentId: TeamBAgentId, message: string, data?: unknown) => {
        sendEvent(controller, { type: "agent_complete", agentId, message, data, timestamp: now() });
      };

      try {
        // DB から参考原稿を取得
        let userReferences: ReferencePostingData[] = [];
        try {
          const { data: refs } = await supabase
            .from("ReferencePosting")
            .select("*")
            .order("createdAt", { ascending: false })
            .limit(5);
          if (!refs) throw new Error("参考原稿の取得に失敗");
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
            console.log(`[team-b] ${userReferences.length}件の参考原稿をロードしました`);
          }
        } catch (e) {
          console.warn("[team-b] 参考原稿の取得に失敗:", e);
        }

        // historyContext から業界情報を自動抽出
        let detectedIndustry = input.industry;
        if (!detectedIndustry && historyContext && historyContext.length > 0) {
          for (const ctx of historyContext) {
            const ctxObj = ctx as Record<string, unknown>;
            const inputData = ctxObj.inputData as Record<string, unknown> | undefined;
            const common = inputData?.common as Record<string, unknown> | undefined;
            if (common?.industry) {
              detectedIndustry = common.industry as string;
              break;
            }
          }
        }

        // クロスジョブメモリを取得（deep-agents-memory: StoreBackend相当）
        let crossJobMemory = "";
        try {
          crossJobMemory = await getFormattedMemories({
            platform: input.platform,
            industry: detectedIndustry || undefined,
            limit: 15,
          });
          if (crossJobMemory && crossJobMemory !== "なし（学習データ未蓄積）") {
            console.log(`[team-b] クロスジョブメモリをロードしました`);
          }
        } catch (e) {
          console.warn("[team-b] クロスジョブメモリの取得に失敗:", e);
        }

        // 前回のメトリクスを取得（効果フィードバック用）
        let previousMetrics: Record<string, number> | null = null;
        if (historyContext && historyContext.length > 0) {
          const prevTeamB = [...historyContext]
            .reverse()
            .find((h: any) => h.type === "team-b" && h.metrics);
          if (prevTeamB) {
            previousMetrics = (prevTeamB as any).metrics;
          }
        }

        const isIndeed = input.platform === "indeed";
        const isJobMedley = input.platform === "jobmedley";
        const isHelloWork = input.platform === "hellowork";
        const hasMetrics = !isJobMedley && !isHelloWork && !!input.metrics;

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
            crossJobMemory,
          });
          completeAgent("tb-metrics-analysis", "数値分析完了", {
            summary: metricsAnalysisResult.summary,
            issueCount: metricsAnalysisResult.issues.length,
          });
        } else {
          completeAgent("tb-metrics-analysis", isJobMedley ? "JobMedleyは数値分析スキップ" : isHelloWork ? "ハローワークは数値分析スキップ" : "数値データなし・スキップ");
        }

        // Step 3: 原稿分析
        startAgent("tb-manuscript-analysis", "原稿の定性分析を開始します");
        const manuscriptAnalysis = await runManuscriptAnalysisAgent({
          platform: input.platform,
          existingPosting: input.existingPosting,
          metricsAnalysis: metricsAnalysisResult?.summary,
          metricsIssues: metricsAnalysisResult?.issues,
          historyContext: historyContext,
          crossJobMemory,
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
            userReferences: userReferences.length > 0 ? userReferences : undefined,
            crossJobMemory,
          }),
          runDesignImprovementAgent({
            platform: input.platform,
            existingPosting: input.existingPosting,
            improvedPosting: input.existingPosting,
            historyContext: historyContext,
            visualStyle,
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
        const platformThumbnails = designResult.platformThumbnails;
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

        // クロスジョブメモリに学習パターンを保存（非同期・エラー無視）
        try {
          await saveMemories({
            platform: input.platform,
            improvements: textResult.improvements,
            issues: allIssues,
            sourceJobId: input.jobId,
            industry: detectedIndustry || undefined,
            jobType: input.jobType,
          });

          // 前回メトリクスがある場合、効果フィードバックを実行
          if (previousMetrics && input.metrics) {
            const currentMetrics = input.metrics as Record<string, number>;
            const prevCTR = previousMetrics.ctr || 0;
            const currCTR = currentMetrics.ctr || 0;
            const improved = currCTR > prevCTR;
            const categories = allIssues.map((i) => i.category);
            if (categories.length > 0) {
              await updateEffectiveness(input.platform, categories, improved);
            }
          }
        } catch (e) {
          console.warn("[team-b] メモリ保存エラー（続行）:", e);
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
          platformThumbnails,
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
