// 各媒体の出力フォーマット型

import { PlatformThumbnails } from "@/lib/nanobanana";

// Indeed 出力型
export interface IndeedPosting {
  // 必須フィールド
  companyName: string;
  jobTitle: string;
  catchphrase: string;
  numberOfHires: string;
  location: string;
  employmentType: string;
  salary: string;
  workingHours: string;
  socialInsurance: string;
  probationPeriod?: string;

  // 本文フィールド
  jobDescription: string;
  appealPoints: string;
  requirements: string;
  holidays: string;
  access: string;
  benefits: string;

  // メディア
  thumbnailUrls: string[];

  // 予算
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
  catchphrase: string;
  numberOfHires: string;
  salary: string;
  workStyle: string;
  holidays: string;
  socialInsurance: string;
  benefits: string;
  selectionProcess: string;
  thumbnailUrls: string[];

  charCounts: {
    jobTitle: number;
    catchphrase: number;
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
  thumbnailUrls: string[];

  charCounts: {
    appealTitle: number;
    appealText: number;
    jobDescription: number;
  };
}

// ハローワーク 出力型
// ※ハローワークは全角入力必須・絵文字禁止
export interface HelloWorkPosting {
  // 求人事業所
  companyName: string;
  companyAddress: string;
  workLocation: string;
  smokingPolicy: string;

  // 仕事の内容
  jobTitle: string;
  jobDescription: string;
  employmentType: string;
  employmentPeriod: string;
  contractRenewal: string;

  // 賃金・手当
  wageType: string;
  wageAmount: string;
  allowances: string;
  commutingAllowance: string;
  bonus: string;
  raise: string;

  // 労働時間
  workingHours: string;
  overtime: string;
  breakTime: string;
  holidays: string;
  annualLeave: string;

  // その他の労働条件
  insurance: string;
  pension: string;
  trialPeriod: string;
  specialNotes: string;

  // 必要な経験等
  requirements: string;
  requiredLicenses: string;
  ageRestriction: string;

  // 選考等
  numberOfHires: string;
  selectionMethod: string;
  applicationDocuments: string;
  selectionNotification: string;

  // 求人に関する特記事項
  remarks: string;

  // 文字数チェック
  charCounts: {
    jobTitle: number;
    jobDescription: number;
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
