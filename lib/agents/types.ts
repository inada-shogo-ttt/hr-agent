// エージェント共通の入出力型

import { JobPostingInput } from "@/types/job-posting";
import { AllPlatformPostings } from "@/types/platform";
import { PlatformThumbnails } from "@/lib/nanobanana";
import { ReferencePostingData } from "@/types/reference";
import { PlatformGuidelineMap } from "@/types/platform-guideline";

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

// workflow_complete イベントの data 形状。
// サムネイルアップロードと履歴保存はサーバ側で完了済み(recordId は保存された JobRecord.id)
export interface TeamAWorkflowCompleteData {
  output: AllPlatformPostings;
  recordId: string | null;
  recordSaveError?: string;
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

// Manuscript Writing Agent
// ※ Reference Selection エージェントは廃止。参考原稿(SystemReferencePosting)と
//   媒体設定(PlatformGuideline)を直接注入する
export interface ManuscriptWritingInput {
  jobPostingInput: JobPostingInput;
  managerOutput: ManagerOutput;
  trendAnalysis: TrendAnalysisOutput;
  userReferences?: ReferencePostingData[];
  sharedKnowledge?: string;
  // 媒体別ガイドライン(システム設定)。未指定はコード内デフォルトで動く
  guidelines?: PlatformGuidelineMap;
}

// 選択した媒体のみ生成されるため、各媒体は optional
export interface ManuscriptWritingOutput {
  indeed?: {
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
  airwork?: {
    jobTitle: string;
    catchphrase: string;
    jobDescription: string;
    requirements: string;
    selectionProcess: string;
  };
  jobmedley?: {
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
  hellowork?: {
    jobTitle: string;                   // 全角28字以内
    jobDescription: string;             // 全角360字以内
    // 2024年法改正対応（必須）
    workplaceChange: string;
    jobContentChange: string;
    transferPossibility: string;
    employmentPeriod: string;
    contractRenewal: string;
    wageAmount: string;
    allowances: string;
    commutingAllowance: string;
    bonus: string;
    raise: string;
    salaryClosingDay: string;
    salaryPayDay: string;
    workingHours: string;
    overtime: string;
    breakTime: string;
    holidays: string;
    annualHolidays: string;
    annualLeave: string;
    insurance: string;
    pension: string;
    trialPeriod: string;
    retirementAge: string;
    retirementBenefit: string;
    specialNotes: string;
    requirements: string;
    requiredLicenses: string;
    selectionMethod: string;
    selectionResultDays: string;
    applicationDocuments: string;
    applicationMethodHw: string;
    hiringManagerContact: string;
    remarks: string;
  };
}

// Thumbnail Generation Agent
export interface ThumbnailGenerationInput {
  jobPostingInput: JobPostingInput;
  manuscript: ManuscriptWritingOutput;
  // サムネイル生成対象媒体（indeed / airwork / jobmedley のみ有効）。未指定は3媒体全て
  platforms?: ("indeed" | "airwork" | "jobmedley")[];
}

export interface VisualStyle {
  uniformDescription?: string;
  colorPalette?: string;
  sceneDescription?: string;
}

export interface ThumbnailGenerationOutput {
  platformThumbnails: PlatformThumbnails;
  thumbnailUrls: string[]; // deprecated, 後方互換用
  generationStatus: "success" | "placeholder" | "error";
  message: string;
  visualStyle?: VisualStyle;
}

// Fact Check Agent
export interface FactCheckInput {
  jobPostingInput: JobPostingInput;
  manuscript: ManuscriptWritingOutput;
  // 媒体別ガイドライン(システム設定)。制約条件を検証条件として使う
  guidelines?: PlatformGuidelineMap;
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
  manuscriptWriting: ManuscriptWritingOutput;
  thumbnailGeneration: ThumbnailGenerationOutput;
  factCheck: FactCheckOutput;
  finalOutput: AllPlatformPostings;
}
