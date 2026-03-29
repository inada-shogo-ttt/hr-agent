"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Circle, Loader2, XCircle } from "lucide-react";
import { OfficeScene, OfficeAgent } from "@/app/components/workflow/OfficeScene";
import { TeamBSSEEvent, TeamBAgentId } from "@/lib/agents/team-b/types";
import { TeamBOutput } from "@/types/team-b";
import { AgentStatus } from "@/lib/agents/types";

const AGENT_LABELS: Record<TeamBAgentId, string> = {
  "tb-manager": "マネージャーエージェント",
  "tb-metrics-analysis": "数値分析エージェント",
  "tb-manuscript-analysis": "原稿分析エージェント",
  "tb-text-improvement": "テキスト改善エージェント",
  "tb-design-improvement": "デザイン改善エージェント",
  "tb-budget-optimization": "予算最適化エージェント",
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

const TEAM_B_AGENTS: OfficeAgent[] = [
  { id: "tb-manager", label: "マネージャー", color: "#3B82F6" },
  { id: "tb-metrics-analysis", label: "数値分析", color: "#10B981" },
  { id: "tb-manuscript-analysis", label: "原稿分析", color: "#8B5CF6" },
  { id: "tb-text-improvement", label: "テキスト改善", color: "#6366F1" },
  { id: "tb-design-improvement", label: "デザイン改善", color: "#EC4899" },
  { id: "tb-budget-optimization", label: "予算最適化", color: "#F59E0B" },
];

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
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("AIエージェントを起動中...");
  const hasStarted = useRef(false);

  // 離脱防止: 実行中はページを離れる前に警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isComplete && !error) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isComplete, error]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const input = sessionStorage.getItem("teamBInput");
    if (!input) {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
      return;
    }

    // 過去データを取得してから実行
    fetch(`/api/jobs/${jobId}/history-context`)
      .then((r) => r.json())
      .then((historyData) => {
        const teamBInput = JSON.parse(input);
        startWorkflow({ ...teamBInput, jobId, historyContext: historyData.history });
      })
      .catch(() => {
        startWorkflow(JSON.parse(input));
      });
  }, [router, jobId]);

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
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          const dataLines: string[] = [];
          for (const line of block.split("\n")) {
            if (line.startsWith("data: ")) {
              dataLines.push(line.slice(6));
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5));
            }
          }
          if (dataLines.length === 0) continue;
          const jsonStr = dataLines.join("\n");
          try {
            const event = JSON.parse(jsonStr) as TeamBSSEEvent;
            handleEvent(event);
          } catch (e) {
            console.error("Failed to parse SSE event:", e);
          }
        }
      }
    } catch (err) {
      console.error("Workflow error:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleEvent = async (event: TeamBSSEEvent) => {
    if (event.type === "agent_start") {
      setAgentStatuses((prev) => ({
        ...prev,
        [event.agentId]: { status: "running", message: event.message },
      }));
      setStatusMessage(`${AGENT_LABELS[event.agentId]} を実行中...`);
    } else if (event.type === "agent_complete") {
      setAgentStatuses((prev) => {
        const next = { ...prev, [event.agentId]: { status: "completed" as const, message: event.message } };
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
        // サムネイルを Supabase Storage にアップロード
        setStatusMessage("サムネイルをアップロード中...");
        const uploadedThumbnails: string[] = [];
        const pt = output.platformThumbnails;
        const platformsToUpload = [
          { key: "indeed", urls: pt?.indeed },
          { key: "airwork", urls: pt?.airwork },
          { key: "jobmedley", urls: pt?.jobmedley },
        ];

        for (const { key, urls } of platformsToUpload) {
          if (urls?.length) {
            try {
              const uploadRes = await fetch("/api/thumbnails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ images: urls, jobId, platform: `teamB-${key}` }),
              });
              if (uploadRes.ok) {
                const { urls: uploaded } = await uploadRes.json();
                uploadedThumbnails.push(...uploaded);
              }
            } catch { /* ignore */ }
          }
        }

        // フォールバック: platformThumbnails がない場合
        if (!pt && output.thumbnailUrls?.length > 0) {
          try {
            const uploadRes = await fetch("/api/thumbnails", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: output.thumbnailUrls, jobId, platform: `teamB-${output.platform}` }),
            });
            if (uploadRes.ok) {
              const { urls: uploaded } = await uploadRes.json();
              uploadedThumbnails.push(...uploaded);
            }
          } catch { /* ignore */ }
        }

        const outputWithStorageUrls = {
          ...output,
          thumbnailUrls: uploadedThumbnails,
          platformThumbnails: undefined,
        };

        sessionStorage.setItem("teamBOutput", JSON.stringify(outputWithStorageUrls));

        // DB に履歴保存
        setStatusMessage("履歴を保存中...");
        let inputData = null;
        try {
          const inputStr = sessionStorage.getItem("teamBInput");
          if (inputStr) inputData = JSON.parse(inputStr);
        } catch { /* ignore */ }

        try {
          const saveRes = await fetch(`/api/jobs/${jobId}/records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "team-b",
              platform: output.platform,
              inputData: inputData?.existingPosting || null,
              outputData: outputWithStorageUrls,
              metricsData: inputData?.metrics || null,
              thumbnailUrls: uploadedThumbnails.length > 0 ? uploadedThumbnails : null,
            }),
          });
          if (saveRes.ok) {
            const record = await saveRes.json();
            sessionStorage.setItem("teamBRecordId", record.id);
          } else {
            console.error(`Failed to save record (${saveRes.status}):`, await saveRes.text());
          }
        } catch (err) {
          console.error("Failed to save record:", err);
        }
      }

      setTimeout(() => {
        router.push(`/jobs/${jobId}/rewrite-posting/output`);
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
          <div className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>生成が完了するまで、このページを離れないでください。離れると結果が失われます。</span>
          </div>
        )}

        {/* オフィスシーン */}
        <div className="mb-6">
          <OfficeScene agents={TEAM_B_AGENTS} statuses={agentStatuses} progress={progress} />
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

        {error && (
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
