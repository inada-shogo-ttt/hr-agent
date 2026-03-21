"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TeamBOutput, ExistingPostingFields } from "@/types/team-b";
import { ImprovementOutput } from "@/app/components/output/ImprovementOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, RefreshCw, Clock, Save } from "lucide-react";
import { loadThumbnails } from "@/lib/thumbnail-store";

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "インディード",
  airwork: "エアワーク",
  jobmedley: "ジョブメドレー",
  hellowork: "ハローワーク",
};

export default function JobTeamBOutputPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [output, setOutput] = useState<TeamBOutput | null>(null);
  const [editedOutput, setEditedOutput] = useState<TeamBOutput | null>(null);
  const [originalPosting, setOriginalPosting] = useState<ExistingPostingFields>({});
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    const stored = sessionStorage.getItem("teamBOutput");
    if (!stored) {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
      return;
    }

    const storedRecordId = sessionStorage.getItem("teamBRecordId");
    if (storedRecordId) setRecordId(storedRecordId);

    try {
      const parsed = JSON.parse(stored) as TeamBOutput;

      // 元の原稿を取得
      const inputStr = sessionStorage.getItem("teamBInput");
      if (inputStr) {
        try {
          const inputData = JSON.parse(inputStr);
          setOriginalPosting(inputData.existingPosting || {});
        } catch { /* ignore */ }
      }

      // IndexedDB から媒体別サムネイルを読み込み
      loadThumbnails(`teamB-${parsed.platform}`).then((urls) => {
        if (urls.length > 0) {
          parsed.thumbnailUrls = urls;
        }
        setOutput({ ...parsed });
        setEditedOutput({ ...parsed });
      }).catch(() => {
        setOutput(parsed);
        setEditedOutput(parsed);
      });
    } catch {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
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
              <h1 className="text-2xl font-bold">原稿改善 完成</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                {PLATFORM_LABELS[editedOutput.platform]}
              </Badge>
              <Badge variant="secondary">{editedOutput.improvements.length}箇所改善</Badge>
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
                再度改善する
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">
                課題: {editedOutput.issuesSummary.length}件 / 改善: {editedOutput.improvements.length}箇所 / サムネイル: {editedOutput.thumbnailUrls?.length ?? 0}枚
              </span>
              {editedOutput.budgetRecommendation && (
                <span className="text-blue-600">
                  予算推奨: {editedOutput.budgetRecommendation.recommendedMin.toLocaleString()}〜{editedOutput.budgetRecommendation.recommendedMax.toLocaleString()}円/日
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <ImprovementOutput
          output={editedOutput}
          originalPosting={originalPosting}
          editable={true}
          onOutputChange={setEditedOutput}
        />
      </div>
    </main>
  );
}
