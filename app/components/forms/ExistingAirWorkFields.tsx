"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExistingPostingFields, AirWorkMetrics } from "@/types/team-b";
import {
  Users,
  MousePointerClick,
  Eye,
  ChevronDown,
  ChevronUp,
  Calculator,
  Sparkles,
  PartyPopper,
  Frown,
} from "lucide-react";

interface ExistingAirWorkFieldsProps {
  data: ExistingPostingFields;
  metrics: AirWorkMetrics;
  onChange: (data: Partial<ExistingPostingFields>) => void;
  onMetricsChange: (data: Partial<AirWorkMetrics>) => void;
}

function getApplicationEmoji(count: number | undefined) {
  if (count === undefined) return null;
  if (count === 0) return { icon: Frown, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", message: "まだ応募がありません...改善しましょう！", ring: "ring-red-200" };
  if (count <= 2) return { icon: Sparkles, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", message: "応募が来ています！もっと増やしましょう", ring: "ring-orange-200" };
  if (count <= 5) return { icon: Sparkles, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", message: "いい感じです！さらに伸ばせるかも", ring: "ring-blue-200" };
  return { icon: PartyPopper, color: "text-green-500", bg: "bg-green-50", border: "border-green-200", message: "素晴らしい！この調子でいきましょう", ring: "ring-green-200" };
}

export function ExistingAirWorkFields({ data, metrics, onChange, onMetricsChange }: ExistingAirWorkFieldsProps) {
  const [showCalculated, setShowCalculated] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});

  // 自動計算
  const calcCtr = metrics.impressions && metrics.clicks
    ? Math.round((metrics.clicks / metrics.impressions) * 10000) / 100
    : undefined;
  const calcAppCompleteRate = metrics.clicks && metrics.applications
    ? Math.round((metrics.applications / metrics.clicks) * 10000) / 100
    : undefined;
  const calcCpc = metrics.cpc; // AirWorkにはtotalBudgetUsedがないのでそのまま

  // 自動計算値を反映
  const onMetricsChangeRef = useRef(onMetricsChange);
  onMetricsChangeRef.current = onMetricsChange;

  useEffect(() => {
    const updates: Partial<AirWorkMetrics> = {};
    if (!manualOverrides.ctr && calcCtr !== undefined) updates.ctr = calcCtr;
    if (!manualOverrides.applicationCompleteRate && calcAppCompleteRate !== undefined) updates.applicationCompleteRate = calcAppCompleteRate;
    if (Object.keys(updates).length > 0) onMetricsChangeRef.current(updates);
  }, [calcCtr, calcAppCompleteRate, manualOverrides]);

  const handleManualOverride = (field: string, value: string) => {
    setManualOverrides((prev) => ({ ...prev, [field]: value !== "" }));
    onMetricsChange({ [field]: value === "" ? undefined : parseFloat(value) });
  };

  const displayCtr = manualOverrides.ctr ? metrics.ctr : (calcCtr ?? metrics.ctr);
  const displayAppCompleteRate = manualOverrides.applicationCompleteRate ? metrics.applicationCompleteRate : (calcAppCompleteRate ?? metrics.applicationCompleteRate);
  const displayCpc = metrics.cpc;

  const appStatus = getApplicationEmoji(metrics.applications);

  return (
    <div className="space-y-8">
      {/* 掲載数値セクション */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-orange-500 rounded-full" />
          <h3 className="text-lg font-bold text-gray-800">掲載データを入力</h3>
          <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">AirWork</span>
        </div>
        <p className="text-sm text-muted-foreground -mt-2 ml-5">
          AirWorkの管理画面の数値を入力してください。わかる範囲でOKです！
        </p>

        {/* ===== ヒーローカード: 応募数 ===== */}
        <Card className={`relative overflow-hidden transition-all duration-300 ${appStatus ? appStatus.border : "border-orange-300"} ${appStatus ? appStatus.bg : "bg-gradient-to-br from-orange-50 to-amber-50"}`}>
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${appStatus ? appStatus.bg : "bg-orange-100"} transition-colors`}>
                <Users className={`w-8 h-8 ${appStatus ? appStatus.color : "text-orange-500"} transition-colors`} />
              </div>
              <div className="flex-1">
                <Label className="text-base font-bold text-gray-800 flex items-center gap-2">
                  応募数
                  <span className="text-xs font-normal text-muted-foreground">（一番大事！）</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  何件応募が来ましたか？
                </p>
              </div>
              <div className="w-36">
                <Input
                  type="number"
                  value={metrics.applications ?? ""}
                  onChange={(e) => onMetricsChange({ applications: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                  placeholder="0"
                  className={`text-2xl font-bold text-center h-14 border-2 transition-all ${appStatus ? `${appStatus.ring} focus:ring-2` : "focus:ring-2 focus:ring-orange-300"}`}
                />
              </div>
            </div>
            {appStatus && (
              <div className={`mt-3 flex items-center gap-2 text-sm ${appStatus.color} font-medium animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <appStatus.icon className="w-4 h-4" />
                {appStatus.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== 中段: クリック数・表示回数 ===== */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-gray-200 hover:border-orange-200 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="w-4 h-4 text-orange-400" />
                <Label className="text-sm font-semibold text-gray-700">クリック数</Label>
              </div>
              <Input
                type="number"
                value={metrics.clicks ?? ""}
                onChange={(e) => onMetricsChange({ clicks: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="例: 80"
                className="text-lg font-semibold h-11"
              />
              <p className="text-[10px] text-muted-foreground mt-1">求人がクリックされた回数</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 hover:border-orange-200 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <Label className="text-sm font-semibold text-gray-700">表示回数</Label>
              </div>
              <Input
                type="number"
                value={metrics.impressions ?? ""}
                onChange={(e) => onMetricsChange({ impressions: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="例: 3000"
                className="text-lg font-semibold h-11"
              />
              <p className="text-[10px] text-muted-foreground mt-1">検索結果に表示された回数</p>
            </CardContent>
          </Card>
        </div>

        {/* ===== 自動算出エリア ===== */}
        <button
          type="button"
          onClick={() => setShowCalculated(!showCalculated)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-violet-50 to-orange-50 hover:from-violet-100 hover:to-orange-100 rounded-lg border border-violet-200 transition-colors text-sm text-violet-700"
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5" />
            <span>自動算出データ</span>
            {(displayCtr !== undefined || displayCpc !== undefined) && (
              <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">自動計算済</span>
            )}
          </div>
          {showCalculated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showCalculated && (
          <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 flex items-center gap-1">
                クリック率（%）
                {!manualOverrides.ctr && calcCtr !== undefined && <span className="text-violet-500 text-[10px]">自動</span>}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={displayCtr ?? ""}
                onChange={(e) => handleManualOverride("ctr", e.target.value)}
                placeholder={calcCtr !== undefined ? `${calcCtr}` : "自動計算"}
                className={`text-sm h-9 ${!manualOverrides.ctr && calcCtr !== undefined ? "bg-violet-50/50 border-violet-200" : ""}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 flex items-center gap-1">
                クリック単価（円）
              </Label>
              <Input
                type="number"
                value={displayCpc ?? ""}
                onChange={(e) => handleManualOverride("cpc", e.target.value)}
                placeholder="手動入力"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 flex items-center gap-1">
                応募完了率（%）
                {!manualOverrides.applicationCompleteRate && calcAppCompleteRate !== undefined && <span className="text-violet-500 text-[10px]">自動</span>}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={displayAppCompleteRate ?? ""}
                onChange={(e) => handleManualOverride("applicationCompleteRate", e.target.value)}
                placeholder={calcAppCompleteRate !== undefined ? `${calcAppCompleteRate}` : "自動計算"}
                className={`text-sm h-9 ${!manualOverrides.applicationCompleteRate && calcAppCompleteRate !== undefined ? "bg-violet-50/50 border-violet-200" : ""}`}
              />
            </div>
          </div>
        )}
      </div>

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
