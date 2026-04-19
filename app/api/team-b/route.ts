import { NextRequest } from "next/server";
import { runTextImprovementAgent } from "@/lib/agents/team-b/text-improvement";
import { runDesignImprovementAgent } from "@/lib/agents/team-b/design-improvement";
import { runBudgetOptimizationAgent } from "@/lib/agents/team-b/budget-optimization";
import { TeamBInput, TeamBOutput, IndeedMetrics, ExistingPostingFields } from "@/types/team-b";
import { TeamBSSEEvent, TeamBAgentId } from "@/lib/agents/team-b/types";
import { ReferencePostingData } from "@/types/reference";
import { supabase } from "@/lib/supabase";
import { getFormattedMemories, saveMemories, updateEffectiveness } from "@/lib/agents/team-b/memory";
import { getFormattedKnowledge } from "@/lib/shared-knowledge";

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
        // DB から参考原稿を取得（職種・業種でスマートマッチング）
        let userReferences: ReferencePostingData[] = [];
        try {
          let query = supabase
            .from("ReferencePosting")
            .select("*")
            .order("createdAt", { ascending: false });

          if (input.jobType) query = query.ilike("jobType", `%${input.jobType}%`);
          if (input.industry) query = query.ilike("industry", `%${input.industry}%`);
          query = query.limit(5);

          const { data: refs } = await query;
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

        // クロスジョブメモリ
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

        // 共有ナレッジ
        let sharedKnowledgeText = "";
        try {
          const category = input.jobType || detectedIndustry || "";
          sharedKnowledgeText = await getFormattedKnowledge({
            category,
            platform: input.platform,
          });
          if (sharedKnowledgeText) {
            console.log(`[team-b] 共有ナレッジをロードしました`);
          }
        } catch (e) {
          console.warn("[team-b] 共有ナレッジの取得に失敗:", e);
        }

        // 前回のメトリクス（効果フィードバック用）
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

        // 統合エージェント + デザイン + 予算を並列実行
        startAgent("tb-text-improvement", "参考原稿・メトリクス・現行原稿を統合分析し、リライト案を生成します");
        startAgent("tb-design-improvement", "改善サムネイルの生成を開始します");
        if (isIndeed && hasMetrics) {
          startAgent("tb-budget-optimization", "予算最適化の分析を開始します");
        }

        const parallelTasks: [
          Promise<Awaited<ReturnType<typeof runTextImprovementAgent>>>,
          Promise<Awaited<ReturnType<typeof runDesignImprovementAgent>>>,
          Promise<Awaited<ReturnType<typeof runBudgetOptimizationAgent>> | null>,
        ] = [
          runTextImprovementAgent({
            platform: input.platform,
            existingPosting: input.existingPosting,
            metrics: hasMetrics ? input.metrics : undefined,
            previousMetrics,
            userReferences: userReferences.length > 0 ? userReferences : undefined,
            historyContext,
            crossJobMemory,
            sharedKnowledge: sharedKnowledgeText || undefined,
          }),
          runDesignImprovementAgent({
            platform: input.platform,
            existingPosting: input.existingPosting,
            improvedPosting: input.existingPosting,
            historyContext,
            visualStyle,
          }),
          isIndeed && hasMetrics && input.metrics
            ? runBudgetOptimizationAgent({
                metrics: input.metrics as IndeedMetrics,
                existingPosting: input.existingPosting,
              })
            : Promise.resolve(null),
        ];

        const [textResult, designResult, budgetResult] = await Promise.all(parallelTasks);

        completeAgent("tb-text-improvement", `分析・リライト完了（${textResult.improvements.length}箇所改善 / 課題${textResult.issues.length}件検出）`, {
          assessment: textResult.overallAssessment,
          metricsSummary: textResult.metricsSummary,
          issueCount: textResult.issues.length,
        });

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
        } else if (!hasMetrics) {
          completeAgent("tb-budget-optimization", "メトリクスなしのため予算分析スキップ");
        }

        // クロスジョブメモリに学習パターンを保存（非同期・エラー無視）
        try {
          await saveMemories({
            platform: input.platform,
            improvements: textResult.improvements,
            issues: textResult.issues,
            sourceJobId: input.jobId,
            industry: detectedIndustry || undefined,
            jobType: input.jobType,
          });

          if (previousMetrics && input.metrics) {
            const currentMetrics = input.metrics as Record<string, number>;
            const prevCTR = previousMetrics.ctr || 0;
            const currCTR = currentMetrics.ctr || 0;
            const improved = currCTR > prevCTR;
            const categories = textResult.issues.map((i) => i.category);
            if (categories.length > 0) {
              await updateEffectiveness(input.platform, categories, improved);
            }
          }
        } catch (e) {
          console.warn("[team-b] メモリ保存エラー（続行）:", e);
        }

        // 最終出力を組み立て（TeamBOutput 形状は従来互換）
        const finalOutput: TeamBOutput = {
          platform: input.platform,
          issuesSummary: textResult.issues,
          metricsAnalysis: textResult.metricsSummary,
          manuscriptAnalysis: textResult.overallAssessment,
          improvements: textResult.improvements,
          improvedPosting: textResult.improvedPosting as ExistingPostingFields,
          thumbnailUrls: designResult.thumbnailUrls,
          platformThumbnails,
          budgetRecommendation: budgetResult?.recommendation,
          generatedAt: now(),
        };

        sendEvent(controller, {
          type: "workflow_complete",
          agentId: "tb-text-improvement",
          message: "原稿改善が完了しました",
          data: finalOutput,
          timestamp: now(),
        });
      } catch (error) {
        console.error("[team-b] Workflow error:", error);
        sendEvent(controller, {
          type: "workflow_error",
          agentId: "tb-text-improvement",
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
