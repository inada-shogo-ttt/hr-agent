// エージェント共通の入出力型

import { JobPostingInput } from "@/types/job-posting";
import { AllPlatformPostings } from "@/types/platform";

// エージェントの状態
export type AgentStatus = "pending" | "running" | "completed" | "error";

// エージェント識別子
export type AgentId =
  | "manager"
  | "trend-research"
  | "trend-analysis"
  | "reference-selection"
  | "manuscript-writing"
  | "thumbnail-generation"
  | "fact-check"
  | "platform-formatter";

// SSEイベント型
export interface SSEEvent {
  type: "agent_start" | "agent_progress" | "agent_complete" | "agent_error" | "workflow_complete" | "workflow_error";
  agentId: AgentId;
  message: string;
  data?: unknown;
  timestamp: string;
}

// ワークフロー進捗
export interface WorkflowProgress {
  agents: Record<AgentId, {
    status: AgentStatus;
    message?: string;
    startedAt?: string;
    completedAt?: string;
  }>;
  overallStatus: "running" | "completed" | "error";
}

// Manager Agent
export interface ManagerInput {
  jobPostingInput: JobPostingInput;
}

export interface ManagerOutput {
  isValid: boolean;
  issues: string[];
  summary: string;
  requirements: {
    industry: string;
    jobCategory: string;
    targetAudience: string;
    keySellingPoints: string[];
    competitiveFactors: string[];
  };
}

// Trend Research Agent
export interface TrendResearchInput {
  industry: string;
  jobCategory: string;
  prefecture: string;
  employmentType: string;
}

export interface TrendResearchResult {
  searchQuery: string;
  findings: string;
  topTitles: string[];
  popularKeywords: string[];
  salaryRange: string;
  trendingBenefits: string[];
}

export interface TrendResearchOutput {
  results: TrendResearchResult[];
  summary: string;
}

// Trend Analysis Agent
export interface TrendAnalysisInput {
  trendResearch: TrendResearchOutput;
  jobPostingInput: JobPostingInput;
}

export interface TrendAnalysisOutput {
  popularityFactors: string[];
  recommendedKeywords: string[];
  recommendedCatchphrases: string[];
  titlePatterns: string[];
  differentiationPoints: string[];
  targetAudienceInsights: string;
}

// Reference Selection Agent
export interface ReferenceSelectionInput {
  trendAnalysis: TrendAnalysisOutput;
  jobPostingInput: JobPostingInput;
}

export interface ReferenceExample {
  platform: string;
  title: string;
  catchphrase: string;
  appealPoints: string;
  structure: string;
  whyEffective: string;
}

export interface ReferenceSelectionOutput {
  selectedReferences: ReferenceExample[];
  writingGuidelines: string;
  toneAndStyle: string;
}

// Manuscript Writing Agent
export interface ManuscriptWritingInput {
  jobPostingInput: JobPostingInput;
  managerOutput: ManagerOutput;
  trendAnalysis: TrendAnalysisOutput;
  referenceSelection: ReferenceSelectionOutput;
}

export interface ManuscriptWritingOutput {
  indeed: {
    jobTitle: string;
    catchphrase: string;
    jobDescription: string;
    appealPoints: string;
    requirements: string;
    holidays: string;
    benefits: string;
    access: string;
    socialInsurance: string;
    probationPeriod?: string;
  };
  airwork: {
    jobTitle: string;
    catchphrase: string;
    jobDescription: string;
    requirements: string;
    selectionProcess: string;
  };
  jobmedley: {
    appealTitle: string;
    appealText: string;
    jobDescription: string;
    employmentTypeAndSalary: string;
    trainingSystem: string;
    workingHours: string;
    requirements: string;
    welcomeRequirements: string;
    access: string;
    selectionProcess: string;
  };
}

// Thumbnail Generation Agent
export interface ThumbnailGenerationInput {
  jobPostingInput: JobPostingInput;
  manuscript: ManuscriptWritingOutput;
}

export interface ThumbnailGenerationOutput {
  thumbnailUrls: string[];
  generationStatus: "success" | "placeholder" | "error";
  message: string;
}

// Fact Check Agent
export interface FactCheckInput {
  jobPostingInput: JobPostingInput;
  manuscript: ManuscriptWritingOutput;
}

export interface FactCheckIssue {
  field: string;
  issue: string;
  originalText: string;
  correctedText: string;
  severity: "critical" | "warning" | "info";
}

export interface FactCheckOutput {
  issues: FactCheckIssue[];
  correctedManuscript: ManuscriptWritingOutput;
  isClean: boolean;
  summary: string;
}

// 全エージェントの出力をまとめた型
export interface WorkflowResult {
  managerOutput: ManagerOutput;
  trendResearch: TrendResearchOutput;
  trendAnalysis: TrendAnalysisOutput;
  referenceSelection: ReferenceSelectionOutput;
  manuscriptWriting: ManuscriptWritingOutput;
  thumbnailGeneration: ThumbnailGenerationOutput;
  factCheck: FactCheckOutput;
  finalOutput: AllPlatformPostings;
}
