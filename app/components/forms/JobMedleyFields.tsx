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
import { JobMedleySpecificInfo, JobMedleyFacilityType } from "@/types/job-posting";

const FACILITY_TYPES: JobMedleyFacilityType[] = [
  "クリニック",
  "病院",
  "歯科医院",
  "調剤薬局",
  "ドラッグストア",
  "整骨院・接骨院",
  "鍼灸院",
  "介護施設（特養・老健）",
  "介護施設（有料老人ホーム）",
  "デイサービス",
  "訪問介護・看護",
  "保育園・幼稚園",
  "学童保育",
  "障害福祉サービス",
  "その他",
];

interface JobMedleyFieldsProps {
  data: JobMedleySpecificInfo;
  onChange: (data: Partial<JobMedleySpecificInfo>) => void;
}

export function JobMedleyFields({ data, onChange }: JobMedleyFieldsProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        JobMedleyは医療・介護・福祉系の求人サイトです。施設種別が必須です。
      </p>

      {/* 施設種別（必須） */}
      <div className="space-y-2">
        <Label htmlFor="jm-facility">
          施設種別 <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-muted-foreground ml-2">JobMedley必須</span>
        </Label>
        <Select
          value={data.facilityType || ""}
          onValueChange={(v) => onChange({ facilityType: v as JobMedleyFacilityType })}
        >
          <SelectTrigger>
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            {FACILITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jm-break">休憩時間（任意）</Label>
          <Input
            id="jm-break"
            value={data.breakTime || ""}
            onChange={(e) => onChange({ breakTime: e.target.value })}
            placeholder="60分（12:00〜13:00）"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jm-long-holidays">長期休暇・特別休暇（任意）</Label>
          <Input
            id="jm-long-holidays"
            value={data.longTermHolidays || ""}
            onChange={(e) => onChange({ longTermHolidays: e.target.value })}
            placeholder="夏季5日、年末年始6日 など"
          />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <p className="text-sm font-medium">応募率が上がる任意項目</p>

        <div className="space-y-2">
          <Label htmlFor="jm-staff-voice">職員の声（任意）</Label>
          <Textarea
            id="jm-staff-voice"
            value={data.staffVoice || ""}
            onChange={(e) => onChange({ staffVoice: e.target.value })}
            placeholder="実際に働いている職員の声やエピソード（例：残業がほぼないので子育てと両立しやすい）"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jm-atmosphere">職場の環境（任意）</Label>
          <Textarea
            id="jm-atmosphere"
            value={data.workplaceAtmosphere || ""}
            onChange={(e) => onChange({ workplaceAtmosphere: e.target.value })}
            placeholder="年齢層、男女比、社風・雰囲気など（例：20〜50代が在籍、女性7割、落ち着いた雰囲気）"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
