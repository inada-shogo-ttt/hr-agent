"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IndeedSpecificInfo } from "@/types/job-posting";

interface IndeedFieldsProps {
  data: IndeedSpecificInfo;
  onChange: (data: Partial<IndeedSpecificInfo>) => void;
}

export function IndeedFields({ data, onChange }: IndeedFieldsProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Indeed固有の設定です。未記入の場合はAIが自動生成します。
      </p>

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

      <div className="space-y-2">
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
