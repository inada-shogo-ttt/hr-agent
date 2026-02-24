"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExistingPostingFields } from "@/types/team-b";

interface ExistingJobMedleyFieldsProps {
  data: ExistingPostingFields;
  onChange: (data: Partial<ExistingPostingFields>) => void;
}

export function ExistingJobMedleyFields({ data, onChange }: ExistingJobMedleyFieldsProps) {
  return (
    <div className="space-y-8">
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-base">掲載数値（JobMedley）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            JobMedleyは数値指標の入力は不要です。原稿の定性分析のみ実施します。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">既存原稿（JobMedley）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>訴求文タイトル</Label>
            <Input value={data.appealTitle || ""} onChange={(e) => onChange({ appealTitle: e.target.value })} placeholder="【急募】看護師募集！日勤のみ" maxLength={30} />
            <p className="text-xs text-muted-foreground">{(data.appealTitle || "").length}/30文字</p>
          </div>
          <div className="space-y-2">
            <Label>訴求文</Label>
            <Textarea value={data.appealText || ""} onChange={(e) => onChange({ appealText: e.target.value })} rows={4} placeholder="この職場の魅力を伝える文章" />
          </div>
          <div className="space-y-2">
            <Label>仕事内容</Label>
            <Textarea value={data.jobDescription || ""} onChange={(e) => onChange({ jobDescription: e.target.value })} rows={5} placeholder="具体的な仕事内容" />
          </div>
          <div className="space-y-2">
            <Label>サービス形態</Label>
            <Input value={data.serviceType || ""} onChange={(e) => onChange({ serviceType: e.target.value })} placeholder="病院、クリニック、介護施設など" />
          </div>
          <div className="space-y-2">
            <Label>雇用形態と給与</Label>
            <Input value={data.employmentTypeAndSalary || ""} onChange={(e) => onChange({ employmentTypeAndSalary: e.target.value })} placeholder="正社員 月給250,000円〜" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>給与の備考</Label>
              <Input value={data.salaryNotes || ""} onChange={(e) => onChange({ salaryNotes: e.target.value })} placeholder="経験・能力により優遇" />
            </div>
            <div className="space-y-2">
              <Label>想定年収</Label>
              <Input value={data.estimatedAnnualIncome || ""} onChange={(e) => onChange({ estimatedAnnualIncome: e.target.value })} placeholder="350万〜500万円" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>待遇</Label>
            <Textarea value={data.benefits || ""} onChange={(e) => onChange({ benefits: e.target.value })} rows={2} placeholder="交通費支給、各種手当" />
          </div>
          <div className="space-y-2">
            <Label>教育体制・研修</Label>
            <Textarea value={data.trainingSystem || ""} onChange={(e) => onChange({ trainingSystem: e.target.value })} rows={3} placeholder="OJT研修、外部研修制度など" />
          </div>
          <div className="space-y-2">
            <Label>勤務時間・休憩時間</Label>
            <Input value={data.workingHours || ""} onChange={(e) => onChange({ workingHours: e.target.value })} placeholder="9:00〜18:00（休憩60分）" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>休日</Label>
              <Input value={data.holidays || ""} onChange={(e) => onChange({ holidays: e.target.value })} placeholder="土日祝" />
            </div>
            <div className="space-y-2">
              <Label>長期休暇・特別休暇</Label>
              <Input value={data.longTermHolidays || ""} onChange={(e) => onChange({ longTermHolidays: e.target.value })} placeholder="夏季休暇、年末年始休暇" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>応募要件</Label>
            <Textarea value={data.requirements || ""} onChange={(e) => onChange({ requirements: e.target.value })} rows={3} placeholder="必須条件" />
          </div>
          <div className="space-y-2">
            <Label>歓迎要件</Label>
            <Textarea value={data.welcomeRequirements || ""} onChange={(e) => onChange({ welcomeRequirements: e.target.value })} rows={2} placeholder="あれば望ましい条件" />
          </div>
          <div className="space-y-2">
            <Label>アクセス</Label>
            <Input value={data.access || ""} onChange={(e) => onChange({ access: e.target.value })} placeholder="〇〇駅 徒歩5分" />
          </div>
          <div className="space-y-2">
            <Label>選考プロセス</Label>
            <Textarea value={data.selectionProcess || ""} onChange={(e) => onChange({ selectionProcess: e.target.value })} rows={2} placeholder="書類選考→面接→内定" />
          </div>
          <div className="space-y-2">
            <Label>サムネイル要望（任意）</Label>
            <Textarea value={data.thumbnailRequirements || ""} onChange={(e) => onChange({ thumbnailRequirements: e.target.value })} rows={2} placeholder="サムネイルのイメージ" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
