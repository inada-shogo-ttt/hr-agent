"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AgentProgress } from "@/app/components/workflow/AgentProgress";
import { WorkflowTimeline } from "@/app/components/workflow/WorkflowTimeline";
import { OfficeScene, OfficeAgent } from "@/app/components/workflow/OfficeScene";
import { SSEEvent, AgentId, AgentStatus } from "@/lib/agents/types";
import { AllPlatformPostings } from "@/types/platform";
import { AlertCircle, Clock } from "lucide-react";

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

const TEAM_A_AGENTS: OfficeAgent[] = [
  { id: "manager", label: "マネージャー", color: "#3B82F6" },
  { id: "trend-research", label: "トレンド調査", color: "#10B981" },
  { id: "trend-analysis", label: "トレンド分析", color: "#14B8A6" },
  { id: "reference-selection", label: "参考原稿選定", color: "#8B5CF6" },
  { id: "manuscript-writing", label: "原稿執筆", color: "#6366F1" },
  { id: "thumbnail-generation", label: "サムネイル生成", color: "#EC4899" },
  { id: "fact-check", label: "ファクトチェック", color: "#F59E0B" },
  { id: "platform-formatter", label: "フォーマッター", color: "#64748B" },
];

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

    const input = sessionStorage.getItem("jobPostingInput");
    if (!input) {
      router.replace(`/jobs/${jobId}/new-posting`);
      return;
    }

    startWorkflow(JSON.parse(input));
  }, [router, jobId]);

  const startWorkflow = async (jobPostingInput: unknown) => {
    try {
      const response = await fetch("/api/team-a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobPostingInput),
      });

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error("TIMEOUT");
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is null");

      const decoder = new TextDecoder();
      let buffer = "";
      let receivedComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          // SSE仕様: 複数行の data: を結合
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
            const event = JSON.parse(jsonStr) as SSEEvent;
            if (event.type === "workflow_complete") receivedComplete = true;
            await handleEvent(event);
          } catch (e) {
            console.error("Failed to parse SSE event:", e);
          }
        }
      }

      // ストリームが完了イベントなしに終了した場合はタイムアウトとみなす
      if (!receivedComplete) {
        throw new Error("TIMEOUT");
      }
    } catch (err) {
      console.error("Workflow error:", err);
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      if (message === "TIMEOUT") {
        setError("TIMEOUT");
      } else {
        setError(message);
      }
    }
  };

  const handleEvent = async (event: SSEEvent) => {
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

        // サムネイルを Supabase Storage にアップロード
        setStatusMessage("サムネイルをアップロード中...");
        const uploadedThumbnails: Record<string, string[]> = {};
        const platforms = ["indeed", "airwork", "jobmedley"] as const;

        for (const platform of platforms) {
          const platformOutput = output[platform];
          if (platformOutput?.thumbnailUrls?.length > 0) {
            try {
              const uploadRes = await fetch("/api/thumbnails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  images: platformOutput.thumbnailUrls,
                  jobId,
                  platform,
                }),
              });
              if (uploadRes.ok) {
                const { urls } = await uploadRes.json();
                uploadedThumbnails[platform] = urls;
              }
            } catch {
              console.warn(`[progress] ${platform} サムネイルアップロード失敗`);
            }
          }
        }

        // アップロード済みURLで出力を更新
        const outputWithStorageUrls: AllPlatformPostings = {
          ...output,
          thumbnailUrls: Object.values(uploadedThumbnails).flat(),
          platformThumbnails: undefined,
          indeed: { ...output.indeed, thumbnailUrls: uploadedThumbnails.indeed || [] },
          airwork: { ...output.airwork, thumbnailUrls: uploadedThumbnails.airwork || [] },
          jobmedley: { ...output.jobmedley, thumbnailUrls: uploadedThumbnails.jobmedley || [] },
        };

        sessionStorage.setItem("finalOutput", JSON.stringify(outputWithStorageUrls));

        // DB に履歴保存
        setStatusMessage("履歴を保存中...");
        let inputDataParsed = null;
        try {
          const inputDataStr = sessionStorage.getItem("jobPostingInput");
          if (inputDataStr) inputDataParsed = JSON.parse(inputDataStr);
        } catch {
          console.warn("[progress] inputData の JSON パースに失敗");
        }

        try {
          const allThumbnailUrls = Object.values(uploadedThumbnails).flat();
          const saveRes = await fetch(`/api/jobs/${jobId}/records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "team-a",
              platform: "all",
              inputData: inputDataParsed,
              outputData: outputWithStorageUrls,
              thumbnailUrls: allThumbnailUrls.length > 0 ? allThumbnailUrls : null,
            }),
          });
          if (saveRes.ok) {
            const record = await saveRes.json();
            sessionStorage.setItem("teamARecordId", record.id);
          } else {
            const errText = await saveRes.text();
            console.error(`Failed to save record (${saveRes.status}):`, errText);
          }
        } catch (err) {
          console.error("Failed to save record:", err);
        }
      }

      setTimeout(() => {
        router.push(`/jobs/${jobId}/new-posting/output`);
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
          <div className="mb-6 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>生成が完了するまで、このページを離れないでください。離れると結果が失われます。</span>
          </div>
        )}

        {/* オフィスシーン */}
        <div className="mb-6">
          <OfficeScene agents={TEAM_A_AGENTS} statuses={agentStatuses} progress={progress} />
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
                    処理に時間がかかりすぎたため、サーバーとの接続が切断されました。お手数ですが、もう一度やり直してください。
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">エージェント実行状況</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentProgress events={events} agentStatuses={agentStatuses} />
          </CardContent>
        </Card>

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
