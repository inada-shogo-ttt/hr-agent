"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AgentProgress } from "@/app/components/workflow/AgentProgress";
import { WorkflowTimeline } from "@/app/components/workflow/WorkflowTimeline";
import { LiveWritingDesk, DeskStep, FeedItem } from "@/app/components/workflow/LiveWritingDesk";
import { SSEEvent, AgentId, AgentStatus, TeamAWorkflowCompleteData } from "@/lib/agents/types";
import { addDismissedRun } from "@/lib/workflow-run-client";
import { AllPlatformPostings } from "@/types/platform";
import { AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const AGENT_WEIGHTS: Record<AgentId, number> = {
  manager: 5,
  "trend-research": 20,
  "trend-analysis": 10,
  "reference-selection": 10,
  "manuscript-writing": 30,
  "thumbnail-generation": 10,
  "fact-check": 10,
  "platform-formatter": 5,
};

const TEAM_A_STEPS: DeskStep[] = [
  { id: "manager", label: "要件確認" },
  { id: "trend-research", label: "調査" },
  { id: "trend-analysis", label: "分析" },
  { id: "reference-selection", label: "参考選定" },
  { id: "manuscript-writing", label: "執筆" },
  { id: "thumbnail-generation", label: "サムネ" },
  { id: "fact-check", label: "検査" },
  { id: "platform-formatter", label: "仕上げ" },
];

const PLATFORM_FEED_LABELS: Record<string, string> = {
  indeed: "Indeed原稿",
  airwork: "AirWork原稿",
  jobmedley: "JobMedley原稿",
  hellowork: "ハローワーク原稿",
};

// SSEイベントからライブプレビューのフィードを組み立てる（すべて実データ）
function buildTeamAFeed(events: SSEEvent[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const data = (event.data ?? {}) as Record<string, unknown>;
    const id = `${event.agentId}-${event.type}-${i}`;

    if (event.type === "agent_complete") {
      switch (event.agentId) {
        case "manager":
          if (typeof data.summary === "string" && data.summary) {
            items.push({ id, kind: "text", label: "要件分析", text: data.summary });
          }
          break;
        case "trend-research":
          if (typeof data.summary === "string" && data.summary) {
            items.push({ id, kind: "text", label: "トレンド調査の発見", text: data.summary });
          }
          break;
        case "trend-analysis":
          if (Array.isArray(data.recommendedKeywords) && data.recommendedKeywords.length > 0) {
            items.push({
              id,
              kind: "chips",
              label: "採用キーワード",
              chips: (data.recommendedKeywords as unknown[]).map(String),
            });
          }
          break;
        case "reference-selection":
          items.push({
            id,
            kind: "text",
            label: "参考原稿",
            text: `効果実績のある参考原稿を${Number(data.referencesCount) || 0}件選定しました`,
          });
          break;
        case "thumbnail-generation":
          items.push({ id, kind: "text", label: "サムネイル", text: event.message });
          break;
        case "fact-check":
          items.push({ id, kind: "text", label: "ファクトチェック", text: event.message });
          break;
      }
    }

    // 媒体別の原稿書き上がりプレビュー
    if (
      event.type === "agent_progress" &&
      event.agentId === "manuscript-writing" &&
      data.preview &&
      typeof data.preview === "object"
    ) {
      const preview = data.preview as { title?: string; catchphrase?: string; excerpt?: string };
      items.push({
        id,
        kind: "manuscript",
        label: PLATFORM_FEED_LABELS[String(data.platform)] || "原稿",
        title: preview.title || "",
        catchphrase: preview.catchphrase,
        excerpt: preview.excerpt || "",
      });
    }
  }
  return items;
}

export default function JobProgressPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, { status: AgentStatus; message?: string }>
  >({});
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
  const runKey = `teamARunId:${jobId}`;

  // ライブプレビュー用フィード（SSEイベントの実データから導出）
  const feed = useMemo(() => buildTeamAFeed(events), [events]);

  // ページ離脱後は画面更新・遷移を行わない(生成はサーバーで継続し、通知はウィジェットが担う)
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

    const input = sessionStorage.getItem("jobPostingInput");
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
        if (input) startWorkflow(JSON.parse(input));
        else router.replace(`/jobs/${jobId}/new-posting`);
      });
      return;
    }

    if (!input) {
      router.replace(`/jobs/${jobId}/new-posting`);
      return;
    }

    startWorkflow(JSON.parse(input));
  }, [router, jobId]);

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
    output: AllPlatformPostings | null,
    recordId: string | null,
    recordSaveError?: string
  ) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (pollTimer.current) clearTimeout(pollTimer.current);

    // 結果はページ離脱後でも保存しておく(出力ページ・ウィジェットが利用)
    if (output) sessionStorage.setItem("finalOutput", JSON.stringify(output));
    else sessionStorage.removeItem("finalOutput");
    if (recordId) sessionStorage.setItem("teamARecordId", recordId);
    else sessionStorage.removeItem("teamARecordId");

    // ページ離脱後の完了はウィジェットが通知・誘導する(強制遷移しない)
    if (!activeRef.current) return;

    // runId は保持したまま「確認済み」にする。ページ再訪時は完了済み実行として
    // 出力ページへ誘導され、再実行(二重課金)を防ぐ。ウィジェットにも重複表示しない
    if (runIdRef.current) addDismissedRun(runIdRef.current);

    setProgress(100);
    setError(null);
    setRecovering(false);
    setIsComplete(true);
    setStatusMessage("完成！求人原稿の生成が完了しました");
    if (recordSaveError) toast.error(recordSaveError);

    setTimeout(() => {
      router.push(`/jobs/${jobId}/new-posting/output`);
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
        outputData: AllPlatformPostings | null;
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
      setStatusMessage("生成はサーバー側で継続しています。完了までお待ちください...");
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

  // 接続断からの復旧: サーバ側では生成が継続しているため、ポーリングに切り替える
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

  const startWorkflow = (jobPostingInput: unknown) => {
    const runId = crypto.randomUUID();
    runIdRef.current = runId;
    sessionStorage.setItem(runKey, runId);

    const worker = new Worker("/sse-worker.js");
    worker.postMessage({
      url: "/api/team-a",
      body: { ...(jobPostingInput as Record<string, unknown>), jobId, runId },
    });

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "__worker_event") {
        handleEvent(msg.event as SSEEvent);
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

  const handleEvent = (event: SSEEvent) => {
    setEvents((prev) => [...prev, event]);

    if (event.type === "agent_start") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "running", message: event.message },
      }));
      setStatusMessage(`${event.agentId} を実行中...`);
    } else if (event.type === "agent_progress") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "running", message: event.message },
      }));
    } else if (event.type === "agent_complete") {
      setAgentStatuses((prev) => {
        const next = {
          ...prev,
          [event.agentId]: { status: "completed" as const, message: event.message },
        };
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
      const data = (event.data ?? {}) as TeamAWorkflowCompleteData;
      finalizeComplete(data.output ?? null, data.recordId ?? null, data.recordSaveError);
    } else if (event.type === "workflow_error") {
      finalizeError(event.message);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">AIエージェント実行中</h1>
        <p className="text-muted-foreground mb-4">
          求人原稿を自動生成しています。
        </p>
        {!isComplete && !error && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <span>生成には数分かかります。このページを開いたままお待ちください。</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>接続が切れたりPCがスリープしても生成はサーバー側で継続され、完了した原稿は履歴に保存されます。このページに戻れば途中から再開できます。</span>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/jobs/${jobId}`)}
              >
                他の作業を続ける（生成はバックグラウンドで継続）
              </Button>
            </div>
          </div>
        )}

        {recovering && !isComplete && !error && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-blue-800 text-sm">
                サーバーとの接続が切断されましたが、生成はサーバー側で継続しています。実行状況を確認しています...
              </p>
            </CardContent>
          </Card>
        )}

        {/* 原稿ライブプレビュー */}
        <div className="mb-6">
          <LiveWritingDesk
            steps={TEAM_A_STEPS}
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
                    サーバー側の処理が完了しないまま停止した可能性があります。お手数ですが、もう一度やり直してください。原稿が生成済みの場合は求人詳細の履歴に保存されています。
                  </p>
                  <Link href={`/jobs/${jobId}/new-posting`} className="mt-3 inline-block">
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
                  <Link href={`/jobs/${jobId}/new-posting`} className="mt-3 inline-block">
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
                求人原稿の生成が完了しました。出力ページに移動します...
              </p>
            </CardContent>
          </Card>
        )}

        <details className="mb-4 rounded-xl border bg-white">
          <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
            エージェント実行状況の詳細
          </summary>
          <div className="px-5 pb-5">
            <AgentProgress events={events} agentStatuses={agentStatuses} />
          </div>
        </details>

        <details className="rounded-xl border bg-white">
          <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
            イベントログ
          </summary>
          <div className="px-5 pb-5">
            <WorkflowTimeline events={events} />
          </div>
        </details>
      </div>
    </main>
  );
}
