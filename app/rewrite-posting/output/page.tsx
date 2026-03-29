"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TeamBOutput, ExistingPostingFields } from "@/types/team-b";
import { ImprovementOutput } from "@/app/components/output/ImprovementOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Clock } from "lucide-react";
import { loadThumbnails } from "@/lib/thumbnail-store";

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
};

export default function TeamBOutputPage() {
  const router = useRouter();
  const [output, setOutput] = useState<TeamBOutput | null>(null);
  const [originalPosting, setOriginalPosting] = useState<ExistingPostingFields>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("teamBOutput");
    if (!stored) {
      router.replace("/rewrite-posting");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as TeamBOutput;

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
      }).catch(() => {
        setOutput(parsed);
      });
    } catch {
      router.replace("/rewrite-posting");
    }
  }, [router]);

  if (!output) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          読み込み中...
        </div>
      </main>
    );
  }

  const generatedAt = new Date(output.generatedAt).toLocaleString("ja-JP");

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">原稿改善 完成</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                {PLATFORM_LABELS[output.platform]}
              </Badge>
              <Badge variant="secondary">
                {output.improvements.length}箇所改善
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              生成日時: {generatedAt}
            </div>
          </div>
          <Link href="/rewrite-posting">
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              別の原稿を改善
            </Button>
          </Link>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">
                課題: {output.issuesSummary.length}件検出 / 改善: {output.improvements.length}箇所 / サムネイル: {output.thumbnailUrls?.length ?? 0}枚
              </span>
              {output.budgetRecommendation && (
                <span className="text-blue-600">
                  予算推奨: {output.budgetRecommendation.recommendedMin.toLocaleString()}〜{output.budgetRecommendation.recommendedMax.toLocaleString()}円/日
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <ImprovementOutput output={output} originalPosting={originalPosting} />
      </div>
    </main>
  );
}
