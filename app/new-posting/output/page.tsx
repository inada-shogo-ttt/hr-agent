"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AllPlatformPostings } from "@/types/platform";
import { ManuscriptOutput } from "@/app/components/output/ManuscriptOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Plus, Clock } from "lucide-react";

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

      // サムネイルは別キーに保存されているため、3箇所すべてに復元する
      const storedThumbnails = sessionStorage.getItem("thumbnailUrls");
      if (storedThumbnails) {
        try {
          const urls = JSON.parse(storedThumbnails) as string[];
          parsed.thumbnailUrls = urls;
          if (parsed.indeed) parsed.indeed.thumbnailUrls = urls;
          if (parsed.airwork) parsed.airwork.thumbnailUrls = urls;
        } catch {
          // パース失敗時は空配列のまま
        }
      }

      setOutput(parsed);
    } catch {
      router.replace("/new-posting");
    }
  }, [router]);

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
        {/* パンくず */}
        <Link
          href="/new-posting"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          求人情報入力に戻る
        </Link>

        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">求人原稿 完成</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                3媒体対応
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
                サムネイル画像: {output.thumbnailUrls?.length ?? 0}枚生成済み
              </span>
              <div className="flex gap-3 text-muted-foreground">
                <span>Indeed / AirWork / JobMedley に対応</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 原稿出力（タブ切替） */}
        <ManuscriptOutput output={output} />
      </div>
    </main>
  );
}
