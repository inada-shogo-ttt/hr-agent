"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublishRequestStatusBadge } from "@/app/components/PublishRequestStatusBadge";
import { Upload, Calendar, AlertTriangle } from "lucide-react";
import { PublishRequestStatus } from "@/types/publish-request";

interface PublishRequestEntry {
  id: string;
  jobId: string;
  platform: string;
  status: PublishRequestStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  officeName: string;
  jobTypeName: string;
  jobTypeColor: string;
  employmentTypeName: string;
  modificationPending: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "対応待ち" },
  { value: "publishing", label: "掲載中" },
  { value: "completed", label: "掲載完了" },
  { value: "expired", label: "期間満了" },
];

export default function PublishDashboard() {
  const [requests, setRequests] = useState<PublishRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/publish-requests")
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load publish requests:", err);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-gray-500 text-center">読み込み中...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">掲載管理</h1>
          <p className="text-muted-foreground">
            あなた宛ての掲載依頼を管理します
          </p>
        </div>

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
              {f.value !== "all" && (
                <span className="ml-1 opacity-60">
                  {requests.filter((r) =>
                    f.value === "all" ? true : r.status === f.value
                  ).length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {requests.length === 0
                  ? "掲載依頼はありません"
                  : "該当する依頼はありません"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((req) => (
              <Link key={req.id} href={`/publish/${req.id}`}>
                <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: req.jobTypeColor }}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {req.officeName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {req.jobTypeName} / {req.employmentTypeName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100">
                              {PLATFORM_LABELS[req.platform] || req.platform}
                            </span>
                            <PublishRequestStatusBadge status={req.status} />
                            {req.modificationPending && (
                              <span className="flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                修正依頼
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {req.startDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {req.startDate}
                            {req.endDate ? ` ~ ${req.endDate}` : ""}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">
                          {new Date(req.createdAt).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
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
