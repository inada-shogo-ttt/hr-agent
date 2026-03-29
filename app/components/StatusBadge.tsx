"use client";

import { Badge } from "@/components/ui/badge";
import { JobStatus } from "@/types/auth";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "下書き",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  confirmed: {
    label: "確定済み",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  awaiting_republish: {
    label: "再掲載待ち",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
