// Team B エージェント I/O 型

import { ExistingPostingFields, IndeedMetrics, AirWorkMetrics, ImprovementDiff, IssueSummary, BudgetRecommendation } from "@/types/team-b";
import { Platform } from "@/types/platform";
import { PlatformThumbnails } from "@/lib/nanobanana";
import { ReferencePostingData } from "@/types/reference";
import { PlatformGuideline } from "@/types/platform-guideline";

// Team B エージェント識別子
// 旧: tb-manager / tb-metrics-analysis / tb-manuscript-analysis は tb-text-improvement に統合済み
export type TeamBAgentId =
  | "tb-text-improvement"
  | "tb-design-improvement"
  | "tb-budget-optimization";

// SSEイベント型（Team B）
export interface TeamBSSEEvent {
  type: "agent_start" | "agent_progress" | "agent_complete" | "agent_error" | "workflow_complete" | "workflow_error";
  agentId: TeamBAgentId;
  message: string;
  data?: unknown;
  timestamp: string;
}

// 統合テキスト改善 Agent（旧 Manager + MetricsAnalysis + ManuscriptAnalysis + TextImprovement）
export interface TextImprovementInput {
  platform: Platform;
  existingPosting: ExistingPostingFields;
  metrics?: IndeedMetrics | AirWorkMetrics;
  previousMetrics?: Record<string, number> | null;
  userReferences?: ReferencePostingData[];
  historyContext?: unknown[];
  crossJobMemory?: string;
  sharedKnowledge?: string;
  // 媒体別ガイドライン(システム設定)。未指定はコード内デフォルトで動く
  guideline?: PlatformGuideline;
}

export interface TextImprovementOutput {
  // メトリクスありのときのみ。数値の総合所見（ベンチマーク比較込み）
  metricsSummary?: string;
  // 原稿の定性的な総合評価
  overallAssessment: string;
  // 課題リスト（数値・原稿を統合）
  issues: IssueSummary[];
  // 変更したフィールドのみ
  improvedPosting: Partial<ExistingPostingFields>;
  improvements: ImprovementDiff[];
}

// デザイン改善 Agent
export interface DesignImprovementInput {
  platform: Platform;
  existingPosting: ExistingPostingFields;
  improvedPosting: ExistingPostingFields;
  historyContext?: unknown[];
  visualStyle?: {
    uniformDescription?: string;
    colorPalette?: string;
    sceneDescription?: string;
  };
}

export interface DesignImprovementOutput {
  platformThumbnails: PlatformThumbnails;
  thumbnailUrls: string[]; // deprecated, 後方互換用
  generationStatus: "success" | "placeholder" | "error";
  message: string;
}

// 予算最適化 Agent（Indeed専用）
export interface BudgetOptimizationInput {
  metrics: IndeedMetrics;
  existingPosting: ExistingPostingFields;
  // text-improvement が出す総合所見（参考情報として使用）
  metricsSummary?: string;
}

export interface BudgetOptimizationOutput {
  recommendation: BudgetRecommendation;
}
