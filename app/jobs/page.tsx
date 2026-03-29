"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronRight } from "lucide-react";
import { JobStatus } from "@/types/auth";

interface JobEntry {
  id: string;
  officeId: string;
  officeName: string;
  jobTypeName: string;
  employmentTypeName: string;
  status: JobStatus;
}

interface OfficeGroup {
  officeId: string;
  officeName: string;
  jobs: JobEntry[];
  jobTypeNames: string[];
  statusCounts: Record<string, number>;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "confirmed", label: "確定済み" },
  { value: "awaiting_republish", label: "再掲載待ち" },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-green-100 text-green-700",
  awaiting_republish: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  confirmed: "確定済み",
  awaiting_republish: "再掲載待ち",
};

export default function JobsPage() {
  const [offices, setOffices] = useState<OfficeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((jobs: JobEntry[]) => {
        // officeId でグループ化
        const groups = new Map<string, OfficeGroup>();
        for (const job of jobs) {
          if (!groups.has(job.officeId)) {
            groups.set(job.officeId, {
              officeId: job.officeId,
              officeName: job.officeName,
              jobs: [],
              jobTypeNames: [],
              statusCounts: {},
            });
          }
          const group = groups.get(job.officeId)!;
          group.jobs.push(job);
          if (!group.jobTypeNames.includes(job.jobTypeName)) {
            group.jobTypeNames.push(job.jobTypeName);
          }
          group.statusCounts[job.status] =
            (group.statusCounts[job.status] || 0) + 1;
        }
        setOffices(Array.from(groups.values()));
        setLoading(false);
      });
  }, []);

  // フィルタ適用
  const filteredOffices =
    statusFilter === "all"
      ? offices
      : offices.filter((o) =>
          o.jobs.some((j) => j.status === statusFilter)
        );

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">求人管理</h1>
            <p className="text-muted-foreground">
              事業所ごとの求人を管理します
            </p>
          </div>
        </div>

        {/* ステータスフィルタ */}
        {offices.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOffices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {offices.length === 0
                  ? "事業所が登録されていません。設定画面から事業所を登録してください。"
                  : "該当する求人がありません。"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOffices.map((office) => (
              <Link
                key={office.officeId}
                href={`/jobs/offices/${office.officeId}`}
              >
                <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="py-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4.5 h-4.5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[15px] truncate">
                          {office.officeName}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 truncate">
                      {office.jobTypeNames.join(" ・ ")}
                    </p>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {Object.entries(office.statusCounts).map(
                        ([status, count]) => (
                          <span
                            key={status}
                            className={`${STATUS_BADGE_STYLES[status] || "bg-gray-100 text-gray-700"} text-[10px] font-medium px-2 py-0.5 rounded`}
                          >
                            {STATUS_LABELS[status] || status} {count}
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                      <span>{office.jobs.length}求人</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
