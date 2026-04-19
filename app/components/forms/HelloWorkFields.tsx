"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HelloWorkSpecificInfo,
  HelloWorkJobCategory,
  HelloWorkEmploymentPeriodType,
  HelloWorkPublishingScope,
  ChangePossibility,
} from "@/types/job-posting";

const JOB_CATEGORIES: HelloWorkJobCategory[] = ["一般", "新卒等", "季節", "出稼ぎ"];

const EMPLOYMENT_PERIODS: HelloWorkEmploymentPeriodType[] = [
  "定めなし",
  "定めあり（4ヶ月以上）",
  "定めあり（4ヶ月未満）",
  "日雇",
];

const PUBLISHING_SCOPES: HelloWorkPublishingScope[] = [
  "1.求人情報を公開する（事業所名等を含む）",
  "2.求人情報を公開する（事業所名等を含まない）",
  "3.ハローワークの求職者に限定（事業所名等を含む）",
  "4.ハローワークの求職者に限定（事業所名等を含まない）",
];

const SELECTION_METHODS = ["面接", "書類選考", "適性検査", "実技試験"] as const;
const APPLICATION_METHODS_HW = ["ハローワーク紹介状", "マイページ応募", "電話", "郵送"] as const;
const APPLICATION_DOCS = [
  "履歴書",
  "職務経歴書",
  "ハローワーク紹介状",
  "資格証明書のコピー",
] as const;
const EDUCATION_LEVELS = ["不問", "高校", "専門", "短大・高専", "大学", "大学院"] as const;

interface HelloWorkFieldsProps {
  data: HelloWorkSpecificInfo;
  onChange: (data: Partial<HelloWorkSpecificInfo>) => void;
}

function ChangePossibilityField({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: ChangePossibility | undefined;
  onChange: (v: ChangePossibility) => void;
  required?: boolean;
}) {
  const v = value || { hasChange: false };
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
        {required && (
          <span className="text-xs font-normal text-muted-foreground ml-2">
            ※2024年法改正で必須化
          </span>
        )}
      </Label>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!v.hasChange}
            onChange={() => onChange({ hasChange: false })}
          />
          <span className="text-sm">変更の範囲：なし</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={v.hasChange}
            onChange={() => onChange({ hasChange: true, details: v.details || "" })}
          />
          <span className="text-sm">変更の範囲：あり</span>
        </label>
      </div>
      {v.hasChange && (
        <Input
          value={v.details || ""}
          onChange={(e) => onChange({ hasChange: true, details: e.target.value })}
          placeholder="例: 会社の定める事業所"
        />
      )}
    </div>
  );
}

export function HelloWorkFields({ data, onChange }: HelloWorkFieldsProps) {
  const toggleArrayItem = <T extends string>(
    list: readonly T[] | undefined,
    item: T,
    key: keyof HelloWorkSpecificInfo
  ) => {
    const current = (list as T[]) || [];
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    onChange({ [key]: next } as Partial<HelloWorkSpecificInfo>);
  };

  const retirementBenefit = data.retirementBenefit || { hasProvision: false };
  const retirementAge = data.retirementAge || { hasProvision: false };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
        <p className="font-medium">ハローワーク固有の設定</p>
        <p className="mt-1 text-xs">
          ハローワークは入力必須項目が最も多い媒体です。出力は全角化されます（半角入力でOK）。
          2024年法改正により「就業場所/業務内容/転勤の変更の可能性」が必須化されています。
        </p>
      </div>

      {/* 企業基本情報 */}
      <div>
        <h3 className="text-base font-semibold mb-3">企業基本情報</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-corporate-num">
                法人番号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hw-corporate-num"
                value={data.corporateNumber || ""}
                onChange={(e) => onChange({ corporateNumber: e.target.value })}
                placeholder="13桁の法人番号"
                maxLength={13}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-employment-ins-num">
                雇用保険適用事業所番号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hw-employment-ins-num"
                value={data.employmentInsuranceNumber || ""}
                onChange={(e) => onChange({ employmentInsuranceNumber: e.target.value })}
                placeholder="1234-567890-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-head-office">本社所在地</Label>
            <Input
              id="hw-head-office"
              value={data.headOfficeAddress || ""}
              onChange={(e) => onChange({ headOfficeAddress: e.target.value })}
              placeholder="〒150-0001 東京都渋谷区..."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-rep">代表者名</Label>
              <Input
                id="hw-rep"
                value={data.representativeName || ""}
                onChange={(e) => onChange({ representativeName: e.target.value })}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-establish">設立年</Label>
              <Input
                id="hw-establish"
                value={data.establishmentYear || ""}
                onChange={(e) => onChange({ establishmentYear: e.target.value })}
                placeholder="2010年4月"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-capital">資本金</Label>
              <Input
                id="hw-capital"
                value={data.capital || ""}
                onChange={(e) => onChange({ capital: e.target.value })}
                placeholder="1,000万円"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-emp-total">従業員数（企業全体）</Label>
              <Input
                id="hw-emp-total"
                type="number"
                value={data.totalEmployees ?? ""}
                onChange={(e) =>
                  onChange({ totalEmployees: parseInt(e.target.value) || undefined })
                }
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-emp-women">うち女性</Label>
              <Input
                id="hw-emp-women"
                type="number"
                value={data.womenEmployees ?? ""}
                onChange={(e) =>
                  onChange({ womenEmployees: parseInt(e.target.value) || undefined })
                }
                placeholder="40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-emp-pt">うちパート</Label>
              <Input
                id="hw-emp-pt"
                type="number"
                value={data.partTimeEmployees ?? ""}
                onChange={(e) =>
                  onChange({ partTimeEmployees: parseInt(e.target.value) || undefined })
                }
                placeholder="15"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-business">
              事業内容 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="hw-business"
              value={data.businessContent || ""}
              onChange={(e) => onChange({ businessContent: e.target.value })}
              placeholder="具体的な事業内容を記載"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-features">会社の特徴・PR</Label>
            <Textarea
              id="hw-features"
              value={data.companyFeatures || ""}
              onChange={(e) => onChange({ companyFeatures: e.target.value })}
              placeholder="求職者にアピールしたい会社の強み・魅力"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* 求人区分・雇用条件 */}
      <div>
        <h3 className="text-base font-semibold mb-3">求人区分・雇用条件</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-job-cat">
                求人区分 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={data.jobCategoryType || "一般"}
                onValueChange={(v) =>
                  onChange({ jobCategoryType: v as HelloWorkJobCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-period-type">
                雇用期間 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={data.employmentPeriodType || "定めなし"}
                onValueChange={(v) =>
                  onChange({ employmentPeriodType: v as HelloWorkEmploymentPeriodType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-renewal">契約更新の可能性</Label>
            <Input
              id="hw-renewal"
              value={data.contractRenewal || ""}
              onChange={(e) => onChange({ contractRenewal: e.target.value })}
              placeholder="あり / なし / 条件による"
            />
          </div>
        </div>
      </div>

      {/* 2024年法改正：変更の可能性（必須） */}
      <div>
        <h3 className="text-base font-semibold mb-3">
          就業条件の変更の可能性
          <span className="text-xs font-normal text-red-600 ml-2">※2024年法改正で必須化</span>
        </h3>
        <div className="space-y-4">
          <ChangePossibilityField
            label="就業場所の変更の可能性"
            value={data.workplaceChangePossibility}
            onChange={(v) => onChange({ workplaceChangePossibility: v })}
          />
          <ChangePossibilityField
            label="業務内容の変更の可能性"
            value={data.jobContentChangePossibility}
            onChange={(v) => onChange({ jobContentChangePossibility: v })}
          />
          <ChangePossibilityField
            label="転勤の可能性"
            value={data.transferPossibility}
            onChange={(v) => onChange({ transferPossibility: v })}
          />
        </div>
      </div>

      {/* 通勤・賃金詳細 */}
      <div>
        <h3 className="text-base font-semibold mb-3">通勤・賃金詳細</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-car">マイカー通勤</Label>
              <Select
                value={data.carCommute || ""}
                onValueChange={(v) => onChange({ carCommute: v as "可" | "不可" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="可">可</SelectItem>
                  <SelectItem value="不可">不可</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input
                type="checkbox"
                id="hw-parking"
                checked={data.hasParking || false}
                onChange={(e) => onChange({ hasParking: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="hw-parking" className="cursor-pointer">駐車場あり</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-closing">
                賃金締切日 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hw-closing"
                value={data.salaryClosingDay || ""}
                onChange={(e) => onChange({ salaryClosingDay: e.target.value })}
                placeholder="毎月末日"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-payday">
                賃金支払日 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hw-payday"
                value={data.salaryPayDay || ""}
                onChange={(e) => onChange({ salaryPayDay: e.target.value })}
                placeholder="翌月25日"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-fixed-allowances">定額的に支払われる手当</Label>
            <Input
              id="hw-fixed-allowances"
              value={data.fixedAllowances || ""}
              onChange={(e) => onChange({ fixedAllowances: e.target.value })}
              placeholder="住宅手当 月20,000円、家族手当 配偶者15,000円 など"
            />
          </div>
        </div>
      </div>

      {/* 労働時間詳細 */}
      <div>
        <h3 className="text-base font-semibold mb-3">労働時間詳細</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-overtime">時間外労働</Label>
              <Input
                id="hw-overtime"
                value={data.overtime || ""}
                onChange={(e) => onChange({ overtime: e.target.value })}
                placeholder="あり / なし"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-overtime-avg">時間外平均（時間/月）</Label>
              <Input
                id="hw-overtime-avg"
                type="number"
                value={data.overtimeAvg ?? ""}
                onChange={(e) =>
                  onChange({ overtimeAvg: parseInt(e.target.value) || undefined })
                }
                placeholder="20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-annual-holidays">
                年間休日数 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hw-annual-holidays"
                type="number"
                value={data.annualHolidays ?? ""}
                onChange={(e) =>
                  onChange({ annualHolidays: parseInt(e.target.value) || undefined })
                }
                placeholder="120"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-annual-leave">年次有給休暇（6ヶ月経過後）</Label>
              <Input
                id="hw-annual-leave"
                value={data.annualLeave || ""}
                onChange={(e) => onChange({ annualLeave: e.target.value })}
                placeholder="10日"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-36">36協定における特別条項</Label>
            <Input
              id="hw-36"
              value={data.specialClause36 || ""}
              onChange={(e) => onChange({ specialClause36: e.target.value })}
              placeholder="例: 繁忙期に限り月60時間まで"
            />
          </div>
        </div>
      </div>

      {/* 保険・年金・定年（必須） */}
      <div>
        <h3 className="text-base font-semibold mb-3">保険・年金・定年</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>
              定年制 <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!retirementAge.hasProvision}
                  onChange={() => onChange({ retirementAge: { hasProvision: false } })}
                />
                <span className="text-sm">なし</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={retirementAge.hasProvision}
                  onChange={() =>
                    onChange({ retirementAge: { hasProvision: true, age: 65 } })
                  }
                />
                <span className="text-sm">あり（一律）</span>
              </label>
              {retirementAge.hasProvision && (
                <Input
                  type="number"
                  value={retirementAge.age ?? ""}
                  onChange={(e) =>
                    onChange({
                      retirementAge: { hasProvision: true, age: parseInt(e.target.value) || 65 },
                    })
                  }
                  placeholder="65"
                  className="w-24"
                />
              )}
              <span className="text-sm">歳</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              退職金制度 <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!retirementBenefit.hasProvision}
                  onChange={() => onChange({ retirementBenefit: { hasProvision: false } })}
                />
                <span className="text-sm">なし</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={retirementBenefit.hasProvision}
                  onChange={() =>
                    onChange({
                      retirementBenefit: { hasProvision: true, minYears: 3 },
                    })
                  }
                />
                <span className="text-sm">あり（勤続）</span>
              </label>
              {retirementBenefit.hasProvision && (
                <>
                  <Input
                    type="number"
                    value={retirementBenefit.minYears ?? ""}
                    onChange={(e) =>
                      onChange({
                        retirementBenefit: {
                          hasProvision: true,
                          minYears: parseInt(e.target.value) || 3,
                        },
                      })
                    }
                    placeholder="3"
                    className="w-24"
                  />
                  <span className="text-sm">年以上</span>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="hw-reemploy"
                checked={data.reEmployment || false}
                onChange={(e) => onChange({ reEmployment: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="hw-reemploy" className="cursor-pointer">再雇用制度あり</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-pension">企業年金</Label>
              <Input
                id="hw-pension"
                value={data.pension || ""}
                onChange={(e) => onChange({ pension: e.target.value })}
                placeholder="厚生年金基金 / なし"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-childcare">育児休業実績</Label>
              <Input
                id="hw-childcare"
                value={data.childcareLeaveActual || ""}
                onChange={(e) => onChange({ childcareLeaveActual: e.target.value })}
                placeholder="あり / なし"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-care">介護休業実績</Label>
              <Input
                id="hw-care"
                value={data.careLeaveActual || ""}
                onChange={(e) => onChange({ careLeaveActual: e.target.value })}
                placeholder="あり / なし"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-nursing">看護休暇実績</Label>
              <Input
                id="hw-nursing"
                value={data.nursingLeaveActual || ""}
                onChange={(e) => onChange({ nursingLeaveActual: e.target.value })}
                placeholder="あり / なし"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 応募条件 */}
      <div>
        <h3 className="text-base font-semibold mb-3">応募条件</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="hw-licenses">必要な免許・資格</Label>
            <Input
              id="hw-licenses"
              value={data.requiredLicenses || ""}
              onChange={(e) => onChange({ requiredLicenses: e.target.value })}
              placeholder="普通自動車運転免許 必須、介護職員初任者研修 あれば尚可"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-pc">必要なPCスキル</Label>
              <Input
                id="hw-pc"
                value={data.pcSkills || ""}
                onChange={(e) => onChange({ pcSkills: e.target.value })}
                placeholder="Excel基本操作"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hw-edu">学歴</Label>
              <Select
                value={data.educationLevel || "不問"}
                onValueChange={(v) =>
                  onChange({
                    educationLevel: v as HelloWorkSpecificInfo["educationLevel"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-age">年齢制限</Label>
            <Input
              id="hw-age"
              value={data.ageRestriction || ""}
              onChange={(e) => onChange({ ageRestriction: e.target.value })}
              placeholder="不問（デフォルト） / 〇〇歳以下（例外事由: 〇号）"
            />
            <p className="text-xs text-muted-foreground">
              年齢制限を設ける場合は労働基準法の例外事由を併記してください。
            </p>
          </div>
        </div>
      </div>

      {/* 選考（必須） */}
      <div>
        <h3 className="text-base font-semibold mb-3">選考</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>
              選考方法 <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-muted-foreground ml-2">複数可</span>
            </Label>
            <div className="flex gap-4 flex-wrap">
              {SELECTION_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(data.selectionMethods || []).includes(m)}
                    onChange={() =>
                      toggleArrayItem(data.selectionMethods, m, "selectionMethods")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hw-result-days">
                選考結果通知（日数） <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hw-result-days"
                type="number"
                value={data.selectionResultDays ?? ""}
                onChange={(e) =>
                  onChange({
                    selectionResultDays: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              応募書類 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4 flex-wrap">
              {APPLICATION_DOCS.map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(data.applicationDocuments || []).includes(d)}
                    onChange={() =>
                      toggleArrayItem(data.applicationDocuments, d, "applicationDocuments")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              応募方法 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4 flex-wrap">
              {APPLICATION_METHODS_HW.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(data.applicationMethod || []).includes(m)}
                    onChange={() =>
                      toggleArrayItem(data.applicationMethod, m, "applicationMethod")
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 公開範囲（必須） */}
      <div>
        <h3 className="text-base font-semibold mb-3">求人情報の公開範囲</h3>
        <div className="space-y-2">
          <Label>
            公開範囲 <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.publishingScope || PUBLISHING_SCOPES[0]}
            onValueChange={(v) =>
              onChange({ publishingScope: v as HelloWorkPublishingScope })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLISHING_SCOPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 特記事項 */}
      <div>
        <h3 className="text-base font-semibold mb-3">特記事項</h3>
        <div className="space-y-2">
          <Label htmlFor="hw-remarks">求人に関する特記事項</Label>
          <Textarea
            id="hw-remarks"
            value={data.remarks || ""}
            onChange={(e) => onChange({ remarks: e.target.value })}
            placeholder="応募方法の詳細、面接の場所、交通費の有無など"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
