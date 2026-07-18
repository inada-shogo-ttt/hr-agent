"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TeamBOutput } from "@/types/team-b";
import { ImprovementOutput } from "@/app/components/output/ImprovementOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Clock, FileText, CheckCircle } from "lucide-react";

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

  useEffect(() => {
    const stored = sessionStorage.getItem("teamBOutput");
    if (!stored) {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
      return;
    }

    try {
      setOutput(JSON.parse(stored) as TeamBOutput);
    } catch {
      router.replace(`/jobs/${jobId}/rewrite-posting`);
    }
  }, [router, jobId]);

  if (!output) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          読み込み中...
        </div>
      </main>
    );
  }

  const generatedAt = new Date(output.generatedAt).toLocaleString("ja-JP");

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
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
          <div className="flex gap-2">
            <Link href={`/jobs/${jobId}`}>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                求人詳細で原稿を確認・編集
              </Button>
            </Link>
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
                課題: {output.issuesSummary.length}件 / 改善: {output.improvements.length}箇所 / サムネイル: {output.thumbnailUrls?.length ?? 0}枚
              </span>
              {output.budgetRecommendation && (
                <span className="text-blue-600">
                  予算推奨: {output.budgetRecommendation.recommendedMin.toLocaleString()}〜{output.budgetRecommendation.recommendedMax.toLocaleString()}円/日
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600">
              <CheckCircle className="w-3.5 h-3.5" />
              改善内容は求人詳細の原稿に反映済みです。全文の確認・編集は求人詳細ページで行えます。
            </div>
          </CardContent>
        </Card>

        <ImprovementOutput output={output} />
      </div>
    </main>
  );
}
