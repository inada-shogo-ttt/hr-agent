"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileText, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";

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
  const [deleteTarget, setDeleteTarget] = useState<ReferencePosting | null>(null);

  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then((data) => {
        setReferences(data);
        setLoading(false);
      });
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/references/${deleteTarget.id}`, { method: "DELETE" });
      setReferences((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success(`「${deleteTarget.title}」を削除しました`);
    } catch {
      toast.error("削除に失敗しました");
    }
    setDeleteTarget(null);
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteTarget(ref);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>参考原稿を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
