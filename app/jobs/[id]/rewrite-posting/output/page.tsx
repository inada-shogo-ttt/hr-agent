"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TeamBOutput } from "@/types/team-b";
import { ImprovementOutput } from "@/app/components/output/ImprovementOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, RefreshCw, Clock } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
};

export default function JobTeamBOutputPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [output, setOutput] = useState<TeamBOutput | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("teamBOutput");
    if (!stored) {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as TeamBOutput;
      const storedThumbnails = sessionStorage.getItem("teamBThumbnailUrls");
      if (storedThumbnails) {
        try {
          parsed.thumbnailUrls = JSON.parse(storedThumbnails) as string[];
        } catch { /* ignore */ }
      }
      setOutput(parsed);
    } catch {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
    }
  }, [router, jobId]);

  if (!output) {
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
                {PLATFORM_LABELS[output.platform]}
              </Badge>
              <Badge variant="secondary">{output.improvements.length}箇所改善</Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              生成日時: {generatedAt}
            </div>
          </div>
          <Link href={`/jobs/${jobId}/rewrite-posting`}>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              再度改善する
            </Button>
          </Link>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">
                課題: {output.issuesSummary.length}件 / 改善: {output.improvements.length}箇所 / サムネイル: {output.thumbnailUrls?.length ?? 0}枚
              </span>
              {output.budgetRecommendation && (
                <span className="text-blue-600">
                  予算推奨: {output.budgetRecommendation.recommendedMin.toLocaleString()}〜{output.budgetRecommendation.recommendedMax.toLocaleString()}円/日
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <ImprovementOutput output={output} />
      </div>
    </main>
  );
}
