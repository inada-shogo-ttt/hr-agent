"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, AlertCircle, CheckCircle, Circle, Loader2, XCircle } from "lucide-react";
import { TeamBSSEEvent, TeamBAgentId } from "@/lib/agents/team-b/types";
import { TeamBOutput } from "@/types/team-b";
import { AgentStatus } from "@/lib/agents/types";

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

  const startWorkflow = async (teamBInput: unknown) => {
    try {
      const response = await fetch("/api/team-b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamBInput),
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is null");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6)) as TeamBSSEEvent;
              handleEvent(event);
            } catch (e) {
              console.error("Failed to parse SSE event:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Workflow error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
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
        const thumbnailUrls = output.thumbnailUrls ?? [];

        const outputWithoutThumbnails = { ...output, thumbnailUrls: [] };
        sessionStorage.setItem("teamBOutput", JSON.stringify(outputWithoutThumbnails));

        if (thumbnailUrls.length > 0) {
          try {
            sessionStorage.setItem("teamBThumbnailUrls", JSON.stringify(thumbnailUrls));
          } catch {
            console.warn("[team-b progress] サムネイル保存失敗");
            sessionStorage.setItem(
              "teamBThumbnailUrls",
              JSON.stringify([
                "https://placehold.co/1344x768/1e40af/ffffff?text=改善サムネイル+1",
                "https://placehold.co/1344x768/1d4ed8/ffffff?text=改善サムネイル+2",
                "https://placehold.co/1344x768/2563eb/ffffff?text=改善サムネイル+3",
              ])
            );
          }
        }
      }

      setTimeout(() => {
        router.push("/rewrite-posting/output");
      }, 1500);
    } else if (event.type === "workflow_error") {
      setError(event.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/rewrite-posting"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          原稿入力に戻る
        </Link>

        <h1 className="text-2xl font-bold mb-2">AIエージェント実行中（原稿改善）</h1>
        <p className="text-muted-foreground mb-8">
          既存原稿を分析し、改善案を生成しています。このページを閉じないでください。
        </p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{statusMessage}</span>
              <span className="text-sm font-bold text-blue-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {error && (
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
