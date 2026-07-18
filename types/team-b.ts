// Team B: 再掲載用原稿改善 — 型定義

import { Platform } from "@/types/platform";
import { PlatformThumbnails } from "@/lib/nanobanana";

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
  // 掲載期間(YYYY-MM-DD)。日数・日額費用・応募単価は入力から自動算出
  postingStartDate?: string;
  postingEndDate?: string;
  postingDays?: number;
  dailyCost?: number; // 日額費用 = 合計費用 ÷ 掲載日数
  cpa?: number; // 応募単価 = 合計費用 ÷ 応募数
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

  // ハローワーク固有
  companyAddress?: string;
  workLocation?: string;
  smokingPolicy?: string;
  employmentPeriod?: string;
  contractRenewal?: string;
  wageType?: string;
  wageAmount?: string;
  allowances?: string;
  commutingAllowance?: string;
  bonus?: string;
  raise?: string;
  overtime?: string;
  annualLeave?: string;
  insurance?: string;
  pension?: string;
  trialPeriod?: string;
  specialNotes?: string;
  requiredLicenses?: string;
  selectionMethod?: string;
  applicationDocuments?: string;
  selectionNotification?: string;
  remarks?: string;

  // 新規対応フィールド（Team A の入力項目と整合）
  fixedOvertimePay?: string;
  monthlyWorkingHours?: string;
  featureTags?: string;            // カンマ区切り文字列として格納
  shiftIncomeExample?: string;
  seniorStaffMessage?: string;
  workplaceAtmosphere?: string;
  applicationFlow?: string;
  staffVoice?: string;
  representativeName?: string;
  establishmentYear?: string;
  capital?: string;
  businessContent?: string;
  companyFeatures?: string;

  // サムネイル要望
  thumbnailRequirements?: string;
}

// Team B 入力型
export interface TeamBInput {
  platform: Platform;
  existingPosting: ExistingPostingFields;
  metrics?: IndeedMetrics | AirWorkMetrics;
  thumbnailUrls?: string[];
  // サムネイルを再生成するか(未指定は true = 従来挙動)
  generateThumbnails?: boolean;
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
  platformThumbnails?: PlatformThumbnails;
  budgetRecommendation?: BudgetRecommendation;
  // この改善にかかった API 利用実費(円換算・概算)。lib/api-cost.ts で集計
  apiCostYen?: number;
  generatedAt: string;
}
