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

interface AirWorkFieldsProps {
  data: AirWorkSpecificInfo;
  onChange: (data: Partial<AirWorkSpecificInfo>) => void;
}

export function AirWorkFields({ data, onChange }: AirWorkFieldsProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        AirWork固有の設定です。未記入の場合はAIが自動生成します。
      </p>

      <div className="space-y-2">
        <Label htmlFor="airwork-catchphrase">キャッチコピー（任意・最大40文字）</Label>
        <Input
          id="airwork-catchphrase"
          value={data.catchphrase || ""}
          onChange={(e) => onChange({ catchphrase: e.target.value })}
          placeholder="AIが自動生成します（入力は任意）"
          maxLength={40}
        />
        <p className="text-xs text-muted-foreground">
          {(data.catchphrase || "").length}/40文字
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="airwork-workstyle">勤務スタイル</Label>
        <Select
          value={data.workStyle || "出社必須"}
          onValueChange={(v) =>
            onChange({ workStyle: v as AirWorkSpecificInfo["workStyle"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["在宅可", "完全在宅", "出社必須", "ハイブリッド"].map((style) => (
              <SelectItem key={style} value={style}>
                {style}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
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
