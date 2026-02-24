"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobMedleySpecificInfo } from "@/types/job-posting";

interface JobMedleyFieldsProps {
  data: JobMedleySpecificInfo;
  onChange: (data: Partial<JobMedleySpecificInfo>) => void;
}

export function JobMedleyFields({ data, onChange }: JobMedleyFieldsProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        JobMedley固有の設定です。未記入の場合はAIが自動生成します。
      </p>

      <div className="space-y-2">
        <Label htmlFor="jm-appeal-title">訴求文タイトル（任意・最大30文字）</Label>
        <Input
          id="jm-appeal-title"
          value={data.appealTitle || ""}
          onChange={(e) => onChange({ appealTitle: e.target.value })}
          placeholder="AIが自動生成します（入力は任意）"
          maxLength={30}
        />
        <p className="text-xs text-muted-foreground">
          {(data.appealTitle || "").length}/30文字
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jm-appeal-text">訴求文（任意）</Label>
        <Textarea
          id="jm-appeal-text"
          value={data.appealText || ""}
          onChange={(e) => onChange({ appealText: e.target.value })}
          placeholder="この職場の魅力を伝える文章（AIが自動生成します）"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jm-training">教育体制・研修（任意）</Label>
        <Textarea
          id="jm-training"
          value={data.trainingSystem || ""}
          onChange={(e) => onChange({ trainingSystem: e.target.value })}
          placeholder="OJT研修、外部研修制度など詳しく記載してください"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jm-break">休憩時間（任意）</Label>
        <Input
          id="jm-break"
          value={data.breakTime || ""}
          onChange={(e) => onChange({ breakTime: e.target.value })}
          placeholder="60分（12:00〜13:00）"
        />
      </div>
    </div>
  );
}
