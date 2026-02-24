"use client";

import { SSEEvent } from "@/lib/agents/types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface WorkflowTimelineProps {
  events: SSEEvent[];
}

const EVENT_COLORS: Record<SSEEvent["type"], string> = {
  agent_start: "text-blue-600",
  agent_progress: "text-yellow-600",
  agent_complete: "text-green-600",
  agent_error: "text-red-600",
  workflow_complete: "text-purple-600",
  workflow_error: "text-red-700",
};

const EVENT_ICONS: Record<SSEEvent["type"], string> = {
  agent_start: "▶",
  agent_progress: "◎",
  agent_complete: "✓",
  agent_error: "✗",
  workflow_complete: "★",
  workflow_error: "✗",
};

export function WorkflowTimeline({ events }: WorkflowTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        イベントログが表示されます
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
      {events.map((event, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="text-gray-400 shrink-0">
            {new Date(event.timestamp).toLocaleTimeString("ja-JP")}
          </span>
          <span className={`shrink-0 ${EVENT_COLORS[event.type]}`}>
            {EVENT_ICONS[event.type]}
          </span>
          <span className="text-gray-600 shrink-0">[{event.agentId}]</span>
          <span className="text-gray-800">{event.message}</span>
        </div>
      ))}
    </div>
  );
}
