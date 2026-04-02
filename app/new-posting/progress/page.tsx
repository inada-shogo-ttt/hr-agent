"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AgentProgress } from "@/app/components/workflow/AgentProgress";
import { WorkflowTimeline } from "@/app/components/workflow/WorkflowTimeline";
import { SSEEvent, AgentId, AgentStatus } from "@/lib/agents/types";
import { AllPlatformPostings } from "@/types/platform";
import { AlertCircle, Clock } from "lucide-react";
import { saveThumbnails } from "@/lib/thumbnail-store";

const TOTAL_AGENTS = 8;

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

export default function ProgressPage() {
  const router = useRouter();
  const [events, setEvents] = useState<SSEEvent[]>([]);
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

    const input = sessionStorage.getItem("jobPostingInput");
    if (!input) {
      router.replace("/new-posting");
      return;
    }

    const jobPostingInput = JSON.parse(input);
    startWorkflow(jobPostingInput);
  }, [router]);

  const startWorkflow = (jobPostingInput: unknown) => {
    const worker = new Worker("/sse-worker.js");
    worker.postMessage({ url: "/api/team-a", body: jobPostingInput });

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "__worker_event") {
        handleEvent(msg.event as SSEEvent);
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
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "completed", message: event.message },
      }));

      // 進捗計算
      const completedWeight = Object.entries(AGENT_WEIGHTS)
        .filter(([id]) => {
          const s = agentStatuses[id]?.status;
          return s === "completed" || id === event.agentId;
        })
        .reduce((sum, [, w]) => sum + w, 0);
      const totalWeight = Object.values(AGENT_WEIGHTS).reduce((s, w) => s + w, 0);
      setProgress(Math.round((completedWeight / totalWeight) * 100));
    } else if (event.type === "agent_error") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "error", message: event.message },
      }));
      setError(event.message);
    } else if (event.type === "workflow_complete") {
      setProgress(100);
      setStatusMessage("完成！求人原稿の生成が完了しました");
      setIsComplete(true);

      // 完成原稿をsessionStorageに保存
      // base64サムネイルは AllPlatformPostings の3箇所（トップ/indeed/airwork）に存在するため
      // すべて空配列に置き換えてから保存し、別キー "thumbnailUrls" に分離する
      if (event.data) {
        const output = event.data as AllPlatformPostings;

        const outputWithoutThumbnails: AllPlatformPostings = {
          ...output,
          thumbnailUrls: [],
          platformThumbnails: undefined,
          indeed: { ...output.indeed, thumbnailUrls: [] },
          airwork: { ...output.airwork, thumbnailUrls: [] },
          jobmedley: { ...output.jobmedley, thumbnailUrls: [] },
        };

        sessionStorage.setItem("finalOutput", JSON.stringify(outputWithoutThumbnails));

        // 媒体別にIndexedDBに保存
        const saves: Promise<void>[] = [];
        if (output.indeed?.thumbnailUrls?.length > 0) {
          saves.push(saveThumbnails("teamA-indeed", output.indeed.thumbnailUrls));
        }
        if (output.airwork?.thumbnailUrls?.length > 0) {
          saves.push(saveThumbnails("teamA-airwork", output.airwork.thumbnailUrls));
        }
        if (output.jobmedley?.thumbnailUrls?.length > 0) {
          saves.push(saveThumbnails("teamA-jobmedley", output.jobmedley.thumbnailUrls));
        }
        Promise.all(saves).catch(() => {
          console.warn("[progress] サムネイル保存失敗");
        });
      }

      // 少し待ってから出力ページへ遷移
      setTimeout(() => {
        router.push("/new-posting/output");
      }, 1500);
    } else if (event.type === "workflow_error") {
      setError(event.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">AIエージェント実行中</h1>
        <p className="text-muted-foreground mb-4">
          求人原稿を自動生成しています。
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

        {/* 全体進捗 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{statusMessage}</span>
              <span className="text-sm font-bold text-blue-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* タイムアウト表示 */}
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
                  <Link href="/new-posting" className="mt-3 inline-block">
                    <Button variant="outline" size="sm">もう一度やり直す</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* エラー表示 */}
        {error && error !== "TIMEOUT" && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-800 mb-1">エラーが発生しました</p>
                  <p className="text-sm text-red-600">{error}</p>
                  <Link href="/new-posting" className="mt-3 inline-block">
                    <Button variant="outline" size="sm">
                      最初からやり直す
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 完了メッセージ */}
        {isComplete && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-green-800 font-medium text-center">
                ✓ 求人原稿の生成が完了しました。出力ページに移動します...
              </p>
            </CardContent>
          </Card>
        )}

        {/* エージェント進捗 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">エージェント実行状況</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentProgress events={events} agentStatuses={agentStatuses} />
          </CardContent>
        </Card>

        {/* イベントログ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">イベントログ</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowTimeline events={events} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
