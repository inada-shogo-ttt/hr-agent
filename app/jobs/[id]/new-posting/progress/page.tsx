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
  const hasStarted = useRef(false);

  // ライブプレビュー用フィード（SSEイベントの実データから導出）
  const feed = useMemo(() => buildTeamAFeed(events), [events]);

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

  const startWorkflow = (jobPostingInput: unknown) => {
    const worker = new Worker("/sse-worker.js");
    worker.postMessage({
      url: "/api/team-a",
      body: { ...(jobPostingInput as Record<string, unknown>), jobId },
    });

    worker.onmessage = async (e) => {
      const msg = e.data;
      if (msg.type === "__worker_event") {
        await handleEvent(msg.event as SSEEvent);
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

        // サムネイルを Supabase Storage にアップロード（生成された媒体のみ）
        setStatusMessage("サムネイルをアップロード中...");
        const uploadedThumbnails: Record<string, string[]> = {};
        const platforms = ["indeed", "airwork", "jobmedley"] as const;

        for (const platform of platforms) {
          const platformOutput = output[platform];
          if (platformOutput && (platformOutput.thumbnailUrls?.length ?? 0) > 0) {
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

        // アップロード済みURLで出力を更新（生成された媒体のみ）
        const outputWithStorageUrls: AllPlatformPostings = {
          ...output,
          thumbnailUrls: Object.values(uploadedThumbnails).flat(),
          platformThumbnails: undefined,
          ...(output.indeed
            ? { indeed: { ...output.indeed, thumbnailUrls: uploadedThumbnails.indeed || [] } }
            : {}),
          ...(output.airwork
            ? { airwork: { ...output.airwork, thumbnailUrls: uploadedThumbnails.airwork || [] } }
            : {}),
          ...(output.jobmedley
            ? { jobmedley: { ...output.jobmedley, thumbnailUrls: uploadedThumbnails.jobmedley || [] } }
            : {}),
        };

        sessionStorage.setItem("finalOutput", JSON.stringify(outputWithStorageUrls));

        // DB に履歴保存
        setStatusMessage("履歴を保存中...");
        let inputDataParsed = null;
        try {
          const inputDataStr = sessionStorage.getItem("jobPostingInput");
          if (inputDataStr) inputDataParsed = JSON.parse(inputDataStr);
          // 参考画像(base64)はDBに保存しない（レコード肥大化防止）
          if (inputDataParsed?.thumbnailReference) {
            delete inputDataParsed.thumbnailReference;
          }
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
    <main className="min-h-screen bg-white">
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
