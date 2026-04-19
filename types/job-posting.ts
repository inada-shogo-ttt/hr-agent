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

// 受動喫煙対策（厚労省カテゴリ準拠）
export type SmokingPolicy =
  | "屋内全面禁煙"
  | "屋内禁煙（喫煙専用室あり）"
  | "屋内禁煙（加熱式たばこ専用室あり）"
  | "屋内禁煙（喫煙可能室あり）"
  | "喫煙可"
  | "対策なし";

// 固定残業代（Indeed は有無・金額・時間の明示が必須）
export interface FixedOvertimePay {
  hasFixed: boolean;
  amount?: number;       // 円
  hours?: number;        // みなし時間
  note?: string;         // 例: 超過分は別途支給
}

// 給与の表示方法（Indeed / Airワーク 必須）
export type SalaryDisplayType = "範囲表示" | "下限表示" | "固定額表示";

// 採用担当者情報
export interface HiringManagerInfo {
  name?: string;
  position?: string;
  phone?: string;
  email?: string;
}

// 共通入力フォームの基本型
export interface CommonJobInfo {
  // 会社基本情報
  companyName: string;
  companyNameKana?: string;          // カナ（ハローワーク必須）
  industry: string;
  companyDescription?: string;
  postalCode?: string;               // 郵便番号（Indeed / ハローワーク必須）

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

  // 採用担当者（Indeed / ハローワーク必須、運用共通）
  hiringManager?: HiringManagerInfo;

  // 給与
  salaryMin: number;
  salaryMax?: number;
  salaryType: "時給" | "日給" | "月給" | "年収";
  salaryDescription?: string;
  salaryDisplayType?: SalaryDisplayType;   // Indeed / Airワーク必須
  fixedOvertimePay?: FixedOvertimePay;

  // 勤務時間
  workingHours: string;
  workingHoursDescription?: string;
  monthlyWorkingHours?: number;   // 月間平均所定労働時間（Indeed必須）

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

  // 受動喫煙対策（全媒体共通）
  smokingPolicy?: SmokingPolicy;

  // 選考情報
  selectionProcess?: string;

  // 採用担当者メモ（AI向け）
  appealPoints?: string;
  targetAudience?: string;
  competitiveAdvantage?: string;
}

// AirWork/Indeed の試用期間（構造化）
export interface TrialPeriodInfo {
  hasProvision: boolean;
  duration?: string;     // 例: 3ヶ月
  conditions?: string;   // 例: 条件変更なし / 時給990円
}

// 変更の可能性（2024年法改正対応）
export interface ChangePossibility {
  hasChange: boolean;
  details?: string;      // あり場合の内容
}

// Indeed固有の追加情報
export interface IndeedSpecificInfo {
  catchphrase?: string;
  recruitmentBudget?: number;       // 管理画面の広告予算（運用項目）
  thumbnailRequirements?: string;
  featureTags?: string[];           // 特長タグ（最大3つ）
  screeningQuestions?: string[];    // 応募者への質問（任意）
  applicationMethod?: "Indeed応募" | "外部URL"; // 応募経路（必須）
  applicationUrl?: string;          // 外部URL指定時
}

// AirWork固有の追加情報
export interface AirWorkSpecificInfo {
  // 採用HP側のキャッチコピー（任意）— 求人ページ本体には不要だが連動表示される
  hpCatchphrase?: string;
  thumbnailRequirements?: string;
  // 必須/重要項目
  trialPeriod?: TrialPeriodInfo;             // 試用・研修（必須）
  applicationReceiveMethod?: ("メール" | "Web" | "電話")[]; // 応募受付方法（必須・複数可）
  applicantInfoToGet?: string[];             // 取得する情報（必須・チェック）
  workDays?: string[];                       // 勤務曜日（任意・チェック）
  shiftPolicy?: string;                      // シフトの決め方（任意）
  workPeriod?: "長期" | "短期";              // 勤務期間（任意）
  commuteAllowance?: "全額支給" | "上限あり" | "なし"; // 交通費（任意）
  // 訴求補助（任意）
  featureTags?: string[];                    // お店/仕事の特徴タグ
  shiftIncomeExample?: string;               // シフト・収入例
  seniorStaffMessage?: string;               // 先輩スタッフからの一言
  workplaceAtmosphere?: string;              // 職場の環境・雰囲気
  applicationFlow?: string;                  // 応募の流れ
  companyInterview?: string;                 // 社員インタビュー（採用HP側）
  // legacy（後方互換のため残置。フォーム入力はなし）
  catchphrase?: string;                      // legacy: hpCatchphrase に統合
  workStyle?: "在宅可" | "完全在宅" | "出社必須" | "ハイブリッド"; // legacy: 公式不存在
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

// JobMedleyの施設種別（医療介護福祉系）
export type JobMedleyFacilityType =
  | "クリニック"
  | "病院"
  | "歯科医院"
  | "調剤薬局"
  | "ドラッグストア"
  | "整骨院・接骨院"
  | "鍼灸院"
  | "介護施設（特養・老健）"
  | "介護施設（有料老人ホーム）"
  | "デイサービス"
  | "訪問介護・看護"
  | "保育園・幼稚園"
  | "学童保育"
  | "障害福祉サービス"
  | "その他";

// JobMedley固有の追加情報
export interface JobMedleySpecificInfo {
  appealTitle?: string;
  appealText?: string;
  trainingSystem?: string;
  breakTime?: string;
  // 必須項目
  facilityType?: JobMedleyFacilityType;       // 施設種別（必須・医療介護福祉特化）
  // 任意（応募率向上）
  staffVoice?: string;                        // 職員の声
  workplaceAtmosphere?: string;               // 職場の環境（社風・雰囲気）
  longTermHolidays?: string;                  // 長期休暇・特別休暇
  // legacy
  serviceType?: string;
  salaryNotes?: string;
  estimatedAnnualIncome?: string;
}

// ハローワーク：求人区分
export type HelloWorkJobCategory = "一般" | "新卒等" | "季節" | "出稼ぎ";

// ハローワーク：雇用期間
export type HelloWorkEmploymentPeriodType =
  | "定めなし"
  | "定めあり（4ヶ月以上）"
  | "定めあり（4ヶ月未満）"
  | "日雇";

// ハローワーク：求人公開範囲
export type HelloWorkPublishingScope =
  | "1.求人情報を公開する（事業所名等を含む）"
  | "2.求人情報を公開する（事業所名等を含まない）"
  | "3.ハローワークの求職者に限定（事業所名等を含む）"
  | "4.ハローワークの求職者に限定（事業所名等を含まない）";

// HelloWork固有の追加情報
export interface HelloWorkSpecificInfo {
  // 企業基本情報
  corporateNumber?: string;                  // 法人番号（必須・13桁）
  headOfficeAddress?: string;                // 本社所在地
  representativeName?: string;               // 代表者名
  establishmentYear?: string;                // 創業・設立年
  capital?: string;                          // 資本金
  totalEmployees?: number;                   // 従業員数（企業全体）
  womenEmployees?: number;                   // うち女性
  partTimeEmployees?: number;                // うちパート
  // 事業所情報
  employmentInsuranceNumber?: string;        // 雇用保険適用事業所番号（必須）
  businessContent?: string;                  // 事業内容（必須）
  companyFeatures?: string;                  // 会社の特徴
  // 求人区分
  jobCategoryType?: HelloWorkJobCategory;    // 求人区分（必須）
  employmentPeriodType?: HelloWorkEmploymentPeriodType; // 雇用期間タイプ
  employmentPeriod?: string;                 // 自由記述
  contractRenewal?: string;                  // 契約更新の可能性
  // 仕事内容（2024年法改正対応 = 必須）
  workplaceChangePossibility?: ChangePossibility;  // 就業場所の変更の可能性
  jobContentChangePossibility?: ChangePossibility; // 業務内容の変更の可能性
  transferPossibility?: ChangePossibility;         // 転勤の可能性
  carCommute?: "可" | "不可";                       // マイカー通勤
  hasParking?: boolean;                            // 駐車場有無
  // 賃金
  salaryClosingDay?: string;                       // 賃金締切日（例: 毎月末日）
  salaryPayDay?: string;                           // 支払日（例: 翌月25日）
  fixedAllowances?: string;                        // 定額的に支払われる手当
  // 労働時間
  overtime?: string;
  overtimeAvg?: number;                            // 時間外平均（時間/月）
  annualLeave?: string;                            // 年次有給休暇
  annualHolidays?: number;                         // 年間休日数（必須）
  specialClause36?: string;                        // 36協定特別条項
  // 保険・年金・定年
  retirementBenefit?: { hasProvision: boolean; minYears?: number }; // 退職金制度（必須）
  retirementAge?: { hasProvision: boolean; age?: number };          // 定年制（必須）
  reEmployment?: boolean;                                            // 再雇用制度
  pension?: string;                                                  // 企業年金
  childcareLeaveActual?: string;                                     // 育児休業取得実績
  careLeaveActual?: string;                                          // 介護休業取得実績
  nursingLeaveActual?: string;                                       // 看護休暇取得実績
  // 応募条件
  requiredLicenses?: string;
  pcSkills?: string;                                                 // 必要なPCスキル
  educationLevel?: "不問" | "高校" | "専門" | "短大・高専" | "大学" | "大学院"; // 学歴
  ageRestriction?: string;
  // 選考
  selectionMethods?: ("面接" | "書類選考" | "適性検査" | "実技試験")[]; // 選考方法（必須・複数）
  selectionResultDays?: number;                                       // 選考結果通知（日数・必須）
  applicationDocuments?: string[];                                    // 応募書類（必須・複数）
  applicationMethod?: ("ハローワーク紹介状" | "マイページ応募" | "電話" | "郵送")[]; // 応募方法（必須）
  // 公開範囲
  publishingScope?: HelloWorkPublishingScope;                         // 求人公開範囲（必須）
  // PR・特記事項
  remarks?: string;
  selectionMethod?: string;                                            // 旧フィールド（自由記述）
}

// 完全な入力フォームの型
export interface JobPostingInput {
  common: CommonJobInfo;
  indeed?: IndeedSpecificInfo;
  airwork?: AirWorkSpecificInfo;
  jobmedley?: JobMedleySpecificInfo;
  hellowork?: HelloWorkSpecificInfo;
}
