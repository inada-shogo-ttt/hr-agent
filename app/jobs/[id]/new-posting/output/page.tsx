"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AllPlatformPostings } from "@/types/platform";
import { ManuscriptOutput } from "@/app/components/output/ManuscriptOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, RefreshCw, Clock, Save } from "lucide-react";
import { loadThumbnails } from "@/lib/thumbnail-store";

export default function JobOutputPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [output, setOutput] = useState<AllPlatformPostings | null>(null);
  const [editedOutput, setEditedOutput] = useState<AllPlatformPostings | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const stored = sessionStorage.getItem("finalOutput");
    if (!stored) {
      router.replace(`/jobs/${jobId}/new-posting`);
      return;
    }

    const storedRecordId = sessionStorage.getItem("teamARecordId");
    if (storedRecordId) setRecordId(storedRecordId);

    try {
      const parsed = JSON.parse(stored) as AllPlatformPostings;

      // IndexedDB から媒体別サムネイルを読み込み
      Promise.all([
        loadThumbnails("teamA-indeed"),
        loadThumbnails("teamA-airwork"),
        loadThumbnails("teamA-jobmedley"),
      ]).then(([indeedUrls, airworkUrls, jobmedleyUrls]) => {
        if (parsed.indeed) parsed.indeed.thumbnailUrls = indeedUrls;
        if (parsed.airwork) parsed.airwork.thumbnailUrls = airworkUrls;
        if (parsed.jobmedley) parsed.jobmedley.thumbnailUrls = jobmedleyUrls;
        parsed.thumbnailUrls = [...indeedUrls, ...airworkUrls, ...jobmedleyUrls];
        setOutput({ ...parsed });
        setEditedOutput({ ...parsed });
      }).catch(() => {
        setOutput(parsed);
        setEditedOutput(parsed);
      });
    } catch {
      router.replace(`/jobs/${jobId}/new-posting`);
    }
  }, [router, jobId]);

  const handleSave = async () => {
    if (!editedOutput || !recordId) return;
    setSaveStatus("saving");
    try {
      await fetch(`/api/jobs/${jobId}/records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputData: editedOutput }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to save:", err);
      setSaveStatus("idle");
    }
  };

  if (!output || !editedOutput) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </main>
    );
  }

  const generatedAt = new Date(output.generatedAt).toLocaleString("ja-JP");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href={`/jobs/${jobId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          求人詳細に戻る
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">求人原稿 完成</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                4媒体対応
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              生成日時: {generatedAt}
            </div>
          </div>
          <div className="flex gap-2">
            {recordId && (
              <Button
                onClick={handleSave}
                variant="default"
                disabled={saveStatus === "saving"}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveStatus === "saving" ? "保存中..." : saveStatus === "saved" ? "保存しました" : "保存"}
              </Button>
            )}
            <Link href={`/jobs/${jobId}/rewrite-posting`}>
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                この原稿を改善する
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">
                サムネイル画像: インディード {editedOutput.indeed?.thumbnailUrls?.length ?? 0}枚 / エアワーク {editedOutput.airwork?.thumbnailUrls?.length ?? 0}枚 / ジョブメドレー {editedOutput.jobmedley?.thumbnailUrls?.length ?? 0}枚
              </span>
            </div>
          </CardContent>
        </Card>

        <ManuscriptOutput
          output={editedOutput}
          editable={true}
          onOutputChange={setEditedOutput}
        />
      </div>
    </main>
  );
}
