"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Zap, RefreshCw, FileText, BarChart3, Clock } from "lucide-react";

interface JobRecord {
  id: string;
  type: string;
  platform: string;
  createdAt: string;
  metricsData: string | null;
  outputData: string | null;
}

interface JobDetail {
  id: string;
  officeName: string;
  jobTitle: string;
  employmentType: string;
  createdAt: string;
  records: JobRecord[];
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setJob)
      .catch(() => router.replace("/jobs"))
      .finally(() => setLoading(false));
  }, [jobId, router]);

  if (loading || !job) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </main>
    );
  }

  const hasTeamARecord = job.records.some((r) => r.type === "team-a");
  const teamARecords = job.records.filter((r) => r.type === "team-a");
  const teamBRecords = job.records.filter((r) => r.type === "team-b");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          求人一覧に戻る
        </Link>

        {/* 求人ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{job.officeName}</h1>
            <Badge variant="outline">{job.employmentType}</Badge>
          </div>
          <p className="text-lg text-muted-foreground">{job.jobTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">
            登録日: {new Date(job.createdAt).toLocaleDateString("ja-JP")} / ID: {job.id}
          </p>
        </div>

        {/* アクションボタン */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">Team A: 新規原稿作成</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AIが3媒体分の求人原稿を自動生成します。
              </p>
              <Link href={`/jobs/${jobId}/new-posting`}>
                <Button className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  原稿を作成する
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className={`border-2 ${hasTeamARecord ? "border-orange-200 bg-orange-50/50" : "border-gray-200 bg-gray-50"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-orange-600" />
                <span className="font-semibold">Team B: 原稿改善</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {hasTeamARecord
                  ? "前回の原稿を基に、数値分析と改善提案を行います。"
                  : "まずTeam Aで原稿を作成してください。"}
              </p>
              <Link href={hasTeamARecord ? `/jobs/${jobId}/rewrite-posting` : "#"}>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!hasTeamARecord}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  原稿を改善する
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 履歴タイムライン */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              実行履歴（{job.records.length}件）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.records.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                まだ実行履歴がありません。Team Aで原稿を作成してください。
              </p>
            ) : (
              <div className="space-y-3">
                {job.records.map((record, index) => {
                  const isTeamA = record.type === "team-a";

                  return (
                    <div
                      key={record.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border ${
                        isTeamA
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-orange-200 bg-orange-50/50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: isTeamA ? "#dbeafe" : "#ffedd5" }}>
                        {isTeamA ? (
                          <FileText className="w-4 h-4 text-blue-600" />
                        ) : (
                          <BarChart3 className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={isTeamA ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}>
                            {isTeamA ? "Team A: 新規作成" : "Team B: 改善"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {record.platform}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(record.createdAt).toLocaleString("ja-JP")}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        #{job.records.length - index}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
