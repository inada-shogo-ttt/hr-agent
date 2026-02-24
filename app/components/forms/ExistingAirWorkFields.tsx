"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExistingPostingFields, AirWorkMetrics } from "@/types/team-b";

interface ExistingAirWorkFieldsProps {
  data: ExistingPostingFields;
  metrics: AirWorkMetrics;
  onChange: (data: Partial<ExistingPostingFields>) => void;
  onMetricsChange: (data: Partial<AirWorkMetrics>) => void;
}

export function ExistingAirWorkFields({ data, metrics, onChange, onMetricsChange }: ExistingAirWorkFieldsProps) {
  return (
    <div className="space-y-8">
      {/* 数値指標 */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="text-base">掲載数値（AirWork）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>表示回数</Label>
              <Input type="number" value={metrics.impressions ?? ""} onChange={(e) => onMetricsChange({ impressions: parseFloat(e.target.value) || undefined })} placeholder="例: 3000" />
            </div>
            <div className="space-y-2">
              <Label>クリック数</Label>
              <Input type="number" value={metrics.clicks ?? ""} onChange={(e) => onMetricsChange({ clicks: parseFloat(e.target.value) || undefined })} placeholder="例: 80" />
            </div>
            <div className="space-y-2">
              <Label>応募数</Label>
              <Input type="number" value={metrics.applications ?? ""} onChange={(e) => onMetricsChange({ applications: parseFloat(e.target.value) || undefined })} placeholder="例: 5" />
            </div>
            <div className="space-y-2">
              <Label>クリック率（%）</Label>
              <Input type="number" step="0.01" value={metrics.ctr ?? ""} onChange={(e) => onMetricsChange({ ctr: parseFloat(e.target.value) || undefined })} placeholder="例: 2.7" />
            </div>
            <div className="space-y-2">
              <Label>クリック単価（円）</Label>
              <Input type="number" value={metrics.cpc ?? ""} onChange={(e) => onMetricsChange({ cpc: parseFloat(e.target.value) || undefined })} placeholder="例: 300" />
            </div>
            <div className="space-y-2">
              <Label>応募完了率（%）</Label>
              <Input type="number" step="0.01" value={metrics.applicationCompleteRate ?? ""} onChange={(e) => onMetricsChange({ applicationCompleteRate: parseFloat(e.target.value) || undefined })} placeholder="例: 6.3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 既存原稿 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">既存原稿（AirWork）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>職種名</Label>
              <Input value={data.jobTitle || ""} onChange={(e) => onChange({ jobTitle: e.target.value })} placeholder="営業事務スタッフ" />
            </div>
            <div className="space-y-2">
              <Label>職種</Label>
              <Input value={data.jobCategory || ""} onChange={(e) => onChange({ jobCategory: e.target.value })} placeholder="事務・オフィスワーク" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>求人キャッチコピー</Label>
            <Input value={data.catchphrase || ""} onChange={(e) => onChange({ catchphrase: e.target.value })} maxLength={40} placeholder="未経験歓迎！充実の研修制度あり" />
          </div>
          <div className="space-y-2">
            <Label>仕事内容</Label>
            <Textarea value={data.jobDescription || ""} onChange={(e) => onChange({ jobDescription: e.target.value })} rows={5} placeholder="具体的な仕事内容" />
          </div>
          <div className="space-y-2">
            <Label>仕事内容の特徴</Label>
            <Input value={data.jobDescriptionFeatures || ""} onChange={(e) => onChange({ jobDescriptionFeatures: e.target.value })} placeholder="PCスキルが身に付く、人と接する仕事" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>勤務地</Label>
              <Input value={data.location || ""} onChange={(e) => onChange({ location: e.target.value })} placeholder="東京都渋谷区〇〇" />
            </div>
            <div className="space-y-2">
              <Label>勤務地の特徴</Label>
              <Input value={data.locationFeatures || ""} onChange={(e) => onChange({ locationFeatures: e.target.value })} placeholder="駅から5分以内" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>喫煙所</Label>
              <Input value={data.smokingArea || ""} onChange={(e) => onChange({ smokingArea: e.target.value })} placeholder="屋内禁煙" />
            </div>
            <div className="space-y-2">
              <Label>職場環境</Label>
              <Input value={data.workEnvironment || ""} onChange={(e) => onChange({ workEnvironment: e.target.value })} placeholder="20〜30代活躍中" />
            </div>
            <div className="space-y-2">
              <Label>出向先</Label>
              <Input value={data.secondmentDestination || ""} onChange={(e) => onChange({ secondmentDestination: e.target.value })} placeholder="なし" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>求める人材</Label>
            <Textarea value={data.requirements || ""} onChange={(e) => onChange({ requirements: e.target.value })} rows={3} placeholder="応募条件" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>年齢の制限</Label>
              <Input value={data.ageRestriction || ""} onChange={(e) => onChange({ ageRestriction: e.target.value })} placeholder="不問" />
            </div>
            <div className="space-y-2">
              <Label>性別の制限</Label>
              <Input value={data.genderRestriction || ""} onChange={(e) => onChange({ genderRestriction: e.target.value })} placeholder="不問" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>採用予定人数</Label>
              <Input value={data.numberOfHires || ""} onChange={(e) => onChange({ numberOfHires: e.target.value })} placeholder="1名" />
            </div>
            <div className="space-y-2">
              <Label>勤務スタイル</Label>
              <Input value={data.workStyle || ""} onChange={(e) => onChange({ workStyle: e.target.value })} placeholder="出社必須" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>給与形態</Label>
              <Input value={data.salary || ""} onChange={(e) => onChange({ salary: e.target.value })} placeholder="月給 250,000円〜" />
            </div>
            <div className="space-y-2">
              <Label>給与の特徴</Label>
              <Input value={data.salaryFeatures || ""} onChange={(e) => onChange({ salaryFeatures: e.target.value })} placeholder="昇給あり" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>給与の補足説明</Label>
              <Input value={data.salarySupplementary || ""} onChange={(e) => onChange({ salarySupplementary: e.target.value })} placeholder="交通費別途支給" />
            </div>
            <div className="space-y-2">
              <Label>給与例</Label>
              <Input value={data.salaryExample || ""} onChange={(e) => onChange({ salaryExample: e.target.value })} placeholder="年収400万円（入社3年目）" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>勤務形態・勤務時間の特徴</Label>
            <Input value={data.workPatternFeatures || ""} onChange={(e) => onChange({ workPatternFeatures: e.target.value })} placeholder="残業月10時間以下" />
          </div>
          <div className="space-y-2">
            <Label>勤務時間・シフト・最低勤務期間の補足</Label>
            <Textarea value={data.workTimeSupplementary || ""} onChange={(e) => onChange({ workTimeSupplementary: e.target.value })} rows={2} placeholder="9:00〜18:00（休憩60分）" />
          </div>
          <div className="space-y-2">
            <Label>休日・休暇</Label>
            <Input value={data.holidays || ""} onChange={(e) => onChange({ holidays: e.target.value })} placeholder="完全週休2日制" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>社会保険</Label>
              <Input value={data.socialInsurance || ""} onChange={(e) => onChange({ socialInsurance: e.target.value })} placeholder="完備" />
            </div>
            <div className="space-y-2">
              <Label>選択できない社会保険がある場合の理由</Label>
              <Input value={data.insuranceExclReason || ""} onChange={(e) => onChange({ insuranceExclReason: e.target.value })} placeholder="" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>福利厚生</Label>
            <Textarea value={data.benefits || ""} onChange={(e) => onChange({ benefits: e.target.value })} rows={2} placeholder="交通費支給、各種手当" />
          </div>
          <div className="space-y-2">
            <Label>福利厚生の補足説明</Label>
            <Input value={data.benefitsSupplementary || ""} onChange={(e) => onChange({ benefitsSupplementary: e.target.value })} placeholder="" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>契約更新期間</Label>
              <Input value={data.contractRenewalPeriod || ""} onChange={(e) => onChange({ contractRenewalPeriod: e.target.value })} placeholder="" />
            </div>
            <div className="space-y-2">
              <Label>試用・研修期間の有無</Label>
              <Input value={data.hasProbationTraining || ""} onChange={(e) => onChange({ hasProbationTraining: e.target.value })} placeholder="あり（3ヶ月）" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>選考の流れ</Label>
            <Textarea value={data.selectionProcess || ""} onChange={(e) => onChange({ selectionProcess: e.target.value })} rows={2} placeholder="書類選考→面接（1回）→内定" />
          </div>
          <div className="space-y-2">
            <Label>選考についての補足説明</Label>
            <Input value={data.selectionSupplementary || ""} onChange={(e) => onChange({ selectionSupplementary: e.target.value })} placeholder="" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>面接地・登録地</Label>
              <Input value={data.interviewLocation || ""} onChange={(e) => onChange({ interviewLocation: e.target.value })} placeholder="" />
            </div>
            <div className="space-y-2">
              <Label>問い合わせ先担当者名</Label>
              <Input value={data.contactPerson || ""} onChange={(e) => onChange({ contactPerson: e.target.value })} placeholder="" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>問い合わせ先メール</Label>
              <Input value={data.contactEmail || ""} onChange={(e) => onChange({ contactEmail: e.target.value })} placeholder="" />
            </div>
            <div className="space-y-2">
              <Label>問い合わせ先電話番号</Label>
              <Input value={data.contactPhone || ""} onChange={(e) => onChange({ contactPhone: e.target.value })} placeholder="" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>応募者情報</Label>
            <Input value={data.applicantInfo || ""} onChange={(e) => onChange({ applicantInfo: e.target.value })} placeholder="" />
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
