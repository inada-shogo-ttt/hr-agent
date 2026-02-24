// 各媒体の出力フォーマット型

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

  charCounts: {
    appealTitle: number;
    appealText: number;
    jobDescription: number;
  };
}

// プラットフォーム識別子
export type Platform = "indeed" | "airwork" | "jobmedley";

// 全媒体の出力型
export interface AllPlatformPostings {
  indeed: IndeedPosting;
  airwork: AirWorkPosting;
  jobmedley: JobMedleyPosting;
  thumbnailUrls: string[];
  generatedAt: string;
}
