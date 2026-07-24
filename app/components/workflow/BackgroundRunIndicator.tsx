"use client";

// 全ページ共通のバックグラウンド生成インジケーター(画面右下)。
// sessionStorage に保持している runId(teamARunId:* / teamBRunId:*)を監視し、
// 実行中の生成/改善の進捗をポーリング表示する。進捗ページ自身が表示を担うため、
// 進捗ページでは表示しない。

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDismissedRuns, addDismissedRun } from "@/lib/workflow-run-client";

// 進捗率の重み(各進捗ページと同じ値)
const TEAM_A_WEIGHTS: Record<string, number> = {
  manager: 5,
  "trend-research": 20,
  "trend-analysis": 10,
  "reference-selection": 10,
  "manuscript-writing": 30,
  "thumbnail-generation": 10,
  "fact-check": 10,
  "platform-formatter": 5,
};
const TEAM_B_WEIGHTS: Record<string, number> = {
  "tb-text-improvement": 70,
  "tb-design-improvement": 20,
  "tb-budget-optimization": 10,
};

type RunKind = "team-a" | "team-b";

interface TrackedRun {
  runId: string;
  jobId: string;
  kind: RunKind;
  status: "running" | "completed" | "error";
  stale: boolean;
  progress: number;
  errorMessage: string | null;
  outputData: unknown;
  recordId: string | null;
}

function progressPath(run: TrackedRun): string {
  return run.kind === "team-a"
    ? `/jobs/${run.jobId}/new-posting/progress`
    : `/jobs/${run.jobId}/rewrite-posting/progress`;
}

export function BackgroundRunIndicator() {
  const pathname = usePathname();
  const router = useRouter();
  const [runs, setRuns] = useState<TrackedRun[]>([]);
  // 「実行中」を観測した run のみ完了トーストを出す(リロード直後の再通知を防ぐ)
  const seenRunningRef = useRef<Set<string>>(new Set());
  const notifiedRef = useRef<Set<string>>(new Set());

  // 進捗ページではページ自身がライブ表示するため非表示
  const onProgressPage = /\/(new-posting|rewrite-posting)\/progress$/.test(pathname ?? "");

  useEffect(() => {
    if (onProgressPage) return;
    let cancelled = false;

    const poll = async () => {
      // sessionStorage から追跡対象の runId を列挙
      const targets: { runId: string; jobId: string; kind: RunKind }[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key) continue;
        const m = key.match(/^team([AB])RunId:(.+)$/);
        if (!m) continue;
        const runId = sessionStorage.getItem(key);
        if (!runId) continue;
        targets.push({ runId, jobId: m[2], kind: m[1] === "A" ? "team-a" : "team-b" });
      }

      const dismissed = getDismissedRuns();
      const active = targets.filter((t) => !dismissed.includes(t.runId));
      if (active.length === 0) {
        if (!cancelled) setRuns([]);
        return;
      }

      const results = await Promise.all(
        active.map(async (t): Promise<TrackedRun | null> => {
          try {
            const res = await fetch(`/api/workflow-runs/${t.runId}`);
            if (!res.ok) return null;
            const run = await res.json();
            const weights = t.kind === "team-a" ? TEAM_A_WEIGHTS : TEAM_B_WEIGHTS;
            const statuses = (run.agentStatuses ?? {}) as Record<string, { status: string }>;
            const total = Object.values(weights).reduce((s, w) => s + w, 0);
            const done = Object.entries(weights)
              .filter(([id]) => statuses[id]?.status === "completed")
              .reduce((s, [, w]) => s + w, 0);
            return {
              runId: t.runId,
              jobId: t.jobId,
              kind: t.kind,
              status: run.status,
              stale: !!run.stale,
              progress: run.status === "completed" ? 100 : Math.round((done / total) * 100),
              errorMessage: run.errorMessage ?? null,
              outputData: run.outputData ?? null,
              recordId: run.recordId ?? null,
            };
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;

      const list = results.filter((r): r is TrackedRun => r !== null);
      for (const r of list) {
        if (r.status === "running" && !r.stale) {
          seenRunningRef.current.add(r.runId);
        }
        if (
          r.status === "completed" &&
          seenRunningRef.current.has(r.runId) &&
          !notifiedRef.current.has(r.runId)
        ) {
          notifiedRef.current.add(r.runId);
          toast.success(
            r.kind === "team-a" ? "求人原稿の生成が完了しました" : "原稿の改善が完了しました"
          );
        }
      }
      setRuns(list);
    };

    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [onProgressPage, pathname]);

  const dismiss = (runId: string) => {
    addDismissedRun(runId);
    setRuns((prev) => prev.filter((r) => r.runId !== runId));
  };

  // 完了結果を出力ページで開く(進捗ページの完了処理と同じキーに保存)
  const openResult = (run: TrackedRun) => {
    try {
      if (run.kind === "team-a") {
        if (run.outputData) sessionStorage.setItem("finalOutput", JSON.stringify(run.outputData));
        if (run.recordId) sessionStorage.setItem("teamARecordId", run.recordId);
        else sessionStorage.removeItem("teamARecordId");
      } else {
        if (run.outputData) sessionStorage.setItem("teamBOutput", JSON.stringify(run.outputData));
        if (run.recordId) sessionStorage.setItem("teamBRecordId", run.recordId);
        else sessionStorage.removeItem("teamBRecordId");
      }
    } catch {
      // 保存に失敗しても遷移は続行(出力ページ側にDBフォールバックあり)
    }
    dismiss(run.runId);
    router.push(
      run.kind === "team-a"
        ? `/jobs/${run.jobId}/new-posting/output`
        : `/jobs/${run.jobId}/rewrite-posting/output`
    );
  };

  if (onProgressPage || runs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      {runs.slice(0, 3).map((run) => {
        const label = run.kind === "team-a" ? "求人原稿を生成中" : "原稿改善を実行中";
        const failed = run.status === "error" || (run.status === "running" && run.stale);

        if (run.status === "completed") {
          return (
            <div
              key={run.runId}
              className="rounded-xl border border-green-200 bg-white shadow-lg p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {run.kind === "team-a" ? "求人原稿の生成が完了しました" : "原稿の改善が完了しました"}
                  </p>
                  <Button size="sm" className="mt-2" onClick={() => openResult(run)}>
                    結果を見る
                  </Button>
                </div>
                <button
                  onClick={() => dismiss(run.runId)}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }

        if (failed) {
          return (
            <div
              key={run.runId}
              className="rounded-xl border border-red-200 bg-white shadow-lg p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {run.kind === "team-a" ? "生成が停止しました" : "改善処理が停止しました"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {run.errorMessage || "サーバー側の処理を確認できませんでした"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => router.push(progressPath(run))}
                  >
                    詳細を確認
                  </Button>
                </div>
                <button
                  onClick={() => dismiss(run.runId)}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }

        return (
          <button
            key={run.runId}
            onClick={() => router.push(progressPath(run))}
            className="block w-full text-left rounded-xl border border-blue-200 bg-white shadow-lg p-4 hover:border-blue-400 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              <p className="text-sm font-medium flex-1">{label}</p>
              <span className="text-sm font-bold text-blue-600">{run.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${run.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">クリックで進捗を表示</p>
          </button>
        );
      })}
    </div>
  );
}
