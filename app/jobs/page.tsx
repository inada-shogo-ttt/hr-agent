"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Plus, Briefcase, ChevronRight, Trash2 } from "lucide-react";

interface JobWithLatest {
  id: string;
  officeName: string;
  jobTitle: string;
  employmentType: string;
  createdAt: string;
  updatedAt: string;
  records: { type: string; platform: string; createdAt: string }[];
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithLatest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("この求人を削除しますか？関連する全履歴も削除されます。")) return;

    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          ダッシュボードに戻る
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">求人管理</h1>
            <p className="text-muted-foreground">
              登録済みの求人一覧です。求人を選択してTeam A（新規作成）またはTeam B（改善）を実行できます。
            </p>
          </div>
          <Link href="/jobs/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新規求人を登録
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">読み込み中...</p>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                まだ求人が登録されていません。
              </p>
              <Link href="/jobs/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  最初の求人を登録する
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const latest = job.records[0];
              return (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{job.officeName}</span>
                              <Badge variant="outline">{job.employmentType}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{job.jobTitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {latest ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {latest.type === "team-a" ? "Team A" : "Team B"} / {latest.platform}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(latest.createdAt).toLocaleDateString("ja-JP")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">未実行</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => handleDelete(job.id, e)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
