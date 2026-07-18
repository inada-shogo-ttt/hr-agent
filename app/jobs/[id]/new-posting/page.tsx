"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { JobInputForm } from "@/app/components/forms/JobInputForm";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Loader2, AlertTriangle } from "lucide-react";
import { JobPostingInput } from "@/types/job-posting";

export default function JobNewPostingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const sourceJobId = searchParams.get("source");

  const [loading, setLoading] = useState(!!sourceJobId);
  const [sourceInput, setSourceInput] = useState<JobPostingInput | null>(null);
  const [sourceName, setSourceName] = useState<string>("");
  const [sourceLoadFailed, setSourceLoadFailed] = useState(false);

  // 流用元の入力データをロード
  useEffect(() => {
    if (!sourceJobId) return;

    Promise.all([
      fetch(`/api/jobs/${sourceJobId}/history-context`).then((r) => r.json()),
      fetch(`/api/jobs/${sourceJobId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([history, sourceJob]) => {
        if (history?.latestTeamAInput?.common) {
          setSourceInput(history.latestTeamAInput as JobPostingInput);
        } else {
          setSourceLoadFailed(true);
        }
        if (sourceJob) {
          setSourceName(`${sourceJob.officeName} / ${sourceJob.jobTypeName}`);
        }
      })
      .catch(() => setSourceLoadFailed(true))
      .finally(() => setLoading(false));
  }, [sourceJobId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          流用元の求人データを読み込み中...
        </div>
      </main>
    );
  }

  const isReuse = !!sourceJobId && !!sourceInput;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">
          {isReuse ? "既存求人を流用して原稿を作成" : "新規求人原稿を作成"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isReuse
            ? "流用元の内容をフォームに反映済みです。必要な箇所を修正して原稿を生成してください。"
            : "求人情報を入力してください。AIエージェントが選択した媒体分の原稿を自動生成します。"}
        </p>

        {isReuse && (
          <Card className="mb-6 bg-violet-50 border-violet-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-violet-700">
                <Copy className="w-4 h-4" />
                <span className="font-medium">
                  流用元: {sourceName || "選択した求人"}
                </span>
              </div>
              <p className="text-xs text-violet-600 mt-1">
                事業所名・給与・勤務地など、この求人と異なる項目は必ず修正してください。
              </p>
            </CardContent>
          </Card>
        )}

        {sourceJobId && sourceLoadFailed && (
          <Card className="mb-6 bg-amber-50 border-amber-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">
                  流用元の入力データを取得できなかったため、空のフォームから開始します
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <JobInputForm
          jobId={jobId}
          initialData={sourceInput || undefined}
          reuseSourceJobId={isReuse ? sourceJobId! : undefined}
        />
      </div>
    </main>
  );
}
