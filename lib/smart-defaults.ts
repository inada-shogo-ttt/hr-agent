import { CommonJobInfo, EmploymentType } from "@/types/job-posting";

export const INDUSTRIES = [
  "医療・介護",
  "IT・通信",
  "飲食・フード",
  "小売・販売",
  "事務・管理",
  "営業",
  "建設・製造",
  "教育・保育",
  "運輸・物流",
  "サービス・接客",
] as const;

export const JOB_CATEGORIES: Record<string, string[]> = {
  "医療・介護": ["看護師", "介護士・ヘルパー", "医療事務", "薬剤師", "理学療法士・作業療法士"],
  "IT・通信": ["エンジニア・プログラマー", "Webデザイナー", "インフラエンジニア", "プロジェクトマネージャー"],
  "飲食・フード": ["ホールスタッフ", "キッチンスタッフ・調理師", "店長候補", "カフェスタッフ"],
  "小売・販売": ["販売スタッフ", "店長・エリアマネージャー", "レジ・バックヤード"],
  "事務・管理": ["一般事務", "経理・財務", "人事・総務", "営業事務"],
  "営業": ["法人営業", "個人営業", "ルート営業", "インサイドセールス"],
  "建設・製造": ["施工管理", "現場作業員", "設計・CAD", "品質管理・検査"],
  "教育・保育": ["保育士・幼稚園教諭", "塾講師・家庭教師", "学校教員", "スクールスタッフ"],
  "運輸・物流": ["ドライバー", "倉庫・物流スタッフ", "配送センタースタッフ"],
  "サービス・接客": ["受付・フロント", "清掃スタッフ", "警備員", "美容師・エステティシャン"],
};

interface SmartDefault {
  workingHours: string;
  socialInsurance: string[];
  holidays: string;
  selectionProcess: string;
  benefits: string;
  probationPeriod: string;
}

const EMPLOYMENT_DEFAULTS: Record<string, Partial<SmartDefault>> = {
  "正社員": {
    socialInsurance: ["雇用保険", "労災保険", "健康保険", "厚生年金"],
    probationPeriod: "3ヶ月（条件変更なし）",
    selectionProcess: "応募 → 書類選考（3日以内） → 面接1〜2回 → 内定",
  },
  "パート・アルバイト": {
    socialInsurance: ["雇用保険", "労災保険"],
    probationPeriod: "",
    selectionProcess: "応募 → 面接1回 → 内定（最短即日）",
  },
  "契約社員": {
    socialInsurance: ["雇用保険", "労災保険", "健康保険", "厚生年金"],
    probationPeriod: "3ヶ月（条件変更なし）",
    selectionProcess: "応募 → 書類選考 → 面接1回 → 内定",
  },
  "派遣社員": {
    socialInsurance: ["雇用保険", "労災保険"],
    probationPeriod: "",
    selectionProcess: "応募 → 派遣会社登録 → 職場見学 → 就業開始",
  },
  "業務委託": {
    socialInsurance: [],
    probationPeriod: "",
    selectionProcess: "応募 → 面談1〜2回 → 契約締結",
  },
  "インターン": {
    socialInsurance: ["雇用保険", "労災保険"],
    probationPeriod: "",
    selectionProcess: "応募 → 書類選考 → 面接1回 → 内定",
  },
};

// 業種 × 職種カテゴリ のプリセット
const PRESETS: Record<string, Record<string, Partial<SmartDefault>>> = {
  "医療・介護": {
    default: {
      workingHours: "8:30〜17:30（休憩60分）",
      holidays: "シフト制、月8〜9日休み、有給休暇、慶弔休暇",
      benefits: "交通費全額支給、制服貸与、資格手当、各種手当",
    },
    "看護師": {
      workingHours: "日勤 8:30〜17:30 / 夜勤 16:30〜翌9:00（休憩120分）",
      holidays: "シフト制、月8〜10日休み、有給休暇20日、年末年始休暇",
      benefits: "交通費全額支給、夜勤手当、資格手当、住宅手当、制服貸与",
    },
    "介護士・ヘルパー": {
      workingHours: "早番 7:00〜16:00 / 日勤 9:00〜18:00 / 遅番 11:00〜20:00（休憩60分）",
      holidays: "シフト制、月8〜9日休み、有給休暇、慶弔休暇",
      benefits: "交通費全額支給、夜勤手当、処遇改善手当、資格取得支援、制服貸与",
    },
    "医療事務": {
      workingHours: "8:30〜17:30（休憩60分）土曜半日あり",
      holidays: "週休2日（日・祝）、有給休暇、年末年始休暇",
      benefits: "交通費全額支給、制服貸与、資格取得支援",
    },
    "薬剤師": {
      workingHours: "9:00〜18:00（休憩60分）",
      holidays: "週休2日、有給休暇20日、年末年始休暇",
      benefits: "交通費全額支給、薬剤師手当、資格手当、制服貸与",
    },
    "理学療法士・作業療法士": {
      workingHours: "8:30〜17:30（休憩60分）",
      holidays: "週休2日（土日）、祝日、年末年始、有給休暇",
      benefits: "交通費全額支給、資格手当、制服貸与、学会参加費支援",
    },
  },
  "IT・通信": {
    default: {
      workingHours: "9:00〜18:00（休憩1時間）/ フレックスタイム制",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇20日",
      benefits: "交通費全額支給、リモートワーク可、書籍・勉強会費用支援",
    },
    "エンジニア・プログラマー": {
      workingHours: "フレックスタイム制（コアタイム10:00〜15:00）/ 標準9:00〜18:00",
      holidays: "完全週休2日制（土日祝）、年間休日125日、夏季・年末年始休暇、有給休暇",
      benefits: "交通費全額支給、リモートワーク可、技術書・勉強会費用支援、社宅・住宅手当",
      selectionProcess: "応募 → 書類選考 → コーディングテスト → 技術面接 → 最終面接 → 内定",
    },
    "Webデザイナー": {
      workingHours: "フレックスタイム制（コアタイム10:00〜15:00）",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇",
      benefits: "交通費全額支給、リモートワーク可、デザインツール費用支援、書籍費用支援",
    },
    "インフラエンジニア": {
      workingHours: "フレックスタイム制 / シフト制（オンコール対応あり）",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇",
      benefits: "交通費全額支給、資格取得支援（費用全額負担）、リモートワーク可",
      selectionProcess: "応募 → 書類選考 → 技術面接 → 最終面接 → 内定",
    },
    "プロジェクトマネージャー": {
      workingHours: "フレックスタイム制（コアタイム10:00〜15:00）",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇",
      benefits: "交通費全額支給、リモートワーク可、PMP取得支援、マネジメント研修",
      selectionProcess: "応募 → 書類選考 → 面接2〜3回 → 内定",
    },
  },
  "飲食・フード": {
    default: {
      workingHours: "シフト制（週3日〜・1日4時間〜相談可）",
      holidays: "シフト制、週休2日以上、有給休暇",
      benefits: "交通費支給（上限あり）、賄い付き、制服貸与",
    },
    "ホールスタッフ": {
      workingHours: "シフト制（週3日〜OK・1日4時間〜相談可）/ 営業時間 11:00〜22:00",
      holidays: "週休2日以上（希望考慮）、有給休暇、誕生日休暇",
      benefits: "交通費支給、賄い付き・食事補助、制服貸与、昇給制度",
    },
    "キッチンスタッフ・調理師": {
      workingHours: "シフト制（週3日〜OK）/ 調理開始2時間前〜ラストまで",
      holidays: "週休2日以上、有給休暇",
      benefits: "交通費支給、賄い付き、制服貸与、技術習得支援",
    },
    "店長候補": {
      workingHours: "9:00〜22:00のシフト制（1日8時間・週5日）",
      holidays: "週休2日制、有給休暇、慶弔休暇",
      benefits: "交通費全額支給、店長手当、賄い付き、制服貸与、社員登用制度",
      selectionProcess: "応募 → 書類選考 → 面接1〜2回 → 内定",
    },
    "カフェスタッフ": {
      workingHours: "7:00〜21:00のシフト制（週3日〜・1日3時間〜OK）",
      holidays: "週休2日以上、有給休暇",
      benefits: "交通費支給、ドリンク無料、賄い付き、制服貸与",
    },
  },
  "小売・販売": {
    default: {
      workingHours: "シフト制（週3日〜・1日4時間〜相談可）/ 店舗営業時間内",
      holidays: "週休2日以上、有給休暇",
      benefits: "交通費支給（上限あり）、社員割引、制服貸与",
    },
    "販売スタッフ": {
      workingHours: "10:00〜21:00のシフト制（週3日〜・1日4時間〜相談可）",
      holidays: "週休2日以上（希望考慮）、有給休暇、年末年始休暇",
      benefits: "交通費支給、社員割引20%〜、制服貸与、各種研修制度",
    },
    "店長・エリアマネージャー": {
      workingHours: "9:00〜21:00のシフト制（週5日・1日8時間）",
      holidays: "週休2日制、有給休暇、慶弔休暇",
      benefits: "交通費全額支給、役職手当、社員割引、社用車貸与（エリアMG）",
      selectionProcess: "応募 → 書類選考 → 面接2回 → 内定",
    },
    "レジ・バックヤード": {
      workingHours: "シフト制（週2日〜・1日3時間〜OK）",
      holidays: "週休2日以上（希望考慮）、有給休暇",
      benefits: "交通費支給、社員割引、制服貸与",
    },
  },
  "事務・管理": {
    default: {
      workingHours: "9:00〜18:00（休憩1時間）",
      holidays: "完全週休2日制（土日祝）、年間休日120日以上、有給休暇",
      benefits: "交通費全額支給、各種手当、健康診断",
    },
    "一般事務": {
      workingHours: "9:00〜18:00（休憩60分）",
      holidays: "完全週休2日制（土日祝）、年間休日120日、夏季・年末年始休暇、有給休暇",
      benefits: "交通費全額支給、各種社会保険完備、産育休取得実績あり",
    },
    "経理・財務": {
      workingHours: "9:00〜18:00（休憩60分）/ 決算期は残業あり",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇",
      benefits: "交通費全額支給、資格手当（簿記・税理士など）、自己啓発支援",
    },
    "人事・総務": {
      workingHours: "9:00〜18:00（休憩60分）",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇",
      benefits: "交通費全額支給、各種社会保険完備、研修制度充実",
    },
    "営業事務": {
      workingHours: "9:00〜18:00（休憩60分）",
      holidays: "完全週休2日制（土日祝）、年間休日120日、有給休暇",
      benefits: "交通費全額支給、インセンティブ制度、各種手当",
    },
  },
  "営業": {
    default: {
      workingHours: "9:00〜18:00（休憩1時間）/ 直行直帰可",
      holidays: "完全週休2日制（土日祝）、年間休日120日、有給休暇",
      benefits: "交通費全額支給、インセンティブ制度、社用車貸与",
    },
    "法人営業": {
      workingHours: "9:00〜18:00（休憩60分）/ 直行直帰可・在宅勤務可",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇",
      benefits: "交通費全額支給、インセンティブ・歩合給、社用車貸与、各種手当",
      selectionProcess: "応募 → 書類選考 → 面接2回（人事+現場） → 内定",
    },
    "個人営業": {
      workingHours: "9:00〜18:00（休憩60分）/ シフト制の場合あり",
      holidays: "週休2日制（土日または平日2日）、有給休暇",
      benefits: "交通費全額支給、インセンティブ・歩合給制度充実、社用車貸与",
    },
    "ルート営業": {
      workingHours: "9:00〜18:00（休憩60分）/ 直行直帰可",
      holidays: "完全週休2日制（土日祝）、年間休日120日、有給休暇",
      benefits: "交通費全額支給・社用車貸与、インセンティブ制度、各種手当",
    },
    "インサイドセールス": {
      workingHours: "フレックスタイム制（コアタイム10:00〜15:00）",
      holidays: "完全週休2日制（土日祝）、年間休日125日、有給休暇",
      benefits: "交通費全額支給、リモートワーク可、インセンティブ制度",
      selectionProcess: "応募 → 書類選考 → 面接1〜2回 → 内定",
    },
  },
  "建設・製造": {
    default: {
      workingHours: "8:00〜17:00（休憩60分）",
      holidays: "週休2日制（土日）、年間休日105日、有給休暇",
      benefits: "交通費全額支給、制服・安全用具貸与、資格取得支援",
    },
    "施工管理": {
      workingHours: "8:00〜17:00（休憩60分）/ 現場による",
      holidays: "週休2日制（4週8休）、有給休暇、夏季・年末年始休暇",
      benefits: "交通費全額支給、資格手当（施工管理技士など）、現場手当、社用車貸与",
      selectionProcess: "応募 → 書類選考 → 面接1〜2回 → 内定",
    },
    "現場作業員": {
      workingHours: "7:00〜16:00（休憩60分）/ 現場による",
      holidays: "週休2日制（土日）、祝日、有給休暇、年末年始休暇",
      benefits: "交通費全額支給、制服・安全用具貸与、作業手当",
    },
    "設計・CAD": {
      workingHours: "9:00〜18:00（休憩60分）",
      holidays: "完全週休2日制（土日祝）、年間休日120日、有給休暇",
      benefits: "交通費全額支給、資格手当、技術習得支援",
    },
    "品質管理・検査": {
      workingHours: "8:00〜17:00（休憩60分）/ 2交代制の場合あり",
      holidays: "週休2日制、有給休暇、年末年始休暇",
      benefits: "交通費全額支給、資格手当、制服貸与",
    },
  },
  "教育・保育": {
    default: {
      workingHours: "8:30〜17:30（休憩60分）",
      holidays: "週休2日制、有給休暇、夏季・冬季・春季休暇",
      benefits: "交通費全額支給、制服貸与、資格手当、研修制度充実",
    },
    "保育士・幼稚園教諭": {
      workingHours: "早番 7:00〜16:00 / 日勤 9:00〜18:00 / 遅番 11:00〜20:00（シフト制）",
      holidays: "週休2日（日+他1日）、年間休日115日、夏季・年末年始休暇、有給休暇",
      benefits: "交通費全額支給、資格手当、処遇改善手当、制服貸与、研修費用支援",
    },
    "塾講師・家庭教師": {
      workingHours: "14:00〜22:00のシフト制（週3日〜・1日3時間〜OK）",
      holidays: "週2日以上（希望考慮）、有給休暇",
      benefits: "交通費支給（上限あり）、授業料割引制度、指導力向上研修",
      selectionProcess: "応募 → 面接・デモ授業 → 内定（最短1週間）",
    },
    "学校教員": {
      workingHours: "8:00〜17:00（休憩45分）/ 行事期間は変動あり",
      holidays: "土日祝、夏季・冬季・春季長期休暇、有給休暇",
      benefits: "交通費全額支給、住宅手当、研修制度、教材費補助",
      selectionProcess: "応募 → 書類選考 → 模擬授業・面接 → 内定",
    },
    "スクールスタッフ": {
      workingHours: "9:00〜18:00（休憩60分）/ 週3日〜相談可",
      holidays: "週休2日以上、長期休暇期間あり、有給休暇",
      benefits: "交通費支給、受講費割引、制服貸与",
    },
  },
  "運輸・物流": {
    default: {
      workingHours: "早番 6:00〜15:00 / 日勤 9:00〜18:00（シフト制）",
      holidays: "週休2日制、有給休暇",
      benefits: "交通費全額支給、制服貸与、各種手当",
    },
    "ドライバー": {
      workingHours: "早番 5:00〜14:00 / 日勤 8:00〜17:00（シフト制）",
      holidays: "週休2日制（4週8休）、有給休暇、年末年始休暇",
      benefits: "交通費全額支給、車両手当・運転手当、各種免許取得支援、制服貸与",
      selectionProcess: "応募 → 面接1回 → 健康診断 → 内定",
    },
    "倉庫・物流スタッフ": {
      workingHours: "シフト制（早番/日勤/遅番）/ 週3日〜・1日4時間〜相談可",
      holidays: "週休2日以上、有給休暇",
      benefits: "交通費支給、制服・用具貸与、寮・社宅あり（一部施設）",
    },
    "配送センタースタッフ": {
      workingHours: "早番 5:00〜14:00 / 日勤 9:00〜18:00 / 夜勤 21:00〜翌6:00（シフト制）",
      holidays: "週休2日以上、有給休暇",
      benefits: "交通費支給、夜勤手当、制服貸与",
    },
  },
  "サービス・接客": {
    default: {
      workingHours: "シフト制（週3日〜・1日4時間〜相談可）",
      holidays: "週休2日以上、有給休暇",
      benefits: "交通費支給（上限あり）、制服貸与",
    },
    "受付・フロント": {
      workingHours: "8:00〜21:00のシフト制（週3日〜・1日5時間〜OK）",
      holidays: "週休2日以上（希望考慮）、有給休暇",
      benefits: "交通費支給、制服貸与、接客研修制度",
    },
    "清掃スタッフ": {
      workingHours: "6:00〜10:00 / 17:00〜21:00などシフト制（週3日〜・1日2時間〜OK）",
      holidays: "週休2日以上、有給休暇",
      benefits: "交通費支給（上限あり）、制服・用具貸与",
    },
    "警備員": {
      workingHours: "日勤 8:00〜20:00 / 夜勤 20:00〜翌8:00（隔日勤務）",
      holidays: "週休2日制（隔日勤務のため月15日前後）、有給休暇",
      benefits: "交通費全額支給、制服・用具貸与、夜勤手当、資格取得支援",
      selectionProcess: "応募 → 面接1回 → 内定（最短3日）",
    },
    "美容師・エステティシャン": {
      workingHours: "9:00〜19:00のシフト制（週5日・1日8時間）",
      holidays: "週休2日制（定休日+希望日）、有給休暇、慶弔休暇",
      benefits: "交通費支給、技術習得支援・研修制度、スタッフ割引、制服貸与",
      selectionProcess: "応募 → 面接1回（技術確認含む） → 内定",
    },
  },
};

export function getSmartDefaults(
  industry: string,
  jobCategory: string,
  employmentType: string
): Partial<CommonJobInfo> {
  const industryPresets = PRESETS[industry] || {};
  const industryDefault = industryPresets["default"] || {};
  const jobPreset = industryPresets[jobCategory] || {};
  const employmentDefault = EMPLOYMENT_DEFAULTS[employmentType] || EMPLOYMENT_DEFAULTS["正社員"];

  // 優先順位: 職種プリセット > 業種デフォルト > 雇用形態デフォルト
  const merged: Partial<SmartDefault> = {
    ...employmentDefault,
    ...industryDefault,
    ...jobPreset,
  };

  return {
    industry,
    jobTitle: jobCategory,
    employmentType: employmentType as EmploymentType,
    workingHours: merged.workingHours || "",
    socialInsurance: merged.socialInsurance || [],
    holidays: merged.holidays || "",
    selectionProcess: merged.selectionProcess || "",
    benefits: merged.benefits || "",
    probationPeriod: merged.probationPeriod || "",
  };
}
