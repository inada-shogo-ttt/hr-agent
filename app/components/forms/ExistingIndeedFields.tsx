"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExistingPostingFields, IndeedMetrics } from "@/types/team-b";

interface ExistingIndeedFieldsProps {
  data: ExistingPostingFields;
  metrics: IndeedMetrics;
  onChange: (data: Partial<ExistingPostingFields>) => void;
  onMetricsChange: (data: Partial<IndeedMetrics>) => void;
}

export function ExistingIndeedFields({ data, metrics, onChange, onMetricsChange }: ExistingIndeedFieldsProps) {
  return (
    <div className="space-y-8">
      {/* 数値指標 */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base">掲載数値（Indeed）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>日額予算（円）</Label>
              <Input type="number" value={metrics.dailyBudget ?? ""} onChange={(e) => onMetricsChange({ dailyBudget: parseFloat(e.target.value) || undefined })} placeholder="例: 1000" />
            </div>
            <div className="space-y-2">
              <Label>表示回数</Label>
              <Input type="number" value={metrics.impressions ?? ""} onChange={(e) => onMetricsChange({ impressions: parseFloat(e.target.value) || undefined })} placeholder="例: 5000" />
            </div>
            <div className="space-y-2">
              <Label>クリック数</Label>
              <Input type="number" value={metrics.clicks ?? ""} onChange={(e) => onMetricsChange({ clicks: parseFloat(e.target.value) || undefined })} placeholder="例: 150" />
            </div>
            <div className="space-y-2">
              <Label>応募開始数</Label>
              <Input type="number" value={metrics.applicationStarts ?? ""} onChange={(e) => onMetricsChange({ applicationStarts: parseFloat(e.target.value) || undefined })} placeholder="例: 20" />
            </div>
            <div className="space-y-2">
              <Label>応募数</Label>
              <Input type="number" value={metrics.applications ?? ""} onChange={(e) => onMetricsChange({ applications: parseFloat(e.target.value) || undefined })} placeholder="例: 10" />
            </div>
            <div className="space-y-2">
              <Label>合計予算（利用済）</Label>
              <Input type="number" value={metrics.totalBudgetUsed ?? ""} onChange={(e) => onMetricsChange({ totalBudgetUsed: parseFloat(e.target.value) || undefined })} placeholder="例: 30000" />
            </div>
            <div className="space-y-2">
              <Label>クリック率（%）</Label>
              <Input type="number" step="0.01" value={metrics.ctr ?? ""} onChange={(e) => onMetricsChange({ ctr: parseFloat(e.target.value) || undefined })} placeholder="例: 3.0" />
            </div>
            <div className="space-y-2">
              <Label>クリック単価（円）</Label>
              <Input type="number" value={metrics.cpc ?? ""} onChange={(e) => onMetricsChange({ cpc: parseFloat(e.target.value) || undefined })} placeholder="例: 200" />
            </div>
            <div className="space-y-2">
              <Label>応募開始率（%）</Label>
              <Input type="number" step="0.01" value={metrics.applicationStartRate ?? ""} onChange={(e) => onMetricsChange({ applicationStartRate: parseFloat(e.target.value) || undefined })} placeholder="例: 13.3" />
            </div>
            <div className="space-y-2">
              <Label>応募完了率（%）</Label>
              <Input type="number" step="0.01" value={metrics.applicationCompleteRate ?? ""} onChange={(e) => onMetricsChange({ applicationCompleteRate: parseFloat(e.target.value) || undefined })} placeholder="例: 50.0" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 既存原稿 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">既存原稿（Indeed）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>会社名</Label>
              <Input value={data.companyName || ""} onChange={(e) => onChange({ companyName: e.target.value })} placeholder="株式会社〇〇" />
            </div>
            <div className="space-y-2">
              <Label>職種名</Label>
              <Input value={data.jobTitle || ""} onChange={(e) => onChange({ jobTitle: e.target.value })} placeholder="営業事務" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>キャッチコピー</Label>
            <Input value={data.catchphrase || ""} onChange={(e) => onChange({ catchphrase: e.target.value })} placeholder="未経験OK！残業ほぼなし" maxLength={50} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>採用予定人数</Label>
              <Input value={data.numberOfHires || ""} onChange={(e) => onChange({ numberOfHires: e.target.value })} placeholder="1名" />
            </div>
            <div className="space-y-2">
              <Label>雇用形態</Label>
              <Input value={data.employmentType || ""} onChange={(e) => onChange({ employmentType: e.target.value })} placeholder="正社員" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>勤務地</Label>
            <Input value={data.location || ""} onChange={(e) => onChange({ location: e.target.value })} placeholder="東京都渋谷区〇〇" />
          </div>
          <div className="space-y-2">
            <Label>給与</Label>
            <Input value={data.salary || ""} onChange={(e) => onChange({ salary: e.target.value })} placeholder="月給 250,000円〜350,000円" />
          </div>
          <div className="space-y-2">
            <Label>勤務時間</Label>
            <Input value={data.workingHours || ""} onChange={(e) => onChange({ workingHours: e.target.value })} placeholder="9:00〜18:00" />
          </div>
          <div className="space-y-2">
            <Label>仕事内容</Label>
            <Textarea value={data.jobDescription || ""} onChange={(e) => onChange({ jobDescription: e.target.value })} rows={5} placeholder="具体的な仕事内容を記載" />
          </div>
          <div className="space-y-2">
            <Label>アピールポイント</Label>
            <Textarea value={data.appealPoints || ""} onChange={(e) => onChange({ appealPoints: e.target.value })} rows={3} placeholder="この求人の魅力" />
          </div>
          <div className="space-y-2">
            <Label>求める人材</Label>
            <Textarea value={data.requirements || ""} onChange={(e) => onChange({ requirements: e.target.value })} rows={3} placeholder="応募条件・求めるスキル" />
          </div>
          <div className="space-y-2">
            <Label>休暇休日</Label>
            <Input value={data.holidays || ""} onChange={(e) => onChange({ holidays: e.target.value })} placeholder="土日祝休み、年間休日120日" />
          </div>
          <div className="space-y-2">
            <Label>アクセス</Label>
            <Input value={data.access || ""} onChange={(e) => onChange({ access: e.target.value })} placeholder="渋谷駅 徒歩5分" />
          </div>
          <div className="space-y-2">
            <Label>社会保険</Label>
            <Input value={data.socialInsurance || ""} onChange={(e) => onChange({ socialInsurance: e.target.value })} placeholder="完備（健保・厚生年金・雇用・労災）" />
          </div>
          <div className="space-y-2">
            <Label>試用期間</Label>
            <Input value={data.probationPeriod || ""} onChange={(e) => onChange({ probationPeriod: e.target.value })} placeholder="3ヶ月（条件変更なし）" />
          </div>
          <div className="space-y-2">
            <Label>待遇・福利厚生</Label>
            <Textarea value={data.benefits || ""} onChange={(e) => onChange({ benefits: e.target.value })} rows={3} placeholder="交通費支給、各種手当など" />
          </div>
          <div className="space-y-2">
            <Label>給与の補足</Label>
            <Input value={data.salaryDescription || ""} onChange={(e) => onChange({ salaryDescription: e.target.value })} placeholder="昇給年1回、賞与年2回" />
          </div>
          <div className="space-y-2">
            <Label>採用予算</Label>
            <Input value={data.recruitmentBudget || ""} onChange={(e) => onChange({ recruitmentBudget: e.target.value })} placeholder="50000" />
          </div>
          <div className="space-y-2">
            <Label>サムネイル要望（任意）</Label>
            <Textarea value={data.thumbnailRequirements || ""} onChange={(e) => onChange({ thumbnailRequirements: e.target.value })} rows={2} placeholder="サムネイルのイメージや要望" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
