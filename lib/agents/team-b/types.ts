// Team B エージェント I/O 型

import { ExistingPostingFields, IndeedMetrics, AirWorkMetrics, ImprovementDiff, IssueSummary, BudgetRecommendation } from "@/types/team-b";
import { Platform } from "@/types/platform";
import { AgentStatus } from "@/lib/agents/types";
import { PlatformThumbnails } from "@/lib/nanobanana";
import { ReferencePostingData } from "@/types/reference";

// Team B エージェント識別子
export type TeamBAgentId =
  | "tb-manager"
  | "tb-metrics-analysis"
  | "tb-manuscript-analysis"
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

// Manager Agent
export interface TeamBManagerInput {
  platform: Platform;
  existingPosting: ExistingPostingFields;
  hasMetrics: boolean;
}

export interface TeamBManagerOutput {
  confirmedPlatform: Platform;
  summary: string;
  postingQuality: "good" | "average" | "poor";
  initialObservations: string[];
}

// 数値分析 Agent
export interface MetricsAnalysisInput {
  platform: Platform;
  metrics: IndeedMetrics | AirWorkMetrics;
  existingPosting: ExistingPostingFields;
  historyContext?: unknown[];
  crossJobMemory?: string;
}

export interface MetricsAnalysisOutput {
  summary: string;
  issues: IssueSummary[];
  benchmarks: {
    metric: string;
    current: string;
    benchmark: string;
    status: "above" | "below" | "average";
  }[];
}

// 原稿分析 Agent
export interface ManuscriptAnalysisInput {
  platform: Platform;
  existingPosting: ExistingPostingFields;
  metricsAnalysis?: string;
  metricsIssues?: IssueSummary[];
  historyContext?: unknown[];
  crossJobMemory?: string;
}

export interface ManuscriptAnalysisOutput {
  overallAssessment: string;
  issues: IssueSummary[];
  improvementPriorities: string[];
}

// テキスト改善 Agent
export interface TextImprovementInput {
  platform: Platform;
  existingPosting: ExistingPostingFields;
  manuscriptAnalysis: ManuscriptAnalysisOutput;
  metricsIssues?: IssueSummary[];
  userReferences?: ReferencePostingData[];
  crossJobMemory?: string;
}

export interface TextImprovementOutput {
  improvedPosting: ExistingPostingFields;
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

// 予算最適化 Agent
export interface BudgetOptimizationInput {
  metrics: IndeedMetrics;
  existingPosting: ExistingPostingFields;
  metricsAnalysis: MetricsAnalysisOutput;
}

export interface BudgetOptimizationOutput {
  recommendation: BudgetRecommendation;
}
