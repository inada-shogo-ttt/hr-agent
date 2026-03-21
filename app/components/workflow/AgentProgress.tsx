"use client";

import { AgentId, AgentStatus, SSEEvent } from "@/lib/agents/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Loader2, XCircle, AlertCircle } from "lucide-react";

interface AgentProgressProps {
  events: SSEEvent[];
  agentStatuses: Record<string, { status: AgentStatus; message?: string }>;
}

const AGENT_LABELS: Record<AgentId, string> = {
  manager: "マネージャーエージェント",
  "trend-research": "トレンド調査エージェント",
  "trend-analysis": "トレンド分析エージェント",
  "reference-selection": "参考原稿選定エージェント",
  "manuscript-writing": "原稿執筆エージェント",
  "thumbnail-generation": "サムネイル生成エージェント",
  "fact-check": "ファクトチェックエージェント",
  "platform-formatter": "媒体フォーマッター",
};

const AGENT_DESCRIPTIONS: Record<AgentId, string> = {
  manager: "求人情報の検証・要件整理",
  "trend-research": "Web検索で最新の求人トレンド調査",
  "trend-analysis": "トレンドデータの分析・洞察抽出",
  "reference-selection": "効果的な参考原稿の選定",
  "manuscript-writing": "4媒体分の求人原稿を執筆",
  "thumbnail-generation": "サムネイル画像の自動生成",
  "fact-check": "原稿と募集要項の整合性チェック",
  "platform-formatter": "各媒体フォーマットへの整形",
};

const AGENT_ORDER: AgentId[] = [
  "manager",
  "trend-research",
  "trend-analysis",
  "reference-selection",
  "manuscript-writing",
  "thumbnail-generation",
  "fact-check",
  "platform-formatter",
];

function StatusIcon({ status }: { status: AgentStatus | undefined }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-300" />;
  }
}

function StatusBadge({ status }: { status: AgentStatus | undefined }) {
  switch (status) {
    case "running":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">実行中</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-green-100 text-green-700">完了</Badge>;
    case "error":
      return <Badge variant="destructive">エラー</Badge>;
    default:
      return <Badge variant="outline" className="text-gray-400">待機中</Badge>;
  }
}

export function AgentProgress({ events, agentStatuses }: AgentProgressProps) {
  return (
    <div className="space-y-2">
      {AGENT_ORDER.map((agentId, index) => {
        const status = agentStatuses[agentId]?.status;
        const message = agentStatuses[agentId]?.message;

        return (
          <div
            key={agentId}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-300 ${
              status === "running"
                ? "border-blue-200 bg-blue-50"
                : status === "completed"
                ? "border-green-200 bg-green-50"
                : status === "error"
                ? "border-red-200 bg-red-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            {/* ステップ番号とアイコン */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <StatusIcon status={status} />
                {index < AGENT_ORDER.length - 1 && (
                  <div
                    className={`absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-8 ${
                      status === "completed" ? "bg-green-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{AGENT_LABELS[agentId]}</span>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {AGENT_DESCRIPTIONS[agentId]}
              </p>
              {message && status !== "pending" && (
                <p
                  className={`text-xs mt-1 ${
                    status === "error" ? "text-red-600" : "text-gray-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>

            {/* ステップ番号 */}
            <div className="text-xs text-muted-foreground font-mono">
              {String(index + 1).padStart(2, "0")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
