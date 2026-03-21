"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Plus, FileText, Trash2 } from "lucide-react";

interface ReferencePosting {
  id: string;
  title: string;
  platform: string;
  industry: string;
  jobType: string;
  performance: string | null;
  createdAt: string;
}

const platformLabels: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
};

export default function ReferencesPage() {
  const [references, setReferences] = useState<ReferencePosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then((data) => {
        setReferences(data);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("この参考原稿を削除しますか？")) return;

    await fetch(`/api/references/${id}`, { method: "DELETE" });
    setReferences((prev) => prev.filter((r) => r.id !== id));
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
            <h1 className="text-2xl font-bold">参考原稿管理</h1>
            <p className="text-muted-foreground">
              応募殺到した求人原稿を登録しておくと、Team A/B が参考にして原稿を作成・改善します。
            </p>
          </div>
          <Link href="/references/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              参考原稿を登録
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">読み込み中...</p>
        ) : references.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                まだ参考原稿が登録されていません。
              </p>
              <Link href="/references/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  最初の参考原稿を登録する
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {references.map((ref) => (
              <Card key={ref.id} className="hover:border-green-300 hover:shadow-md transition-all">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{ref.title}</span>
                          <Badge variant="outline">{platformLabels[ref.platform] || ref.platform}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ref.industry} / {ref.jobType}
                          {ref.performance && <span className="ml-2 text-green-600 font-medium">{ref.performance}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(ref.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                      <button
                        onClick={(e) => handleDelete(ref.id, e)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
