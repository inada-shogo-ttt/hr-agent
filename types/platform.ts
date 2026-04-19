// 各媒体の出力フォーマット型

import { PlatformThumbnails } from "@/lib/nanobanana";

// Indeed 出力型
export interface IndeedPosting {
  // 必須フィールド
  companyName: string;
  postalCode?: string;                // 必須（運用素材）
  jobTitle: string;
  catchphrase: string;
  numberOfHires: string;
  location: string;
  employmentType: string;
  salary: string;
  salaryDisplayType?: string;         // 範囲/下限/固定（必須）
  workingHours: string;
  socialInsurance: string;
  probationPeriod?: string;
  fixedOvertimePay?: string;          // 例: 「あり 月30時間分30,000円（超過分は別途支給）」
  monthlyWorkingHours?: string;       // 例: 「月平均160時間」
  smokingPolicy?: string;             // 例: 「屋内全面禁煙」
  // 採用担当者・連絡先（必須）
  hiringManagerName?: string;
  contactPhone?: string;
  contactEmail?: string;
  // 応募経路（必須）
  applicationMethod?: string;
  applicationUrl?: string;
  screeningQuestions?: string[];

  // 本文フィールド
  jobDescription: string;
  appealPoints: string;
  requirements: string;
  holidays: string;
  access: string;
  benefits: string;

  // 特長タグ（最大3つ、Indeedの「特長」に対応）
  featureTags?: string[];

  // メディア
  thumbnailUrls: string[];

  // 予算（運用項目、原稿本文には含めない）
  recruitmentBudget?: string;

  // 文字数チェック
  charCounts: {
    jobTitle: number;
    catchphrase: number;
    jobDescription: number;
    appealPoints: number;
    requirements: number;
  };
}

// AirWork 出力型
export interface AirWorkPosting {
  jobTitle: string;
  jobDescription: string;
  location: string;
  requirements: string;
  numberOfHires: string;
  salary: string;
  salaryDisplayType?: string;          // 範囲/下限/固定（必須）
  holidays: string;
  socialInsurance: string;
  benefits: string;
  selectionProcess: string;
  trialPeriod: string;                 // 必須項目（試用・研修）
  // 必須項目（公式フォーム）
  applicationReceiveMethod: string;    // 応募受付方法（必須）
  applicantInfoToGet: string;          // 取得する情報（必須）
  // 任意項目
  featureTags?: string[];              // お店/仕事の特徴タグ
  workDays?: string[];                 // 勤務曜日
  shiftPolicy?: string;                // シフトの決め方
  workPeriod?: string;                 // 勤務期間
  commuteAllowance?: string;           // 交通費
  shiftIncomeExample?: string;         // シフト・収入例
  seniorStaffMessage?: string;         // 先輩スタッフからの一言
  workplaceAtmosphere?: string;        // 職場の環境・雰囲気
  applicationFlow?: string;            // 応募の流れ
  contactPhone?: string;               // 問い合わせ電話番号
  hpCatchphrase?: string;              // 採用HP側キャッチコピー
  smokingPolicy?: string;
  thumbnailUrls: string[];

  charCounts: {
    jobTitle: number;
    jobDescription: number;
    requirements: number;
  };
}

// JobMedley 出力型
export interface JobMedleyPosting {
  appealTitle: string;
  appealText: string;
  jobDescription: string;
  employmentTypeAndSalary: string;
  benefits: string;
  trainingSystem: string;
  workingHours: string;
  holidays: string;
  requirements: string;
  welcomeRequirements: string;
  access: string;
  selectionProcess: string;
  facilityType?: string;              // 施設種別（必須）
  hiringManagerName?: string;         // 採用担当者（必須）
  contactPhone?: string;
  contactEmail?: string;
  longTermHolidays?: string;          // 長期休暇・特別休暇
  staffVoice?: string;                // 職員の声
  workplaceAtmosphere?: string;       // 職場の環境
  thumbnailUrls: string[];

  charCounts: {
    appealTitle: number;
    appealText: number;
    jobDescription: number;
  };
}

// ハローワーク 出力型
// ※ハローワークは全角入力必須・絵文字禁止
// ※職種名 28字 / 仕事内容 360字（30字×12行）
export interface HelloWorkPosting {
  // 企業基本情報（必須）
  corporateNumber: string;            // 法人番号（13桁）
  companyName: string;
  companyNameKana?: string;
  headOfficeAddress?: string;
  representativeName?: string;
  establishmentYear?: string;
  capital?: string;
  totalEmployees?: string;
  // 事業所情報（必須）
  companyAddress: string;
  workLocation: string;
  employmentInsuranceNumber: string;  // 雇用保険適用事業所番号（必須）
  businessContent: string;            // 事業内容（必須）
  companyFeatures?: string;
  smokingPolicy: string;              // 必須
  // 求人区分（必須）
  jobCategoryType: string;            // 求人区分（一般／新卒等）

  // 仕事の内容
  jobTitle: string;                   // 全角28字以内
  jobDescription: string;             // 全角360字（30字×12行）
  employmentType: string;
  employmentPeriod: string;           // 雇用期間（定めなし／4ヶ月以上 等）
  contractRenewal: string;
  // 2024年法改正対応（必須）
  workplaceChange: string;            // 就業場所の変更の可能性
  jobContentChange: string;           // 業務内容の変更の可能性
  transferPossibility: string;        // 転勤の可能性
  carCommute?: string;                // マイカー通勤
  hasParking?: string;

  // 賃金・手当
  wageType: string;
  wageAmount: string;
  fixedOvertimePay?: string;
  allowances: string;                 // 定額的に支払われる手当
  commutingAllowance: string;
  bonus: string;
  raise: string;
  salaryClosingDay: string;           // 賃金締切日（必須）
  salaryPayDay: string;               // 支払日（必須）

  // 労働時間
  workingHours: string;
  overtime: string;
  overtimeAvg?: string;
  breakTime: string;
  holidays: string;
  annualHolidays: string;             // 年間休日数（必須）
  annualLeave: string;
  specialClause36?: string;

  // 保険・年金・定年（必須）
  insurance: string;
  pension: string;
  trialPeriod: string;
  retirementAge: string;              // 定年制（必須）
  retirementBenefit: string;          // 退職金制度（必須）
  reEmployment?: string;
  childcareLeaveActual?: string;
  careLeaveActual?: string;
  nursingLeaveActual?: string;
  specialNotes: string;

  // 必要な経験等
  requirements: string;
  requiredLicenses: string;
  pcSkills?: string;
  educationLevel?: string;
  ageRestriction: string;

  // 選考等（必須）
  numberOfHires: string;
  selectionMethod: string;            // 選考方法（面接/書類/適性検査/実技）
  selectionResultDays: string;        // 選考結果通知日数（必須）
  applicationDocuments: string;
  applicationMethodHw: string;        // 応募方法（紹介状/マイページ/電話/郵送）
  hiringManagerName: string;          // 採用担当者（必須）
  hiringManagerPosition?: string;
  hiringManagerContact: string;
  selectionNotification: string;

  // 公開範囲（必須）
  publishingScope: string;

  // 求人に関する特記事項
  remarks: string;

  // 文字数チェック
  charCounts: {
    jobTitle: number;      // 上限28
    jobDescription: number; // 上限360
    requirements: number;
    remarks: number;
  };
}

// プラットフォーム識別子
export type Platform = "indeed" | "airwork" | "jobmedley" | "hellowork";

// 全媒体の出力型
export interface AllPlatformPostings {
  indeed: IndeedPosting;
  airwork: AirWorkPosting;
  jobmedley: JobMedleyPosting;
  hellowork: HelloWorkPosting;
  thumbnailUrls: string[];           // deprecated, 後方互換用
  platformThumbnails?: PlatformThumbnails; // 媒体別サムネイル
  visualStyle?: {                    // Team B で引き継ぐビジュアルスタイル
    uniformDescription?: string;
    colorPalette?: string;
    sceneDescription?: string;
  };
  generatedAt: string;
}
