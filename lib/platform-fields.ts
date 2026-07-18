export type ReferenceField = {
  key: string;
  label: string;
  multiline?: boolean;
};

export type PlatformFieldGroup = {
  main: ReferenceField[];
  optional: ReferenceField[];
};

// 各媒体の参考原稿テンプレート。
// Team A/B の入力項目（types/job-posting.ts、types/platform.ts）と整合するよう設計。
// key 名は可能な限り types と揃えており、参考原稿で学習させた内容が
// そのまま AI プロンプトの該当フィールドに反映されるようになっている。
export const PLATFORM_FIELDS: Record<string, PlatformFieldGroup> = {
  indeed: {
    main: [
      { key: "jobTitle", label: "職種名（正式名称・1求人1職種）" },
      { key: "catchphrase", label: "キャッチコピー" },
      { key: "jobDescription", label: "仕事内容（業務・商材・手法を具体的に）", multiline: true },
      { key: "appealPoints", label: "アピールポイント", multiline: true },
      { key: "requirements", label: "求める人材", multiline: true },
      { key: "holidays", label: "休暇・休日", multiline: true },
      { key: "benefits", label: "待遇・福利厚生", multiline: true },
    ],
    optional: [
      { key: "salaryDetails", label: "給与詳細（基本給・手当・賞与）", multiline: true },
      { key: "salaryDisplayType", label: "給与の表示方法（範囲/下限/固定額）" },
      { key: "fixedOvertimePay", label: "固定残業代（金額・時間・扱い）" },
      { key: "monthlyWorkingHours", label: "月間平均所定労働時間" },
      { key: "smokingPolicy", label: "受動喫煙対策" },
      { key: "featureTags", label: "特長タグ（カンマ区切り・最大3つ）" },
      { key: "applicationMethod", label: "応募経路（Indeed応募/外部URL）" },
      { key: "screeningQuestions", label: "応募者への質問（スクリーニング）", multiline: true },
      { key: "companyOverview", label: "会社概要", multiline: true },
      { key: "trainingSystem", label: "入社後の研修体制", multiline: true },
      { key: "selectionFlow", label: "応募後の流れ・選考ステップ", multiline: true },
    ],
  },
  airwork: {
    main: [
      { key: "jobTitle", label: "職種名" },
      { key: "jobDescription", label: "仕事内容", multiline: true },
      { key: "requirements", label: "求める人材", multiline: true },
      { key: "selectionProcess", label: "選考の流れ", multiline: true },
      { key: "trialPeriod", label: "試用・研修（必須項目）" },
      { key: "applicationReceiveMethod", label: "応募受付方法（メール/Web/電話）" },
    ],
    optional: [
      { key: "salaryDetails", label: "給与詳細（基本給・手当・賞与）", multiline: true },
      { key: "salaryDisplayType", label: "給与の表示方法（範囲/下限/固定額）" },
      { key: "fixedOvertimePay", label: "固定残業代（金額・時間・扱い）" },
      { key: "applicantInfoToGet", label: "応募者から取得する情報（カンマ区切り）" },
      { key: "workDays", label: "勤務曜日（カンマ区切り）" },
      { key: "shiftPolicy", label: "シフトの決め方" },
      { key: "workPeriod", label: "勤務期間（長期/短期）" },
      { key: "commuteAllowance", label: "交通費（全額支給/上限あり/なし）" },
      { key: "holidays", label: "休暇・休日", multiline: true },
      { key: "benefits", label: "待遇・福利厚生", multiline: true },
      { key: "featureTags", label: "特徴タグ（カンマ区切り）" },
      { key: "shiftIncomeExample", label: "シフト・収入例", multiline: true },
      { key: "seniorStaffMessage", label: "先輩スタッフからの一言", multiline: true },
      { key: "workplaceAtmosphere", label: "職場の環境・雰囲気", multiline: true },
      { key: "companyInterview", label: "社員インタビュー（採用HP側）", multiline: true },
      { key: "applicationFlow", label: "応募の流れ", multiline: true },
      { key: "hpCatchphrase", label: "採用HP向けキャッチコピー" },
      { key: "companyOverview", label: "会社概要", multiline: true },
      { key: "trainingSystem", label: "入社後の研修体制", multiline: true },
    ],
  },
  jobmedley: {
    main: [
      { key: "facilityType", label: "施設種別（必須）" },
      { key: "appealTitle", label: "訴求文タイトル" },
      { key: "appealText", label: "訴求文（本文）", multiline: true },
      { key: "jobDescription", label: "仕事内容", multiline: true },
      { key: "trainingSystem", label: "教育体制・研修", multiline: true },
      { key: "requirements", label: "応募要件（必須要件のみ）", multiline: true },
      { key: "selectionProcess", label: "選考プロセス（面接回数・流れ）", multiline: true },
    ],
    optional: [
      { key: "salaryDetails", label: "給与詳細（基本給・手当・賞与）", multiline: true },
      { key: "fixedOvertimePay", label: "固定残業代（金額・時間・扱い）" },
      { key: "holidays", label: "休暇・休日", multiline: true },
      { key: "longTermHolidays", label: "長期休暇・特別休暇" },
      { key: "benefits", label: "待遇・福利厚生（社保完備等）", multiline: true },
      { key: "welcomeRequirements", label: "歓迎要件", multiline: true },
      { key: "breakTime", label: "休憩時間" },
      { key: "staffVoice", label: "職員の声", multiline: true },
      { key: "workplaceAtmosphere", label: "職場の環境（年齢層・男女比・社風）", multiline: true },
      { key: "companyOverview", label: "事業所基本情報", multiline: true },
      { key: "selectionFlow", label: "応募後の流れ・選考ステップ", multiline: true },
    ],
  },
  hellowork: {
    main: [
      { key: "jobTitle", label: "職種（全角28字以内）" },
      { key: "jobDescription", label: "仕事の内容（全角360字・冒頭90字が概要表示）", multiline: true },
      { key: "workplaceChange", label: "就業場所の変更の可能性（2024年法改正・必須）" },
      { key: "jobContentChange", label: "業務内容の変更の可能性（2024年法改正・必須）" },
      { key: "transferPossibility", label: "転勤の可能性（必須）" },
      { key: "requirements", label: "必要な経験・知識・技能等", multiline: true },
      { key: "wageAmount", label: "賃金額（基本給）" },
      { key: "workingHours", label: "就業時間" },
      { key: "holidays", label: "休日" },
      { key: "annualHolidays", label: "年間休日数（必須）" },
      { key: "remarks", label: "求人に関する特記事項", multiline: true },
    ],
    optional: [
      { key: "businessContent", label: "事業内容", multiline: true },
      { key: "companyFeatures", label: "会社の特徴・PR", multiline: true },
      { key: "employmentPeriod", label: "雇用期間（定めなし/4ヶ月以上 等）" },
      { key: "contractRenewal", label: "契約更新の可能性" },
      { key: "fixedOvertimePay", label: "固定残業代（金額・時間・扱い）" },
      { key: "fixedAllowances", label: "定額的に支払われる手当" },
      { key: "allowances", label: "手当（その他）" },
      { key: "commutingAllowance", label: "通勤手当" },
      { key: "bonus", label: "賞与" },
      { key: "raise", label: "昇給" },
      { key: "salaryClosingDay", label: "賃金締切日" },
      { key: "salaryPayDay", label: "賃金支払日" },
      { key: "overtime", label: "時間外労働" },
      { key: "annualLeave", label: "年次有給休暇（6ヶ月経過後）" },
      { key: "insurance", label: "加入保険" },
      { key: "pension", label: "企業年金" },
      { key: "trialPeriod", label: "試用期間" },
      { key: "retirementAge", label: "定年制（必須）" },
      { key: "retirementBenefit", label: "退職金制度（必須）" },
      { key: "requiredLicenses", label: "必要な免許・資格" },
      { key: "pcSkills", label: "必要なPCスキル" },
      { key: "educationLevel", label: "学歴" },
      { key: "ageRestriction", label: "年齢制限（例外事由を併記）" },
      { key: "smokingPolicy", label: "受動喫煙対策（必須）" },
      { key: "carCommute", label: "マイカー通勤（可/不可）" },
      { key: "selectionMethod", label: "選考方法（面接/書類/適性検査/実技）" },
      { key: "selectionResultDays", label: "選考結果通知（日数）" },
      { key: "applicationDocuments", label: "応募書類" },
      { key: "applicationMethodHw", label: "応募方法（紹介状/マイページ/電話/郵送）" },
      { key: "hiringManagerContact", label: "採用担当者連絡先" },
    ],
  },
};
