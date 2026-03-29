"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { JobStatus } from "@/types/auth";

interface StatusEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  comment: string | null;
  createdAt: string;
  user: { name: string; role: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  confirmed: "確定済み",
  awaiting_republish: "再掲載待ち",
  pending: "対応待ち",
  publishing: "掲載中",
  completed: "掲載完了",
  expired: "期間満了",
};

export function StatusTimeline({ jobId }: { jobId: string }) {
  const [entries, setEntries] = useState<StatusEntry[]>([]);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/status-history`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntries);
  }, [jobId]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium">ステータス履歴</h3>
      </div>
      <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />
            <div className="ml-4">
              <div className="flex items-center gap-2 flex-wrap">
                {entry.fromStatus && (
                  <>
                    <span className="text-xs text-gray-500">
                      {STATUS_LABELS[entry.fromStatus] || entry.fromStatus}
                    </span>
                    <span className="text-xs text-gray-400">→</span>
                  </>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {STATUS_LABELS[entry.toStatus] || entry.toStatus}
                </Badge>
                <span className="text-[11px] text-gray-400">
                  {entry.user?.name || "システム"} ・{" "}
                  {formatDistanceToNow(new Date(entry.createdAt), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </span>
              </div>
              {entry.comment && (
                <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded px-2 py-1">
                  {entry.comment}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
