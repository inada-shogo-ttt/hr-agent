"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AllPlatformPostings } from "@/types/platform";
import { ManuscriptOutput } from "@/app/components/output/ManuscriptOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Clock } from "lucide-react";
import { loadThumbnails } from "@/lib/thumbnail-store";

export default function OutputPage() {
  const router = useRouter();
  const [output, setOutput] = useState<AllPlatformPostings | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("finalOutput");
    if (!stored) {
      router.replace("/new-posting");
      return;
    }

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
      }).catch(() => {
        setOutput(parsed);
      });
    } catch {
      router.replace("/new-posting");
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
          <Link href="/new-posting">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              新規原稿を作成
            </Button>
          </Link>
        </div>

        {/* サムネイル枚数サマリー */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">
                サムネイル画像: Indeed {output.indeed?.thumbnailUrls?.length ?? 0}枚 / AirWork {output.airwork?.thumbnailUrls?.length ?? 0}枚 / JobMedley {output.jobmedley?.thumbnailUrls?.length ?? 0}枚
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 原稿出力（タブ切替） */}
        <ManuscriptOutput output={output} />
      </div>
    </main>
  );
}
