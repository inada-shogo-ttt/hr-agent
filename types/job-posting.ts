// 共通の求人情報入力型

export type EmploymentType =
  | "正社員"
  | "パート・アルバイト"
  | "契約社員"
  | "派遣社員"
  | "業務委託"
  | "インターン";

export type Prefecture =
  | "北海道" | "青森県" | "岩手県" | "宮城県" | "秋田県" | "山形県" | "福島県"
  | "茨城県" | "栃木県" | "群馬県" | "埼玉県" | "千葉県" | "東京都" | "神奈川県"
  | "新潟県" | "富山県" | "石川県" | "福井県" | "山梨県" | "長野県"
  | "岐阜県" | "静岡県" | "愛知県" | "三重県"
  | "滋賀県" | "京都府" | "大阪府" | "兵庫県" | "奈良県" | "和歌山県"
  | "鳥取県" | "島根県" | "岡山県" | "広島県" | "山口県"
  | "徳島県" | "香川県" | "愛媛県" | "高知県"
  | "福岡県" | "佐賀県" | "長崎県" | "熊本県" | "大分県" | "宮崎県" | "鹿児島県" | "沖縄県";

// 共通入力フォームの基本型
export interface CommonJobInfo {
  // 会社基本情報
  companyName: string;
  industry: string;
  companyDescription?: string;

  // 職種情報
  jobTitle: string;
  employmentType: EmploymentType;
  numberOfHires?: number;

  // 勤務地
  prefecture: Prefecture;
  city: string;
  address?: string;
  nearestStation?: string;
  accessFromStation?: string;

  // 給与
  salaryMin: number;
  salaryMax?: number;
  salaryType: "時給" | "日給" | "月給" | "年収";
  salaryDescription?: string;

  // 勤務時間
  workingHours: string;
  workingHoursDescription?: string;

  // 仕事内容
  jobDescription: string;

  // 求める人材
  requirements: string;
  welcomeRequirements?: string;

  // 休暇・休日
  holidays: string;

  // 待遇・福利厚生
  benefits: string;

  // 社会保険
  socialInsurance: string[];

  // 試用期間
  probationPeriod?: string;

  // 選考情報
  selectionProcess?: string;

  // 採用担当者メモ（AI向け）
  appealPoints?: string;
  targetAudience?: string;
  competitiveAdvantage?: string;
}

// Indeed固有の追加情報
export interface IndeedSpecificInfo {
  catchphrase?: string;
  recruitmentBudget?: number;
  thumbnailRequirements?: string;
}

// AirWork固有の追加情報
export interface AirWorkSpecificInfo {
  catchphrase?: string;
  workStyle?: "在宅可" | "完全在宅" | "出社必須" | "ハイブリッド";
  thumbnailRequirements?: string;
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
}

// JobMedley固有の追加情報
export interface JobMedleySpecificInfo {
  appealTitle?: string;
  appealText?: string;
  trainingSystem?: string;
  breakTime?: string;
  serviceType?: string;
  salaryNotes?: string;
  estimatedAnnualIncome?: string;
  longTermHolidays?: string;
}

// 完全な入力フォームの型
export interface JobPostingInput {
  common: CommonJobInfo;
  indeed?: IndeedSpecificInfo;
  airwork?: AirWorkSpecificInfo;
  jobmedley?: JobMedleySpecificInfo;
}
