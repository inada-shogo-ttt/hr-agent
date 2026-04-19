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
import { IndeedSpecificInfo } from "@/types/job-posting";

const INDEED_FEATURE_TAG_OPTIONS = [
  "未経験歓迎",
  "学歴不問",
  "資格取得支援",
  "昇給あり",
  "賞与あり",
  "残業少なめ",
  "週休2日",
  "土日祝休み",
  "在宅勤務可",
  "時短勤務可",
  "子育て支援",
  "第二新卒歓迎",
];

interface IndeedFieldsProps {
  data: IndeedSpecificInfo;
  onChange: (data: Partial<IndeedSpecificInfo>) => void;
}

export function IndeedFields({ data, onChange }: IndeedFieldsProps) {
  const tags = data.featureTags || [];
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      onChange({ featureTags: tags.filter((t) => t !== tag) });
    } else if (tags.length < 3) {
      onChange({ featureTags: [...tags, tag] });
    }
  };

  const screening = data.screeningQuestions || [];
  const updateScreening = (idx: number, value: string) => {
    const next = [...screening];
    next[idx] = value;
    onChange({ screeningQuestions: next });
  };
  const addScreening = () => onChange({ screeningQuestions: [...screening, ""] });
  const removeScreening = (idx: number) => {
    onChange({ screeningQuestions: screening.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Indeed固有の設定です。未記入の場合はAIが自動生成します。
      </p>

      {/* キャッチコピー（任意） */}
      <div className="space-y-2">
        <Label htmlFor="indeed-catchphrase">キャッチコピー（任意・最大50文字）</Label>
        <Input
          id="indeed-catchphrase"
          value={data.catchphrase || ""}
          onChange={(e) => onChange({ catchphrase: e.target.value })}
          placeholder="AIが自動生成します（入力は任意）"
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          {(data.catchphrase || "").length}/50文字
        </p>
      </div>

      {/* 応募設定（必須） */}
      <div className="space-y-3 border-t pt-4">
        <Label>
          応募設定 <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-muted-foreground ml-2">Indeed必須</span>
        </Label>
        <Select
          value={data.applicationMethod || ""}
          onValueChange={(v) => onChange({ applicationMethod: v as IndeedSpecificInfo["applicationMethod"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Indeed応募">Indeed応募（フォーム経由）</SelectItem>
            <SelectItem value="外部URL">外部URL（採用ページ等）</SelectItem>
          </SelectContent>
        </Select>
        {data.applicationMethod === "外部URL" && (
          <Input
            value={data.applicationUrl || ""}
            onChange={(e) => onChange({ applicationUrl: e.target.value })}
            placeholder="https://example.com/recruit/apply"
          />
        )}
      </div>

      {/* スクリーニング質問（任意） */}
      <div className="space-y-2 border-t pt-4">
        <Label>応募者への質問（任意・スクリーニング質問）</Label>
        <p className="text-xs text-muted-foreground">
          応募時に求職者へ自動質問されます。例：「保有資格を教えてください」
        </p>
        {screening.map((q, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => updateScreening(i, e.target.value)}
              placeholder={`質問 ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => removeScreening(i)}
              className="text-xs text-red-500 hover:underline"
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addScreening}
          className="text-xs text-blue-600 hover:underline"
        >
          + 質問を追加
        </button>
      </div>

      {/* 特長タグ */}
      <div className="space-y-2 border-t pt-4">
        <Label>特長タグ（最大3つ）</Label>
        <p className="text-xs text-muted-foreground">
          Indeedの「特長」に掲載されるタグを最大3つまで選択できます。
        </p>
        <div className="flex gap-2 flex-wrap">
          {INDEED_FEATURE_TAG_OPTIONS.map((tag) => {
            const selected = tags.includes(tag);
            const disabled = !selected && tags.length >= 3;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                disabled={disabled}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selected
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : disabled
                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{tags.length}/3 選択中</p>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="indeed-budget">採用予算（円・任意）</Label>
        <Input
          id="indeed-budget"
          type="number"
          value={data.recruitmentBudget || ""}
          onChange={(e) =>
            onChange({ recruitmentBudget: parseInt(e.target.value) || undefined })
          }
          placeholder="例: 50000"
        />
        <p className="text-xs text-muted-foreground">
          Indeedの運用予算（原稿には含まれません。Team Bの予算最適化で使用）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="indeed-thumbnail">サムネイル要望（任意）</Label>
        <Textarea
          id="indeed-thumbnail"
          value={data.thumbnailRequirements || ""}
          onChange={(e) => onChange({ thumbnailRequirements: e.target.value })}
          placeholder="サムネイルのイメージや要望を入力（例：清潔感のある白を基調とした画像）"
          rows={3}
        />
      </div>
    </div>
  );
}
