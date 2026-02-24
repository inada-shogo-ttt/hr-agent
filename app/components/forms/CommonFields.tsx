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
import { CommonJobInfo, EmploymentType, Prefecture } from "@/types/job-posting";

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "正社員",
  "パート・アルバイト",
  "契約社員",
  "派遣社員",
  "業務委託",
  "インターン",
];

const PREFECTURES: Prefecture[] = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

const SOCIAL_INSURANCE_OPTIONS = [
  "雇用保険",
  "労災保険",
  "健康保険",
  "厚生年金",
];

interface CommonFieldsProps {
  data: CommonJobInfo;
  onChange: (data: Partial<CommonJobInfo>) => void;
}

export function CommonFields({ data, onChange }: CommonFieldsProps) {
  const handleSocialInsurance = (option: string, checked: boolean) => {
    const current = data.socialInsurance || [];
    const updated = checked
      ? [...current, option]
      : current.filter((s) => s !== option);
    onChange({ socialInsurance: updated });
  };

  return (
    <div className="space-y-6">
      {/* 会社基本情報 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">会社基本情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">
              会社名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              value={data.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
              placeholder="株式会社〇〇"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">
              業種 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="industry"
              value={data.industry}
              onChange={(e) => onChange({ industry: e.target.value })}
              placeholder="医療・介護、IT、飲食など"
              required
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="companyDescription">会社の説明（任意）</Label>
          <Textarea
            id="companyDescription"
            value={data.companyDescription || ""}
            onChange={(e) => onChange({ companyDescription: e.target.value })}
            placeholder="会社の特徴・強みなど"
            rows={3}
          />
        </div>
      </div>

      {/* 職種情報 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">職種情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">
              職種名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="jobTitle"
              value={data.jobTitle}
              onChange={(e) => onChange({ jobTitle: e.target.value })}
              placeholder="看護師、エンジニア、営業など"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employmentType">
              雇用形態 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.employmentType}
              onValueChange={(v) => onChange({ employmentType: v as EmploymentType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfHires">採用予定人数</Label>
            <Input
              id="numberOfHires"
              type="number"
              min="1"
              value={data.numberOfHires || ""}
              onChange={(e) => onChange({ numberOfHires: parseInt(e.target.value) || undefined })}
              placeholder="若干名の場合は空欄"
            />
          </div>
        </div>
      </div>

      {/* 勤務地 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">勤務地</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prefecture">
              都道府県 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.prefecture}
              onValueChange={(v) => onChange({ prefecture: v as Prefecture })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREFECTURES.map((pref) => (
                  <SelectItem key={pref} value={pref}>
                    {pref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">
              市区町村 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="新宿区、渋谷区など"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">番地・建物名（任意）</Label>
            <Input
              id="address"
              value={data.address || ""}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="1-2-3 〇〇ビル"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nearestStation">最寄り駅（任意）</Label>
            <Input
              id="nearestStation"
              value={data.nearestStation || ""}
              onChange={(e) => onChange({ nearestStation: e.target.value })}
              placeholder="〇〇駅"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="accessFromStation">駅からのアクセス（任意）</Label>
            <Input
              id="accessFromStation"
              value={data.accessFromStation || ""}
              onChange={(e) => onChange({ accessFromStation: e.target.value })}
              placeholder="〇〇駅から徒歩5分"
            />
          </div>
        </div>
      </div>

      {/* 給与 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">給与</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="salaryType">
              給与形態 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.salaryType}
              onValueChange={(v) =>
                onChange({ salaryType: v as CommonJobInfo["salaryType"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["時給", "日給", "月給", "年収"].map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="salaryMin">
              給与（下限）<span className="text-red-500">*</span>
            </Label>
            <Input
              id="salaryMin"
              type="number"
              value={data.salaryMin}
              onChange={(e) => onChange({ salaryMin: parseInt(e.target.value) || 0 })}
              placeholder="200000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salaryMax">給与（上限）（任意）</Label>
            <Input
              id="salaryMax"
              type="number"
              value={data.salaryMax || ""}
              onChange={(e) =>
                onChange({ salaryMax: parseInt(e.target.value) || undefined })
              }
              placeholder="300000"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="salaryDescription">給与補足（任意）</Label>
          <Input
            id="salaryDescription"
            value={data.salaryDescription || ""}
            onChange={(e) => onChange({ salaryDescription: e.target.value })}
            placeholder="昇給あり、各種手当含む など"
          />
        </div>
      </div>

      {/* 勤務時間 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">勤務時間</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workingHours">
              勤務時間 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="workingHours"
              value={data.workingHours}
              onChange={(e) => onChange({ workingHours: e.target.value })}
              placeholder="9:00〜18:00（休憩1時間）"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workingHoursDescription">勤務時間補足（任意）</Label>
            <Input
              id="workingHoursDescription"
              value={data.workingHoursDescription || ""}
              onChange={(e) => onChange({ workingHoursDescription: e.target.value })}
              placeholder="シフト制、フレックスタイム制 など"
            />
          </div>
        </div>
      </div>

      {/* 仕事内容 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">仕事内容</h3>
        <div className="space-y-2">
          <Label htmlFor="jobDescription">
            仕事内容 <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="jobDescription"
            value={data.jobDescription}
            onChange={(e) => onChange({ jobDescription: e.target.value })}
            placeholder="具体的な業務内容を入力してください"
            rows={5}
            required
          />
        </div>
      </div>

      {/* 求める人材 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">求める人材</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requirements">
              応募要件 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="requirements"
              value={data.requirements}
              onChange={(e) => onChange({ requirements: e.target.value })}
              placeholder="必要な資格・経験・スキルなど"
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeRequirements">歓迎要件（任意）</Label>
            <Textarea
              id="welcomeRequirements"
              value={data.welcomeRequirements || ""}
              onChange={(e) => onChange({ welcomeRequirements: e.target.value })}
              placeholder="あれば望ましい経験・スキルなど"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* 休暇・休日 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">休暇・休日</h3>
        <div className="space-y-2">
          <Label htmlFor="holidays">
            休暇・休日 <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="holidays"
            value={data.holidays}
            onChange={(e) => onChange({ holidays: e.target.value })}
            placeholder="週休2日制（土日祝）、年間休日120日など"
            rows={3}
            required
          />
        </div>
      </div>

      {/* 待遇・福利厚生 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">待遇・福利厚生</h3>
        <div className="space-y-2">
          <Label htmlFor="benefits">
            待遇・福利厚生 <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="benefits"
            value={data.benefits}
            onChange={(e) => onChange({ benefits: e.target.value })}
            placeholder="各種手当、退職金制度、資格取得支援など"
            rows={3}
            required
          />
        </div>
      </div>

      {/* 社会保険 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">社会保険</h3>
        <div className="flex gap-4 flex-wrap">
          {SOCIAL_INSURANCE_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.socialInsurance?.includes(option) || false}
                onChange={(e) => handleSocialInsurance(option, e.target.checked)}
                className="w-4 h-4"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 試用期間 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">試用期間</h3>
        <div className="space-y-2">
          <Label htmlFor="probationPeriod">試用期間（任意）</Label>
          <Input
            id="probationPeriod"
            value={data.probationPeriod || ""}
            onChange={(e) => onChange({ probationPeriod: e.target.value })}
            placeholder="3ヶ月（条件変更なし）"
          />
        </div>
      </div>

      {/* 選考情報 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">選考情報</h3>
        <div className="space-y-2">
          <Label htmlFor="selectionProcess">選考の流れ（任意）</Label>
          <Textarea
            id="selectionProcess"
            value={data.selectionProcess || ""}
            onChange={(e) => onChange({ selectionProcess: e.target.value })}
            placeholder="応募→書類選考→面接1回→内定"
            rows={3}
          />
        </div>
      </div>

      {/* AI向けメモ */}
      <div>
        <h3 className="text-lg font-semibold mb-4">AI向け補足情報（任意）</h3>
        <p className="text-sm text-muted-foreground mb-4">
          より精度の高い原稿を生成するための補足情報です。AIのみが参照します。
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appealPoints">アピールポイント</Label>
            <Textarea
              id="appealPoints"
              value={data.appealPoints || ""}
              onChange={(e) => onChange({ appealPoints: e.target.value })}
              placeholder="この求人の特に強調したいポイント"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAudience">ターゲット層</Label>
            <Input
              id="targetAudience"
              value={data.targetAudience || ""}
              onChange={(e) => onChange({ targetAudience: e.target.value })}
              placeholder="20代後半〜30代のキャリアチェンジ希望者など"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="competitiveAdvantage">競合優位性</Label>
            <Textarea
              id="competitiveAdvantage"
              value={data.competitiveAdvantage || ""}
              onChange={(e) => onChange({ competitiveAdvantage: e.target.value })}
              placeholder="同業他社と比べた強み・差別化ポイント"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
