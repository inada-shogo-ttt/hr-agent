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
import { AirWorkSpecificInfo } from "@/types/job-posting";

const AIRWORK_FEATURE_TAG_OPTIONS = [
  "未経験歓迎",
  "学歴不問",
  "髪色・髪型自由",
  "服装自由",
  "シフト自由",
  "週1日〜OK",
  "1日3時間〜OK",
  "短期OK",
  "長期歓迎",
  "社員登用あり",
  "交通費支給",
  "まかないあり",
  "駅チカ",
  "車・バイク通勤可",
];

const WORK_DAYS = ["月", "火", "水", "木", "金", "土", "日", "祝"];
const APPLICATION_METHODS = ["Web", "メール", "電話"] as const;
const APPLICANT_INFO_OPTIONS = [
  "氏名",
  "電話番号",
  "メールアドレス",
  "住所",
  "最終学歴",
  "職務経歴",
  "保有資格",
  "志望動機",
];

interface AirWorkFieldsProps {
  data: AirWorkSpecificInfo;
  onChange: (data: Partial<AirWorkSpecificInfo>) => void;
}

export function AirWorkFields({ data, onChange }: AirWorkFieldsProps) {
  const tags = data.featureTags || [];
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      onChange({ featureTags: tags.filter((t) => t !== tag) });
    } else {
      onChange({ featureTags: [...tags, tag] });
    }
  };

  const trial = data.trialPeriod || { hasProvision: false };
  const updateTrial = (patch: Partial<typeof trial>) => {
    onChange({ trialPeriod: { ...trial, ...patch } });
  };

  const methods = data.applicationReceiveMethod || [];
  const toggleMethod = (m: typeof APPLICATION_METHODS[number]) => {
    onChange({
      applicationReceiveMethod: methods.includes(m)
        ? methods.filter((x) => x !== m)
        : [...methods, m],
    });
  };

  const applicantInfo = data.applicantInfoToGet || [];
  const toggleApplicantInfo = (info: string) => {
    onChange({
      applicantInfoToGet: applicantInfo.includes(info)
        ? applicantInfo.filter((x) => x !== info)
        : [...applicantInfo, info],
    });
  };

  const days = data.workDays || [];
  const toggleDay = (d: string) => {
    onChange({ workDays: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Airワーク固有の設定です。未記入の場合はAIが自動生成します。
      </p>

      {/* 採用HP側のキャッチコピー（任意） */}
      <div className="space-y-2">
        <Label htmlFor="airwork-hp-catchphrase">採用HP向けキャッチコピー（任意・最大40文字）</Label>
        <p className="text-xs text-muted-foreground">
          Airワーク採用HPに表示されるキャッチコピー。求人ページ本体には使用されません。
        </p>
        <Input
          id="airwork-hp-catchphrase"
          value={data.hpCatchphrase || data.catchphrase || ""}
          onChange={(e) => onChange({ hpCatchphrase: e.target.value })}
          placeholder="採用HPトップのメインコピー"
          maxLength={40}
        />
      </div>

      {/* 試用・研修（必須） */}
      <div className="space-y-3 border-t pt-4">
        <Label>
          試用・研修 <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-muted-foreground ml-2">Airワーク必須項目</span>
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="airwork-trial-has"
            checked={trial.hasProvision}
            onChange={(e) => updateTrial({ hasProvision: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="airwork-trial-has" className="cursor-pointer font-normal">
            試用期間・研修期間あり
          </Label>
        </div>
        {trial.hasProvision && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="airwork-trial-duration">期間</Label>
              <Input
                id="airwork-trial-duration"
                value={trial.duration || ""}
                onChange={(e) => updateTrial({ duration: e.target.value })}
                placeholder="例: 3ヶ月"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airwork-trial-conditions">労働条件の違い</Label>
              <Input
                id="airwork-trial-conditions"
                value={trial.conditions || ""}
                onChange={(e) => updateTrial({ conditions: e.target.value })}
                placeholder="条件変更なし / 時給990円 など"
              />
            </div>
          </div>
        )}
      </div>

      {/* 応募受付方法（必須） */}
      <div className="space-y-2 border-t pt-4">
        <Label>
          応募受付方法 <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-muted-foreground ml-2">必須・複数可</span>
        </Label>
        <div className="flex gap-4 flex-wrap">
          {APPLICATION_METHODS.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={methods.includes(m)}
                onChange={() => toggleMethod(m)}
                className="w-4 h-4"
              />
              <span>{m}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 取得する情報（必須） */}
      <div className="space-y-2 border-t pt-4">
        <Label>
          応募者から取得する情報 <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-muted-foreground ml-2">必須・複数可</span>
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {APPLICANT_INFO_OPTIONS.map((info) => (
            <label key={info} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applicantInfo.includes(info)}
                onChange={() => toggleApplicantInfo(info)}
                className="w-4 h-4"
              />
              <span className="text-sm">{info}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 勤務曜日 */}
      <div className="space-y-2 border-t pt-4">
        <Label>勤務曜日（任意）</Label>
        <div className="flex gap-3 flex-wrap">
          {WORK_DAYS.map((d) => (
            <label key={d} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={days.includes(d)}
                onChange={() => toggleDay(d)}
                className="w-4 h-4"
              />
              <span className="text-sm">{d}</span>
            </label>
          ))}
        </div>
      </div>

      {/* シフト・勤務期間・交通費 */}
      <div className="space-y-4 border-t pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="airwork-period">勤務期間（任意）</Label>
            <Select
              value={data.workPeriod || ""}
              onValueChange={(v) => onChange({ workPeriod: v as AirWorkSpecificInfo["workPeriod"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="長期">長期</SelectItem>
                <SelectItem value="短期">短期</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="airwork-commute">交通費（任意）</Label>
            <Select
              value={data.commuteAllowance || ""}
              onValueChange={(v) => onChange({ commuteAllowance: v as AirWorkSpecificInfo["commuteAllowance"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全額支給">全額支給</SelectItem>
                <SelectItem value="上限あり">上限あり</SelectItem>
                <SelectItem value="なし">なし</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="airwork-shift-policy">シフトの決め方（任意）</Label>
          <Input
            id="airwork-shift-policy"
            value={data.shiftPolicy || ""}
            onChange={(e) => onChange({ shiftPolicy: e.target.value })}
            placeholder="2週間ごとのシフト希望制 など"
          />
        </div>
      </div>

      {/* 特徴タグ */}
      <div className="space-y-2 border-t pt-4">
        <Label>特徴タグ（任意）</Label>
        <p className="text-xs text-muted-foreground">
          Airワークの「特徴」（チェックボックス式）に対応。
        </p>
        <div className="flex gap-2 flex-wrap">
          {AIRWORK_FEATURE_TAG_OPTIONS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selected
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{tags.length} 個選択中</p>
      </div>

      {/* 応募につながる任意項目 */}
      <div className="space-y-4 border-t pt-4">
        <p className="text-sm font-medium">応募につながる任意項目</p>

        <div className="space-y-2">
          <Label htmlFor="airwork-shift-income">シフト・収入例（任意）</Label>
          <Textarea
            id="airwork-shift-income"
            value={data.shiftIncomeExample || ""}
            onChange={(e) => onChange({ shiftIncomeExample: e.target.value })}
            placeholder="週3日勤務で月収12万円、週5日勤務で月収20万円 など"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="airwork-senior-msg">先輩スタッフからの一言（任意）</Label>
          <Textarea
            id="airwork-senior-msg"
            value={data.seniorStaffMessage || ""}
            onChange={(e) => onChange({ seniorStaffMessage: e.target.value })}
            placeholder="働いている先輩スタッフの声や職場の魅力"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="airwork-atmosphere">職場の環境・雰囲気（任意）</Label>
          <Textarea
            id="airwork-atmosphere"
            value={data.workplaceAtmosphere || ""}
            onChange={(e) => onChange({ workplaceAtmosphere: e.target.value })}
            placeholder="20代〜30代が中心、アットホームな雰囲気 など"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="airwork-interview">社員インタビュー（任意・採用HP側）</Label>
          <Textarea
            id="airwork-interview"
            value={data.companyInterview || ""}
            onChange={(e) => onChange({ companyInterview: e.target.value })}
            placeholder="採用HPに掲載する社員インタビュー"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="airwork-application-flow">応募の流れ（任意）</Label>
          <Textarea
            id="airwork-application-flow"
            value={data.applicationFlow || ""}
            onChange={(e) => onChange({ applicationFlow: e.target.value })}
            placeholder="応募→電話連絡（1〜3日以内）→面接（1回）→採用 など"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="airwork-contact">問い合わせ電話番号（任意）</Label>
          <Input
            id="airwork-contact"
            value={data.contactPhone || ""}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
            placeholder="03-0000-0000"
          />
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="airwork-thumbnail">サムネイル要望（任意）</Label>
        <Textarea
          id="airwork-thumbnail"
          value={data.thumbnailRequirements || ""}
          onChange={(e) => onChange({ thumbnailRequirements: e.target.value })}
          placeholder="サムネイルのイメージや要望を入力"
          rows={3}
        />
      </div>
    </div>
  );
}
