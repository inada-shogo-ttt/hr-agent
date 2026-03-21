"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExistingPostingFields } from "@/types/team-b";

interface ExistingHelloWorkFieldsProps {
  data: ExistingPostingFields;
  onChange: (data: Partial<ExistingPostingFields>) => void;
}

export function ExistingHelloWorkFields({ data, onChange }: ExistingHelloWorkFieldsProps) {
  return (
    <div className="space-y-8">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base">掲載数値（ハローワーク）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ハローワークは数値指標の入力は不要です。原稿の定性分析のみ実施します。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">既存原稿（ハローワーク）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 mb-4">
            ハローワークの求人票は全角文字のみ使用し、絵文字は使用できません。
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>事業所名</Label>
              <Input value={data.companyName || ""} onChange={(e) => onChange({ companyName: e.target.value })} placeholder="株式会社〇〇" />
            </div>
            <div className="space-y-2">
              <Label>職種</Label>
              <Input value={data.jobTitle || ""} onChange={(e) => onChange({ jobTitle: e.target.value })} placeholder="事務職" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>所在地</Label>
            <Input value={data.companyAddress || ""} onChange={(e) => onChange({ companyAddress: e.target.value })} placeholder="岩手県花巻市不動町１丁目１番地１" />
          </div>
          <div className="space-y-2">
            <Label>就業場所</Label>
            <Input value={data.workLocation || ""} onChange={(e) => onChange({ workLocation: e.target.value })} placeholder="事業所所在地と同じ" />
          </div>
          <div className="space-y-2">
            <Label>仕事の内容</Label>
            <Textarea value={data.jobDescription || ""} onChange={(e) => onChange({ jobDescription: e.target.value })} rows={5} placeholder="具体的な仕事内容を全角で記載" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>雇用形態</Label>
              <Input value={data.employmentType || ""} onChange={(e) => onChange({ employmentType: e.target.value })} placeholder="パート労働者" />
            </div>
            <div className="space-y-2">
              <Label>雇用期間</Label>
              <Input value={data.employmentPeriod || ""} onChange={(e) => onChange({ employmentPeriod: e.target.value })} placeholder="雇用期間の定めあり（４ヶ月以上）" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>契約更新の可能性</Label>
            <Input value={data.contractRenewal || ""} onChange={(e) => onChange({ contractRenewal: e.target.value })} placeholder="あり" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>賃金形態</Label>
              <Input value={data.wageType || ""} onChange={(e) => onChange({ wageType: e.target.value })} placeholder="時間給" />
            </div>
            <div className="space-y-2">
              <Label>賃金額</Label>
              <Input value={data.wageAmount || ""} onChange={(e) => onChange({ wageAmount: e.target.value })} placeholder="１，１９３円〜１，１９３円" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>手当</Label>
            <Input value={data.allowances || ""} onChange={(e) => onChange({ allowances: e.target.value })} placeholder="なし" />
          </div>
          <div className="space-y-2">
            <Label>通勤手当</Label>
            <Input value={data.commutingAllowance || ""} onChange={(e) => onChange({ commutingAllowance: e.target.value })} placeholder="実費支給（上限あり）月額　５５，０００円" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>賞与</Label>
              <Input value={data.bonus || ""} onChange={(e) => onChange({ bonus: e.target.value })} placeholder="あり（前年度実績）年２回" />
            </div>
            <div className="space-y-2">
              <Label>昇給</Label>
              <Input value={data.raise || ""} onChange={(e) => onChange({ raise: e.target.value })} placeholder="なし" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>就業時間</Label>
              <Input value={data.workingHours || ""} onChange={(e) => onChange({ workingHours: e.target.value })} placeholder="０９時００分〜１５時００分" />
            </div>
            <div className="space-y-2">
              <Label>時間外労働</Label>
              <Input value={data.overtime || ""} onChange={(e) => onChange({ overtime: e.target.value })} placeholder="なし" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>休憩時間</Label>
              <Input value={data.breakTime || ""} onChange={(e) => onChange({ breakTime: e.target.value })} placeholder="６０分" />
            </div>
            <div className="space-y-2">
              <Label>年次有給休暇</Label>
              <Input value={data.annualLeave || ""} onChange={(e) => onChange({ annualLeave: e.target.value })} placeholder="６ヶ月経過後　１０日" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>休日</Label>
            <Input value={data.holidays || ""} onChange={(e) => onChange({ holidays: e.target.value })} placeholder="土　日　祝日　その他　週休二日制　毎週" />
          </div>
          <div className="space-y-2">
            <Label>加入保険</Label>
            <Input value={data.insurance || ""} onChange={(e) => onChange({ insurance: e.target.value })} placeholder="雇用　労災　健康　厚生" />
          </div>
          <div className="space-y-2">
            <Label>企業年金</Label>
            <Input value={data.pension || ""} onChange={(e) => onChange({ pension: e.target.value })} placeholder="厚生年金基金" />
          </div>
          <div className="space-y-2">
            <Label>試用期間</Label>
            <Input value={data.trialPeriod || ""} onChange={(e) => onChange({ trialPeriod: e.target.value })} placeholder="試用期間なし" />
          </div>
          <div className="space-y-2">
            <Label>必要な経験・知識・技能等</Label>
            <Textarea value={data.requirements || ""} onChange={(e) => onChange({ requirements: e.target.value })} rows={3} placeholder="不問" />
          </div>
          <div className="space-y-2">
            <Label>必要な免許・資格</Label>
            <Input value={data.requiredLicenses || ""} onChange={(e) => onChange({ requiredLicenses: e.target.value })} placeholder="普通自動車運転免許　必須" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>選考方法</Label>
              <Input value={data.selectionMethod || ""} onChange={(e) => onChange({ selectionMethod: e.target.value })} placeholder="面接（予定１回）" />
            </div>
            <div className="space-y-2">
              <Label>応募書類</Label>
              <Input value={data.applicationDocuments || ""} onChange={(e) => onChange({ applicationDocuments: e.target.value })} placeholder="ハローワーク紹介状　履歴書" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>求人に関する特記事項</Label>
            <Textarea value={data.remarks || ""} onChange={(e) => onChange({ remarks: e.target.value })} rows={4} placeholder="応募方法や面接の詳細など" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
