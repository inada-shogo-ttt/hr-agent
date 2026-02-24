// Team B: 再掲載用原稿改善 — 型定義

import { Platform } from "@/types/platform";

// 媒体別の数値指標
export interface IndeedMetrics {
  dailyBudget?: number;
  impressions?: number;
  clicks?: number;
  applicationStarts?: number;
  applications?: number;
  totalBudgetUsed?: number;
  ctr?: number;
  cpc?: number;
  applicationStartRate?: number;
  applicationCompleteRate?: number;
}

export interface AirWorkMetrics {
  impressions?: number;
  clicks?: number;
  applications?: number;
  ctr?: number;
  cpc?: number;
  applicationCompleteRate?: number;
}

// 既存原稿の入力型（全フィールドoptionalでそのまま入力）
export interface ExistingPostingFields {
  // 共通
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  requirements?: string;
  salary?: string;
  workingHours?: string;
  holidays?: string;
  benefits?: string;
  socialInsurance?: string;
  location?: string;
  employmentType?: string;
  numberOfHires?: string;
  selectionProcess?: string;

  // Indeed固有
  catchphrase?: string;
  appealPoints?: string;
  access?: string;
  probationPeriod?: string;
  salaryDescription?: string;
  recruitmentBudget?: string;

  // AirWork固有
  jobCategory?: string;
  jobDescriptionFeatures?: string;
  locationFeatures?: string;
  smokingArea?: string;
  workEnvironment?: string;
  secondmentDestination?: string;
  ageRestriction?: string;
  genderRestriction?: string;
  salaryFeatures?: string;
  salarySupplementary?: string;
  salaryExample?: string;
  workPatternFeatures?: string;
  workTimeSupplementary?: string;
  insuranceExclReason?: string;
  benefitsSupplementary?: string;
  contractRenewalPeriod?: string;
  hasProbationTraining?: string;
  selectionSupplementary?: string;
  interviewLocation?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
  applicantInfo?: string;
  workStyle?: string;

  // JobMedley固有
  appealTitle?: string;
  appealText?: string;
  trainingSystem?: string;
  breakTime?: string;
  serviceType?: string;
  salaryNotes?: string;
  estimatedAnnualIncome?: string;
  longTermHolidays?: string;
  welcomeRequirements?: string;
  employmentTypeAndSalary?: string;

  // サムネイル要望
  thumbnailRequirements?: string;
}

// Team B 入力型
export interface TeamBInput {
  platform: Platform;
  existingPosting: ExistingPostingFields;
  metrics?: IndeedMetrics | AirWorkMetrics;
  thumbnailUrls?: string[];
}

// 改善差分型
export interface ImprovementDiff {
  field: string;
  fieldLabel: string;
  before: string;
  after: string;
  reason: string;
}

// 課題サマリー
export interface IssueSummary {
  category: string;
  description: string;
  severity: "high" | "medium" | "low";
  recommendation: string;
}

// 予算推奨
export interface BudgetRecommendation {
  currentDailyBudget?: number;
  recommendedMin: number;
  recommendedMax: number;
  reasoning: string;
  expectedImpact: string;
}

// Team B 出力型
export interface TeamBOutput {
  platform: Platform;
  issuesSummary: IssueSummary[];
  metricsAnalysis?: string;
  manuscriptAnalysis: string;
  improvements: ImprovementDiff[];
  improvedPosting: ExistingPostingFields;
  thumbnailUrls: string[];
  budgetRecommendation?: BudgetRecommendation;
  generatedAt: string;
}
