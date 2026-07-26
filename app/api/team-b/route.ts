import { NextRequest, after } from "next/server";
import { runTextImprovementAgent } from "@/lib/agents/team-b/text-improvement";
import { runDesignImprovementAgent } from "@/lib/agents/team-b/design-improvement";
import { runBudgetOptimizationAgent } from "@/lib/agents/team-b/budget-optimization";
import { TeamBInput, TeamBOutput, IndeedMetrics, ExistingPostingFields } from "@/types/team-b";
import { TeamBSSEEvent, TeamBAgentId, TeamBWorkflowCompleteData } from "@/lib/agents/team-b/types";
import { ReferencePostingData } from "@/types/reference";
import { supabase } from "@/lib/supabase";
import { getOwnedJob } from "@/lib/org-scope";
import { applyTeamBResultToManuscript } from "@/lib/job-records";
import { uploadThumbnailImages } from "@/lib/thumbnail-storage";
import {
  createWorkflowRun,
  updateWorkflowRun,
  touchWorkflowRun,
  WorkflowAgentStatuses,
} from "@/lib/workflow-run";
import { getFormattedMemories, saveMemories, updateEffectiveness } from "@/lib/agents/team-b/memory";
import { getFormattedKnowledge } from "@/lib/shared-knowledge";
import { getPlatformGuidelines } from "@/lib/platform-guidelines";
import { startCostTracking, getTrackedCostYen } from "@/lib/api-cost";
import { requireAuth } from "@/lib/auth-guard";
import { getOrganization, canRunAgents, recordUsage } from "@/lib/billing/usage";
import { settlePendingOverages } from "@/lib/billing/overage";

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
  try {
    controller.enqueue(new TextEncoder().encode(createSSEMessage(event)));
  } catch {
    // クライアント切断後は送信できない。ワークフローは継続し、結果は WorkflowRun に永続化する
  }
}

interface TeamBRequestBody extends TeamBInput {
  jobId?: string;
  runId?: string;
  industry?: string;
  jobType?: string;
  historyContext?: unknown[];
  visualStyle?: {
    uniformDescription?: string;
    colorPalette?: string;
    sceneDescription?: string;
  };
}

function sseErrorResponse(message: string, code: string): Response {
  const event: TeamBSSEEvent = {
    type: "workflow_error",
    agentId: "tb-text-improvement",
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

  const runId = typeof input.runId === "string" ? input.runId : crypto.randomUUID();

  // クライアントが切断してもワークフロー完了(結果の永続化)まで関数を生存させる
  let resolveWorkflowDone!: () => void;
  const workflowDone = new Promise<void>((resolve) => {
    resolveWorkflowDone = resolve;
  });
  after(workflowDone);

  const stream = new ReadableStream({
    async start(controller) {
      const now = () => new Date().toISOString();

      // 実行状態を永続化(接続断後の復旧用)。jobId が無い場合は追跡しない
      const trackRun = !!input.jobId;
      const agentStatuses: WorkflowAgentStatuses = {};
      const persistStatuses = () => {
        if (trackRun) void updateWorkflowRun(runId, { agentStatuses });
      };
      if (input.jobId) {
        await createWorkflowRun({
          id: runId,
          jobId: input.jobId,
          orgId: auth.user.orgId,
          userId: auth.user.id,
          kind: "team-b",
        });
      }

      // Vercelプロキシの接続切断を防ぐため、15秒ごとにハートビートを送信。
      // あわせて30秒ごとに WorkflowRun.updatedAt を更新(クライアントの生存判定用)
      let heartbeatCount = 0;
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          // ストリームが既に閉じている場合は無視
        }
        heartbeatCount++;
        if (trackRun && heartbeatCount % 2 === 0) void touchWorkflowRun(runId);
      }, 15000);

      const startAgent = (agentId: TeamBAgentId, message: string) => {
        agentStatuses[agentId] = { status: "running", message };
        persistStatuses();
        sendEvent(controller, { type: "agent_start", agentId, message, timestamp: now() });
      };

      const completeAgent = (agentId: TeamBAgentId, message: string, data?: unknown) => {
        agentStatuses[agentId] = { status: "completed", message };
        persistStatuses();
        sendEvent(controller, { type: "agent_complete", agentId, message, data, timestamp: now() });
      };

      try {
        // API 利用実費の集計を開始(このリクエスト内の Claude / 画像生成呼び出しが対象)
        startCostTracking();

        // 媒体別ガイドライン（システム設定）をロード。DB未保存・取得失敗時はコード内デフォルト
        const guidelines = await getPlatformGuidelines([input.platform]);

        // DB からシステム参考原稿を取得（職種・業種でスマートマッチング）
        let userReferences: ReferencePostingData[] = [];
        try {
          let query = supabase
            .from("SystemReferencePosting")
            .select("*")
            .order("createdAt", { ascending: false });

          if (input.jobType) query = query.ilike("jobType", `%${input.jobType}%`);
          if (input.industry) query = query.ilike("industry", `%${input.industry}%`);
          query = query.limit(5);

          const { data: refs } = await query;
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
            orgId: auth.user.orgId,
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
        // サムネイル再生成は任意(未指定は true = 従来挙動)
        const generateThumbnails = input.generateThumbnails !== false;

        // 統合エージェント + デザイン + 予算を並列実行
        startAgent("tb-text-improvement", "参考原稿・メトリクス・現行原稿を統合分析し、リライト案を生成します");
        startAgent(
          "tb-design-improvement",
          generateThumbnails
            ? "改善サムネイルの生成を開始します"
            : "サムネイル再生成はオフのためスキップします"
        );
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
            guideline: guidelines[input.platform],
          }),
          generateThumbnails
            ? runDesignImprovementAgent({
                platform: input.platform,
                existingPosting: input.existingPosting,
                improvedPosting: input.existingPosting,
                historyContext,
                visualStyle,
                direction: input.thumbnailDirection,
              })
            : Promise.resolve({
                platformThumbnails: { indeed: [], airwork: [], jobmedley: [], hellowork: [] },
                thumbnailUrls: [],
                generationStatus: "success",
                message: "サムネイル再生成はオフのためスキップしました",
              } satisfies Awaited<ReturnType<typeof runDesignImprovementAgent>>),
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
          // ライブプレビュー用: 改善箇所の要約（先頭5件）
          improvements: textResult.improvements.slice(0, 5).map((imp) => ({
            fieldLabel: imp.fieldLabel,
            before: imp.before,
            after: imp.after,
            reason: imp.reason,
          })),
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
            orgId: auth.user.orgId,
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
              await updateEffectiveness(auth.user.orgId, input.platform, categories, improved);
            }
          }
        } catch (e) {
          console.warn("[team-b] メモリ保存エラー（続行）:", e);
        }

        // サムネイルをサーバ側で Storage にアップロード(SSE には base64 を流さない)
        const uploadedThumbnails: string[] = [];
        if (input.jobId) {
          for (const key of ["indeed", "airwork", "jobmedley"] as const) {
            const images = platformThumbnails[key];
            if (images?.length) {
              try {
                const urls = await uploadThumbnailImages(images, input.jobId, `teamB-${key}`);
                uploadedThumbnails.push(...urls);
              } catch (e) {
                console.warn(`[team-b] ${key} サムネイルアップロード失敗:`, e);
              }
            }
          }
        }

        // 最終出力を組み立て（TeamBOutput 形状は従来互換。サムネイルは Storage URL）
        const finalOutput: TeamBOutput = {
          platform: input.platform,
          issuesSummary: textResult.issues,
          metricsAnalysis: textResult.metricsSummary,
          manuscriptAnalysis: textResult.overallAssessment,
          improvements: textResult.improvements,
          improvedPosting: textResult.improvedPosting as ExistingPostingFields,
          thumbnailUrls: uploadedThumbnails,
          budgetRecommendation: budgetResult?.recommendation,
          apiCostYen: getTrackedCostYen() ?? undefined,
          generatedAt: now(),
        };

        // 履歴保存(サーバ側で保存するため、接続が切断されても結果が残る)
        let recordId: string | null = null;
        let recordSaveError: string | undefined;
        if (input.jobId) {
          const owned = await getOwnedJob(input.jobId, auth.user, "write");
          if ("error" in owned) {
            recordSaveError =
              "改善履歴の保存に失敗しました。ログイン中のアカウントとこの求人の組織が一致しているか確認してください。";
          } else {
            const { data: record, error: recordError } = await supabase
              .from("JobRecord")
              .insert({
                id: crypto.randomUUID(),
                jobId: input.jobId,
                type: "team-b",
                platform: input.platform,
                inputData: input.existingPosting ? JSON.stringify(input.existingPosting) : null,
                outputData: JSON.stringify(finalOutput),
                metricsData: input.metrics ? JSON.stringify(input.metrics) : null,
                thumbnailUrls:
                  uploadedThumbnails.length > 0 ? JSON.stringify(uploadedThumbnails) : null,
                createdAt: now(),
              })
              .select("id")
              .single();
            if (recordError || !record) {
              console.error("[team-b] 履歴保存に失敗:", recordError?.message);
              recordSaveError =
                "改善履歴の保存に失敗しました。結果は表示されますが履歴には残りません。";
            } else {
              recordId = record.id as string;
              // 改善結果は最新 team-a レコード(=求人詳細が表示する現在原稿)にも反映する
              await applyTeamBResultToManuscript(
                input.jobId,
                input.platform,
                finalOutput as unknown as Record<string, unknown>
              );
            }
          }
        }

        // 実行成功時のみ課金記録(失敗しても改善処理は完了扱い)
        try {
          await recordUsage({
            org,
            userId: auth.user.id,
            kind: "team_b",
            jobId: input.jobId ?? null,
          });
          await settlePendingOverages(org);
        } catch (e) {
          console.error("[team-b] 課金記録に失敗:", e);
        }

        // 実行状態を完了として永続化(接続断後の復旧ポーリング用)
        if (trackRun) {
          await updateWorkflowRun(runId, {
            status: "completed",
            agentStatuses,
            outputData: finalOutput,
            recordId: recordId ?? undefined,
          });
        }

        const completeData: TeamBWorkflowCompleteData = {
          output: finalOutput,
          recordId,
          recordSaveError,
        };
        sendEvent(controller, {
          type: "workflow_complete",
          agentId: "tb-text-improvement",
          message: "原稿改善が完了しました",
          data: completeData,
          timestamp: now(),
        });
      } catch (error) {
        console.error("[team-b] Workflow error:", error);
        const message =
          error instanceof Error ? error.message : "ワークフロー実行中にエラーが発生しました";
        if (trackRun) {
          await updateWorkflowRun(runId, { status: "error", errorMessage: message });
        }
        sendEvent(controller, {
          type: "workflow_error",
          agentId: "tb-text-improvement",
          message,
          timestamp: now(),
        });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // クライアント切断でストリームが既に閉じている場合は無視
        }
        resolveWorkflowDone();
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
