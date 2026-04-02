"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Circle, Clock, Loader2, XCircle } from "lucide-react";
import { TeamBSSEEvent, TeamBAgentId } from "@/lib/agents/team-b/types";
import { TeamBOutput } from "@/types/team-b";
import { AgentStatus } from "@/lib/agents/types";
import { saveThumbnails } from "@/lib/thumbnail-store";

const AGENT_LABELS: Record<TeamBAgentId, string> = {
  "tb-manager": "Manager Agent",
  "tb-metrics-analysis": "数値分析 Agent",
  "tb-manuscript-analysis": "原稿分析 Agent",
  "tb-text-improvement": "テキスト改善 Agent",
  "tb-design-improvement": "デザイン改善 Agent",
  "tb-budget-optimization": "予算最適化 Agent",
};

const AGENT_DESCRIPTIONS: Record<TeamBAgentId, string> = {
  "tb-manager": "既存原稿の確認・媒体特定",
  "tb-metrics-analysis": "PV/CTR/応募率等の定量的課題抽出",
  "tb-manuscript-analysis": "数値課題＋現原稿から定性的課題を特定",
  "tb-text-improvement": "タイトル・キャッチコピー・本文のリライト",
  "tb-design-improvement": "サムネイル画像の再生成",
  "tb-budget-optimization": "日額予算の推奨レンジ提案（Indeed専用）",
};

const AGENT_ORDER: TeamBAgentId[] = [
  "tb-manager",
  "tb-metrics-analysis",
  "tb-manuscript-analysis",
  "tb-text-improvement",
  "tb-design-improvement",
  "tb-budget-optimization",
];

const AGENT_WEIGHTS: Record<TeamBAgentId, number> = {
  "tb-manager": 5,
  "tb-metrics-analysis": 15,
  "tb-manuscript-analysis": 20,
  "tb-text-improvement": 35,
  "tb-design-improvement": 15,
  "tb-budget-optimization": 10,
};

function StatusIcon({ status }: { status: AgentStatus | undefined }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-300" />;
  }
}

function StatusBadge({ status }: { status: AgentStatus | undefined }) {
  switch (status) {
    case "running":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">実行中</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-green-100 text-green-700">完了</Badge>;
    case "error":
      return <Badge variant="destructive">エラー</Badge>;
    default:
      return <Badge variant="outline" className="text-gray-400">待機中</Badge>;
  }
}

export default function TeamBProgressPage() {
  const router = useRouter();
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, { status: AgentStatus; message?: string }>
  >({});
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("AIエージェントを起動中...");
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const input = sessionStorage.getItem("teamBInput");
    if (!input) {
      router.replace("/rewrite-posting");
      return;
    }

    startWorkflow(JSON.parse(input));
  }, [router]);

  const startWorkflow = (teamBInput: unknown) => {
    const worker = new Worker("/sse-worker.js");
    worker.postMessage({ url: "/api/team-b", body: teamBInput });

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "__worker_event") {
        handleEvent(msg.event as TeamBSSEEvent);
      } else if (msg.type === "__worker_error") {
        console.error("Workflow error:", msg.error);
        if (msg.error === "TIMEOUT") {
          setError("TIMEOUT");
        } else {
          setError(msg.error);
        }
        worker.terminate();
      } else if (msg.type === "__worker_done") {
        worker.terminate();
      }
    };

    worker.onerror = (e) => {
      console.error("Worker error:", e);
      setError("ワーカーの実行中にエラーが発生しました");
      worker.terminate();
    };
  };

  const handleEvent = (event: TeamBSSEEvent) => {
    if (event.type === "agent_start") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "running", message: event.message },
      }));
      setStatusMessage(`${AGENT_LABELS[event.agentId]} を実行中...`);
    } else if (event.type === "agent_complete") {
      setAgentStatuses((prev) => {
        const next = { ...prev, [event.agentId]: { status: "completed" as const, message: event.message } };

        // 進捗計算
        const completedWeight = Object.entries(AGENT_WEIGHTS)
          .filter(([id]) => next[id]?.status === "completed")
          .reduce((sum, [, w]) => sum + w, 0);
        const totalWeight = Object.values(AGENT_WEIGHTS).reduce((s, w) => s + w, 0);
        setProgress(Math.round((completedWeight / totalWeight) * 100));

        return next;
      });
    } else if (event.type === "agent_error") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "error", message: event.message },
      }));
      setError(event.message);
    } else if (event.type === "workflow_complete") {
      setProgress(100);
      setStatusMessage("完成！原稿改善が完了しました");
      setIsComplete(true);

      if (event.data) {
        const output = event.data as TeamBOutput;
        const outputWithoutThumbnails = { ...output, thumbnailUrls: [], platformThumbnails: undefined };
        sessionStorage.setItem("teamBOutput", JSON.stringify(outputWithoutThumbnails));

        // 媒体別にIndexedDBに保存
        const pt = output.platformThumbnails;
        const saves: Promise<void>[] = [];
        if (pt?.indeed?.length) saves.push(saveThumbnails("teamB-indeed", pt.indeed));
        if (pt?.airwork?.length) saves.push(saveThumbnails("teamB-airwork", pt.airwork));
        if (pt?.jobmedley?.length) saves.push(saveThumbnails("teamB-jobmedley", pt.jobmedley));
        // フォールバック: platformThumbnailsがない場合は旧形式で保存
        if (!pt && output.thumbnailUrls?.length > 0) {
          saves.push(saveThumbnails(`teamB-${output.platform}`, output.thumbnailUrls));
        }
        Promise.all(saves).catch(() => {
          console.warn("[team-b progress] サムネイル保存失敗");
        });
      }

      setTimeout(() => {
        router.push("/rewrite-posting/output");
      }, 1500);
    } else if (event.type === "workflow_error") {
      setError(event.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">AIエージェント実行中（原稿改善）</h1>
        <p className="text-muted-foreground mb-4">
          既存原稿を分析し、改善案を生成しています。
        </p>
        {!isComplete && !error && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>生成が完了するまで、このページを離れないでください。離れると結果が失われます。</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <span>処理中はPCがスリープしないようにしてください。スリープすると接続が切断される場合があります。</span>
            </div>
          </div>
        )}

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
                    処理に時間がかかりすぎたため、サーバーとの接続が切断されました。お手数ですが、もう一度やり直してください。
                  </p>
                  <Link href="/rewrite-posting" className="mt-3 inline-block">
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
                  <Link href="/rewrite-posting" className="mt-3 inline-block">
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
                      status === "running"
                        ? "border-blue-200 bg-blue-50"
                        : status === "completed"
                        ? "border-green-200 bg-green-50"
                        : status === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <StatusIcon status={status} />
                        {index < AGENT_ORDER.length - 1 && (
                          <div
                            className={`absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-8 ${
                              status === "completed" ? "bg-green-300" : "bg-gray-200"
                            }`}
                          />
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
                        <p className={`text-xs mt-1 ${status === "error" ? "text-red-600" : "text-gray-600"}`}>
                          {message}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {String(index + 1).padStart(2, "0")}
                    </div>
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
