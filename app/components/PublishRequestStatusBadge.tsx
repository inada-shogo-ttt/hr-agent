"use client";

import { Badge } from "@/components/ui/badge";
import { PublishRequestStatus } from "@/types/publish-request";

const STATUS_CONFIG: Record<
  PublishRequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "対応待ち",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  publishing: {
    label: "掲載中",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  completed: {
    label: "掲載完了",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  expired: {
    label: "期間満了",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

export function PublishRequestStatusBadge({
  status,
}: {
  status: PublishRequestStatus;
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
