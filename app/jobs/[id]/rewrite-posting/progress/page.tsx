"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Circle, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { LiveWritingDesk, DeskStep, FeedItem } from "@/app/components/workflow/LiveWritingDesk";
import { TeamBSSEEvent, TeamBAgentId, TeamBWorkflowCompleteData } from "@/lib/agents/team-b/types";
import { addDismissedRun } from "@/lib/workflow-run-client";
import { TeamBOutput } from "@/types/team-b";
import { AgentStatus } from "@/lib/agents/types";

const AGENT_LABELS: Record<TeamBAgentId, string> = {
  "tb-text-improvement": "原稿改善エージェント",
  "tb-design-improvement": "デザイン改善エージェント",
  "tb-budget-optimization": "予算最適化エージェント",
};

const AGENT_DESCRIPTIONS: Record<TeamBAgentId, string> = {
  "tb-text-improvement": "参考原稿・メトリクス・現行原稿を統合分析し、課題抽出からリライトまでを一気通貫で実施",
  "tb-design-improvement": "サムネイル画像の再生成",
  "tb-budget-optimization": "日額予算の推奨レンジ提案（Indeed専用）",
};

const AGENT_ORDER: TeamBAgentId[] = [
  "tb-text-improvement",
  "tb-design-improvement",
  "tb-budget-optimization",
];

const AGENT_WEIGHTS: Record<TeamBAgentId, number> = {
  "tb-text-improvement": 70,
  "tb-design-improvement": 20,
  "tb-budget-optimization": 10,
};

const TEAM_B_STEPS: DeskStep[] = [
  { id: "tb-text-improvement", label: "原稿改善" },
  { id: "tb-design-improvement", label: "デザイン改善" },
  { id: "tb-budget-optimization", label: "予算最適化" },
];

// SSEイベントからライブプレビューのフィードを組み立てる（すべて実データ）
function buildTeamBFeed(events: TeamBSSEEvent[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const data = (event.data ?? {}) as Record<string, unknown>;
    const id = `${event.agentId}-${event.type}-${i}`;

    if (event.type === "agent_start" && event.agentId === "tb-text-improvement") {
      items.push({ id, kind: "text", label: "分析開始", text: event.message });
    }

    if (event.type !== "agent_complete") continue;

    switch (event.agentId) {
      case "tb-text-improvement": {
        if (typeof data.metricsSummary === "string" && data.metricsSummary) {
          items.push({ id: `${id}-metrics`, kind: "text", label: "掲載数値の所見", text: data.metricsSummary });
        }
        if (typeof data.assessment === "string" && data.assessment) {
          items.push({ id: `${id}-assessment`, kind: "text", label: "原稿の総合評価", text: data.assessment });
        }
        if (Array.isArray(data.improvements)) {
          (data.improvements as Array<Record<string, string>>).forEach((imp, j) => {
            items.push({
              id: `${id}-imp-${j}`,
              kind: "text",
              label: `改善: ${imp.fieldLabel || ""}`,
              text: `${imp.before || ""} → ${imp.after || ""}${imp.reason ? `（${imp.reason}）` : ""}`,
            });
          });
        }
        break;
      }
      case "tb-design-improvement":
        items.push({ id, kind: "text", label: "サムネイル", text: event.message });
        break;
      case "tb-budget-optimization":
        items.push({
          id,
          kind: "text",
          label: "予算最適化",
          text: typeof data.recommendedRange === "string" && data.recommendedRange
            ? `推奨日額予算: ${data.recommendedRange}`
            : event.message,
        });
        break;
    }
  }
  return items;
}

function StatusIcon({ status }: { status: AgentStatus | undefined }) {
  switch (status) {
    case "running": return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case "completed": return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "error": return <XCircle className="w-5 h-5 text-red-500" />;
    default: return <Circle className="w-5 h-5 text-gray-300" />;
  }
}

function StatusBadge({ status }: { status: AgentStatus | undefined }) {
  switch (status) {
    case "running": return <Badge variant="secondary" className="bg-blue-100 text-blue-700">実行中</Badge>;
    case "completed": return <Badge variant="secondary" className="bg-green-100 text-green-700">完了</Badge>;
    case "error": return <Badge variant="destructive">エラー</Badge>;
    default: return <Badge variant="outline" className="text-gray-400">待機中</Badge>;
  }
}

export default function JobTeamBProgressPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [agentStatuses, setAgentStatuses] = useState<Record<string, { status: AgentStatus; message?: string }>>({});
  const [events, setEvents] = useState<TeamBSSEEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("AIエージェントを起動中...");
  const [recovering, setRecovering] = useState(false);
  const hasStarted = useRef(false);
  const runIdRef = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollFailures = useRef(0);
  const finishedRef = useRef(false);

  // 実行IDをタブ内に保持し、リロード・接続断後に同じ実行へ復帰できるようにする
  const runKey = `teamBRunId:${jobId}`;

  // ページ離脱後は画面更新・遷移を行わない(改善処理はサーバーで継続し、通知はウィジェットが担う)
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const input = sessionStorage.getItem("teamBInput");
    const existingRunId = sessionStorage.getItem(runKey);

    // 前回の実行が残っている場合(リロード・タブ復帰)は再実行せず状態を確認する
    if (existingRunId) {
      runIdRef.current = existingRunId;
      setRecovering(true);
      setStatusMessage("前回の実行状況を確認しています...");
      watchRun(existingRunId, "TIMEOUT", () => {
        // 実行が記録されていなければ新規開始
        sessionStorage.removeItem(runKey);
        setRecovering(false);
        if (input) startWithHistory(input);
        else router.replace(`/jobs/${jobId}/rewrite-posting`);
      });
      return;
    }

    if (!input) {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
      return;
    }

    startWithHistory(input);
  }, [router, jobId]);

  // 過去データを取得してから実行
  const startWithHistory = (input: string) => {
    fetch(`/api/jobs/${jobId}/history-context`)
      .then((r) => r.json())
      .then((historyData) => {
        const teamBInput = JSON.parse(input);
        startWorkflow({ ...teamBInput, jobId, historyContext: historyData.history });
      })
      .catch(() => {
        startWorkflow({ ...JSON.parse(input), jobId });
      });
  };

  const computeProgress = (
    statuses: Record<string, { status: AgentStatus; message?: string }>
  ) => {
    const completedWeight = Object.entries(AGENT_WEIGHTS)
      .filter(([id]) => statuses[id]?.status === "completed")
      .reduce((sum, [, w]) => sum + w, 0);
    const totalWeight = Object.values(AGENT_WEIGHTS).reduce((s, w) => s + w, 0);
    return Math.round((completedWeight / totalWeight) * 100);
  };

  // 完了確定: 結果を保存して出力ページへ(SSE経由・復旧ポーリング経由の両方から呼ばれる)
  // サムネイルアップロードと履歴保存はサーバ側で完了済み
  const finalizeComplete = (
    output: TeamBOutput | null,
    recordId: string | null,
    recordSaveError?: string
  ) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (pollTimer.current) clearTimeout(pollTimer.current);

    // 結果はページ離脱後でも保存しておく(出力ページ・ウィジェットが利用)
    if (output) sessionStorage.setItem("teamBOutput", JSON.stringify(output));
    else sessionStorage.removeItem("teamBOutput");
    if (recordId) sessionStorage.setItem("teamBRecordId", recordId);
    else sessionStorage.removeItem("teamBRecordId");

    // ページ離脱後の完了はウィジェットが通知・誘導する(強制遷移しない)
    if (!activeRef.current) return;

    // runId は保持したまま「確認済み」にする。ページ再訪時は完了済み実行として
    // 出力ページへ誘導され、再実行(二重課金)を防ぐ。ウィジェットにも重複表示しない
    if (runIdRef.current) addDismissedRun(runIdRef.current);

    setProgress(100);
    setError(null);
    setRecovering(false);
    setIsComplete(true);
    setStatusMessage("完成！原稿改善が完了しました");
    if (recordSaveError) toast.error(recordSaveError);

    setTimeout(() => {
      router.push(`/jobs/${jobId}/rewrite-posting/output`);
    }, 1500);
  };

  const finalizeError = (message: string) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (pollTimer.current) clearTimeout(pollTimer.current);
    // ページ離脱後のエラーはウィジェットが表示する
    if (!activeRef.current) return;
    if (runIdRef.current) addDismissedRun(runIdRef.current);
    setRecovering(false);
    setError(message);
  };

  // サーバ側の実行状態をポーリングし、完了/エラー/停止を判定する
  // fallbackError: 実行を追跡できない場合に表示するエラー
  const watchRun = async (
    runId: string,
    fallbackError: string,
    onNotFound?: () => void
  ) => {
    if (finishedRef.current || !activeRef.current) return;
    try {
      const res = await fetch(`/api/workflow-runs/${runId}`);
      if (res.status === 404) {
        if (onNotFound) onNotFound();
        else finalizeError(fallbackError);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const run = (await res.json()) as {
        status: "running" | "completed" | "error";
        stale: boolean;
        agentStatuses: Record<string, { status: AgentStatus; message?: string }> | null;
        outputData: TeamBOutput | null;
        recordId: string | null;
        errorMessage: string | null;
      };
      pollFailures.current = 0;

      if (run.status === "completed") {
        finalizeComplete(run.outputData, run.recordId);
        return;
      }
      if (run.status === "error") {
        finalizeError(run.errorMessage || "ワークフロー実行中にエラーが発生しました");
        return;
      }
      if (run.stale) {
        // サーバ側の実行が途絶えている
        finalizeError(fallbackError);
        return;
      }
      // 実行中: 進捗を反映して継続
      if (run.agentStatuses) {
        setAgentStatuses(run.agentStatuses);
        setProgress(computeProgress(run.agentStatuses));
      }
      setStatusMessage("改善処理はサーバー側で継続しています。完了までお待ちください...");
    } catch {
      pollFailures.current++;
      if (pollFailures.current >= 24) {
        // 約2分間状態確認に失敗し続けたら諦める
        finalizeError(fallbackError);
        return;
      }
    }
    // 実行が見つかった後の 404 は新規開始せずエラー扱いにする(onNotFound は初回のみ)
    pollTimer.current = setTimeout(() => watchRun(runId, fallbackError), 5000);
  };

  // 接続断からの復旧: サーバ側では改善処理が継続しているため、ポーリングに切り替える
  const beginRecovery = (originalError: string) => {
    if (finishedRef.current || !activeRef.current) return;
    const runId = runIdRef.current;
    if (!runId) {
      finalizeError(originalError);
      return;
    }
    setRecovering(true);
    setStatusMessage("接続が切断されました。サーバー側の実行状況を確認しています...");
    watchRun(runId, originalError);
  };

  const startWorkflow = (teamBInput: Record<string, unknown>) => {
    const runId = crypto.randomUUID();
    runIdRef.current = runId;
    sessionStorage.setItem(runKey, runId);

    const worker = new Worker("/sse-worker.js");
    worker.postMessage({ url: "/api/team-b", body: { ...teamBInput, runId } });

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "__worker_event") {
        handleEvent(msg.event as TeamBSSEEvent);
      } else if (msg.type === "__worker_error") {
        console.error("Workflow error:", msg.error);
        beginRecovery(msg.error);
        worker.terminate();
      } else if (msg.type === "__worker_done") {
        worker.terminate();
      }
    };

    worker.onerror = (e) => {
      console.error("Worker error:", e);
      beginRecovery("ワーカーの実行中にエラーが発生しました");
      worker.terminate();
    };
  };

  // ライブプレビュー用フィード（SSEイベントの実データから導出）
  const feed = useMemo(() => buildTeamBFeed(events), [events]);

  const handleEvent = (event: TeamBSSEEvent) => {
    setEvents((prev) => [...prev, event]);

    if (event.type === "agent_start") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "running", message: event.message },
      }));
      setStatusMessage(`${AGENT_LABELS[event.agentId]} を実行中...`);
    } else if (event.type === "agent_complete") {
      setAgentStatuses((prev) => {
        const next = { ...prev, [event.agentId]: { status: "completed" as const, message: event.message } };
        setProgress(computeProgress(next));
        return next;
      });
    } else if (event.type === "agent_error") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "error", message: event.message },
      }));
      setError(event.message);
    } else if (event.type === "workflow_complete") {
      const data = (event.data ?? {}) as TeamBWorkflowCompleteData;
      finalizeComplete(data.output ?? null, data.recordId ?? null, data.recordSaveError);
    } else if (event.type === "workflow_error") {
      finalizeError(event.message);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">AIエージェント実行中（原稿改善）</h1>
        <p className="text-muted-foreground mb-4">
          既存原稿を分析し、改善案を生成しています。
        </p>
        {!isComplete && !error && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <span>改善には数分かかります。このページを開いたままお待ちください。</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>接続が切れたりPCがスリープしても改善処理はサーバー側で継続され、完了した結果は履歴に保存されます。このページに戻れば途中から再開できます。</span>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/jobs/${jobId}`)}
              >
                他の作業を続ける（改善はバックグラウンドで継続）
              </Button>
            </div>
          </div>
        )}

        {recovering && !isComplete && !error && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-blue-800 text-sm">
                サーバーとの接続が切断されましたが、改善処理はサーバー側で継続しています。実行状況を確認しています...
              </p>
            </CardContent>
          </Card>
        )}

        {/* 原稿ライブプレビュー */}
        <div className="mb-6">
          <LiveWritingDesk
            steps={TEAM_B_STEPS}
            statuses={agentStatuses}
            feed={feed}
            isComplete={isComplete}
          />
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{statusMessage}</span>
              <span className="text-sm font-bold text-blue-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {error === "TIMEOUT" && (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 mb-1">タイムアウトしました</p>
                  <p className="text-sm text-amber-700">
                    サーバー側の処理が完了しないまま停止した可能性があります。お手数ですが、もう一度やり直してください。改善結果が生成済みの場合は求人詳細の履歴に保存されています。
                  </p>
                  <Link href={`/jobs/${jobId}/rewrite-posting`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">もう一度やり直す</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && error !== "TIMEOUT" && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-800 mb-1">エラーが発生しました</p>
                  <p className="text-sm text-red-600">{error}</p>
                  <Link href={`/jobs/${jobId}/rewrite-posting`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">最初からやり直す</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isComplete && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-green-800 font-medium text-center">
                原稿改善が完了しました。出力ページに移動します...
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">エージェント実行状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {AGENT_ORDER.map((agentId, index) => {
                const status = agentStatuses[agentId]?.status;
                const message = agentStatuses[agentId]?.message;
                return (
                  <div
                    key={agentId}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-300 ${
                      status === "running" ? "border-blue-200 bg-blue-50"
                        : status === "completed" ? "border-green-200 bg-green-50"
                        : status === "error" ? "border-red-200 bg-red-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <StatusIcon status={status} />
                        {index < AGENT_ORDER.length - 1 && (
                          <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-8 ${status === "completed" ? "bg-green-300" : "bg-gray-200"}`} />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{AGENT_LABELS[agentId]}</span>
                        <StatusBadge status={status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{AGENT_DESCRIPTIONS[agentId]}</p>
                      {message && status !== "pending" && (
                        <p className={`text-xs mt-1 ${status === "error" ? "text-red-600" : "text-gray-600"}`}>{message}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{String(index + 1).padStart(2, "0")}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
