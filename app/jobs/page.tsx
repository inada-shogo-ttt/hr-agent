"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Building2, Plus, Search,
} from "lucide-react";

interface JobEntry {
  id: string;
  officeId: string;
  officeName: string;
  jobTypeName: string;
  employmentTypeName: string;
  updatedAt: string;
  records: { type: string; platform: string; createdAt: string }[];
}

interface OfficeGroup {
  officeId: string;
  officeName: string;
  jobs: JobEntry[];
  jobTypeCounts: { name: string; count: number }[];
  manuscriptCount: number;
  platforms: string[];
  lastUpdatedAt: string;
}

type SortKey = "name" | "jobCount" | "manuscript" | "updatedAt";

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
  all: "全媒体",
};

export default function JobsPage() {
  const router = useRouter();
  const [offices, setOffices] = useState<OfficeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [createOfficeId, setCreateOfficeId] = useState("");

  useEffect(() => {
    fetch("/api/jobs")
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok || !Array.isArray(body)) {
          throw new Error(
            body?.error === "Unauthorized"
              ? "認証情報が確認できませんでした。ユーザーに組織（orgId）が設定されているか確認してください。"
              : body?.error || `求人一覧の取得に失敗しました (${r.status})`
          );
        }
        return body as JobEntry[];
      })
      .then((jobs) => {
        // officeId でグループ化
        const groups = new Map<string, OfficeGroup>();
        for (const job of jobs) {
          if (!groups.has(job.officeId)) {
            groups.set(job.officeId, {
              officeId: job.officeId,
              officeName: job.officeName,
              jobs: [],
              jobTypeCounts: [],
              manuscriptCount: 0,
              platforms: [],
              lastUpdatedAt: "",
            });
          }
          const group = groups.get(job.officeId)!;
          group.jobs.push(job);
          const jt = group.jobTypeCounts.find((t) => t.name === job.jobTypeName);
          if (jt) {
            jt.count += 1;
          } else {
            group.jobTypeCounts.push({ name: job.jobTypeName, count: 1 });
          }
          if (job.records?.length > 0) {
            group.manuscriptCount += 1;
            const platform = job.records[0].platform;
            if (platform && !group.platforms.includes(platform)) {
              group.platforms.push(platform);
            }
          }
          if (job.updatedAt && job.updatedAt > group.lastUpdatedAt) {
            group.lastUpdatedAt = job.updatedAt;
          }
        }
        for (const group of groups.values()) {
          group.jobTypeCounts.sort((a, b) => b.count - a.count);
        }
        setOffices(Array.from(groups.values()));
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? offices.filter(
          (o) =>
            o.officeName.toLowerCase().includes(q) ||
            o.jobTypeCounts.some((t) => t.name.toLowerCase().includes(q))
        )
      : offices;

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.officeName.localeCompare(b.officeName, "ja") * dir;
        case "jobCount":
          return (a.jobs.length - b.jobs.length) * dir;
        case "manuscript":
          return (
            (a.jobs.length - a.manuscriptCount -
              (b.jobs.length - b.manuscriptCount)) * dir
          );
        case "updatedAt":
          return (
            (new Date(a.lastUpdatedAt).getTime() || 0) -
            (new Date(b.lastUpdatedAt).getTime() || 0)
          ) * dir;
      }
    });
  }, [offices, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function sortableHead(label: string, key: SortKey, className?: string) {
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {label}
          {sortKey === key ? (
            sortDir === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
          )}
        </button>
      </TableHead>
    );
  }

  function formatDate(iso: string) {
    if (!iso) return "−";
    return new Date(iso).toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">求人管理</h1>
            <p className="text-muted-foreground">
              事業所ごとの求人を管理します
            </p>
          </div>
          {!loading && !error && offices.length > 0 && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              新規求人作成
            </Button>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-9 bg-gray-100 rounded-md w-72" />
            <div className="border rounded-lg divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-6 px-4 py-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-12" />
                  <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : offices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">
                事業所が登録されていません。設定画面から事業所を登録してください。
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="relative w-72 mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="事業所名・職種で検索"
                className="pl-9"
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    {sortableHead("事業所", "name", "px-4 text-xs text-gray-500")}
                    <TableHead className="px-4 text-xs text-gray-500">
                      職種
                    </TableHead>
                    {sortableHead("求人数", "jobCount", "px-4 text-xs text-gray-500 text-right [&>button]:justify-end")}
                    {sortableHead("原稿", "manuscript", "px-4 text-xs text-gray-500")}
                    <TableHead className="px-4 text-xs text-gray-500">
                      媒体
                    </TableHead>
                    {sortableHead("更新日", "updatedAt", "px-4 text-xs text-gray-500")}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        該当する事業所がありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((office) => (
                      <TableRow
                        key={office.officeId}
                        onClick={() =>
                          router.push(`/jobs/offices/${office.officeId}`)
                        }
                        className="cursor-pointer transition-[background-color,box-shadow] duration-200 ease-out hover:bg-primary/5 hover:shadow-[inset_3px_0_0_0_var(--color-primary)]"
                      >
                        <TableCell className="px-4 py-3.5 font-semibold">
                          {office.officeName}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {office.jobTypeCounts.slice(0, 2).map((t) => (
                              <span
                                key={t.name}
                                className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-[11px]"
                              >
                                {t.name} <b>{t.count}</b>
                              </span>
                            ))}
                            {office.jobTypeCounts.length > 2 && (
                              <span className="text-[11px] text-gray-400">
                                ほか{office.jobTypeCounts.length - 2}職種
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right tabular-nums">
                          {office.jobs.length}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              office.manuscriptCount === office.jobs.length
                                ? "bg-green-50 text-green-600"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {office.manuscriptCount}/{office.jobs.length}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          {office.platforms.length === 0 ? (
                            <span className="text-gray-300">−</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              {office.platforms.map((p) => (
                                <span
                                  key={p}
                                  className="border rounded px-1.5 py-0.5 text-[10px] text-gray-600"
                                >
                                  {PLATFORM_LABELS[p] || p}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-xs text-gray-500">
                          {formatDate(office.lastUpdatedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* 新規求人作成ダイアログ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規求人作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>事業所</Label>
              <Select value={createOfficeId} onValueChange={setCreateOfficeId}>
                <SelectTrigger>
                  <SelectValue placeholder="事業所を選択" />
                </SelectTrigger>
                <SelectContent>
                  {[...offices]
                    .sort((a, b) =>
                      a.officeName.localeCompare(b.officeName, "ja")
                    )
                    .map((o) => (
                      <SelectItem key={o.officeId} value={o.officeId}>
                        {o.officeName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!createOfficeId}
              onClick={() =>
                router.push(`/jobs/offices/${createOfficeId}?add=1`)
              }
            >
              この事業所で求人を追加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
