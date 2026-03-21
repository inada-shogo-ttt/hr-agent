"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExistingPostingFields, IndeedMetrics } from "@/types/team-b";
import {
  Users,
  MousePointerClick,
  Eye,
  PlayCircle,
  Wallet,
  ChevronDown,
  ChevronUp,
  Calculator,
  Sparkles,
  PartyPopper,
  Frown,
} from "lucide-react";

interface ExistingIndeedFieldsProps {
  data: ExistingPostingFields;
  metrics: IndeedMetrics;
  onChange: (data: Partial<ExistingPostingFields>) => void;
  onMetricsChange: (data: Partial<IndeedMetrics>) => void;
}

function getApplicationEmoji(count: number | undefined) {
  if (count === undefined) return null;
  if (count === 0) return { icon: Frown, color: "text-red-500", bg: "bg-red-50", border: "border-red-200", message: "まだ応募がありません...改善しましょう！", ring: "ring-red-200" };
  if (count <= 2) return { icon: Sparkles, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", message: "応募が来ています！もっと増やしましょう", ring: "ring-orange-200" };
  if (count <= 5) return { icon: Sparkles, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", message: "いい感じです！さらに伸ばせるかも", ring: "ring-blue-200" };
  return { icon: PartyPopper, color: "text-green-500", bg: "bg-green-50", border: "border-green-200", message: "素晴らしい！この調子でいきましょう", ring: "ring-green-200" };
}

export function ExistingIndeedFields({ data, metrics, onChange, onMetricsChange }: ExistingIndeedFieldsProps) {
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);
  const [showCalculated, setShowCalculated] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});

  // 自動計算
  const calcCtr = metrics.impressions && metrics.clicks
    ? Math.round((metrics.clicks / metrics.impressions) * 10000) / 100
    : undefined;
  const calcAppStartRate = metrics.clicks && metrics.applicationStarts
    ? Math.round((metrics.applicationStarts / metrics.clicks) * 10000) / 100
    : undefined;
  const calcAppCompleteRate = metrics.applicationStarts && metrics.applications
    ? Math.round((metrics.applications / metrics.applicationStarts) * 10000) / 100
    : undefined;
  const calcCpc = metrics.totalBudgetUsed && metrics.clicks
    ? Math.round(metrics.totalBudgetUsed / metrics.clicks)
    : undefined;

  // 自動計算値を反映（手動上書きされていない場合のみ）
  // onMetricsChangeはdependencyから外し、refで最新を参照する
  const onMetricsChangeRef = useRef(onMetricsChange);
  onMetricsChangeRef.current = onMetricsChange;

  useEffect(() => {
    const updates: Partial<IndeedMetrics> = {};
    if (!manualOverrides.ctr && calcCtr !== undefined) updates.ctr = calcCtr;
    if (!manualOverrides.applicationStartRate && calcAppStartRate !== undefined) updates.applicationStartRate = calcAppStartRate;
    if (!manualOverrides.applicationCompleteRate && calcAppCompleteRate !== undefined) updates.applicationCompleteRate = calcAppCompleteRate;
    if (!manualOverrides.cpc && calcCpc !== undefined) updates.cpc = calcCpc;
    if (Object.keys(updates).length > 0) onMetricsChangeRef.current(updates);
  }, [calcCtr, calcAppStartRate, calcAppCompleteRate, calcCpc, manualOverrides]);

  const handleManualOverride = (field: string, value: string) => {
    setManualOverrides((prev) => ({ ...prev, [field]: value !== "" }));
    onMetricsChange({ [field]: value === "" ? undefined : parseFloat(value) });
  };

  const displayCtr = manualOverrides.ctr ? metrics.ctr : (calcCtr ?? metrics.ctr);
  const displayAppStartRate = manualOverrides.applicationStartRate ? metrics.applicationStartRate : (calcAppStartRate ?? metrics.applicationStartRate);
  const displayAppCompleteRate = manualOverrides.applicationCompleteRate ? metrics.applicationCompleteRate : (calcAppCompleteRate ?? metrics.applicationCompleteRate);
  const displayCpc = manualOverrides.cpc ? metrics.cpc : (calcCpc ?? metrics.cpc);

  const appStatus = getApplicationEmoji(metrics.applications);

  return (
    <div className="space-y-8">
      {/* 掲載数値セクション - ゲーミファイド */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-blue-500 rounded-full" />
          <h3 className="text-lg font-bold text-gray-800">掲載データを入力</h3>
          <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">Indeed</span>
        </div>
        <p className="text-sm text-muted-foreground -mt-2 ml-5">
          Indeedの管理画面の数値を入力してください。わかる範囲でOKです！
        </p>

        {/* ===== ヒーローカード: 応募数 ===== */}
        <Card className={`relative overflow-hidden transition-all duration-300 ${appStatus ? appStatus.border : "border-blue-300"} ${appStatus ? appStatus.bg : "bg-gradient-to-br from-blue-50 to-indigo-50"}`}>
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${appStatus ? appStatus.bg : "bg-blue-100"} transition-colors`}>
                <Users className={`w-8 h-8 ${appStatus ? appStatus.color : "text-blue-500"} transition-colors`} />
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
                  className={`text-2xl font-bold text-center h-14 border-2 transition-all ${appStatus ? `${appStatus.ring} focus:ring-2` : "focus:ring-2 focus:ring-blue-300"}`}
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

        {/* ===== 中段: クリック数・表示回数・応募開始数 ===== */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-gray-200 hover:border-blue-200 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="w-4 h-4 text-indigo-400" />
                <Label className="text-sm font-semibold text-gray-700">クリック数</Label>
              </div>
              <Input
                type="number"
                value={metrics.clicks ?? ""}
                onChange={(e) => onMetricsChange({ clicks: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="例: 150"
                className="text-lg font-semibold h-11"
              />
              <p className="text-[10px] text-muted-foreground mt-1">求人がクリックされた回数</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 hover:border-blue-200 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <Label className="text-sm font-semibold text-gray-700">表示回数</Label>
              </div>
              <Input
                type="number"
                value={metrics.impressions ?? ""}
                onChange={(e) => onMetricsChange({ impressions: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="例: 5000"
                className="text-lg font-semibold h-11"
              />
              <p className="text-[10px] text-muted-foreground mt-1">検索結果に表示された回数</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 hover:border-blue-200 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="w-4 h-4 text-emerald-400" />
                <Label className="text-sm font-semibold text-gray-700">応募開始数</Label>
              </div>
              <Input
                type="number"
                value={metrics.applicationStarts ?? ""}
                onChange={(e) => onMetricsChange({ applicationStarts: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="例: 20"
                className="text-lg font-semibold h-11"
              />
              <p className="text-[10px] text-muted-foreground mt-1">応募フォームを開いた数</p>
            </CardContent>
          </Card>
        </div>

        {/* ===== 下段: 予算系（小さめ） ===== */}
        <button
          type="button"
          onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-sm text-gray-600"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5" />
            <span>予算情報</span>
            {(metrics.dailyBudget || metrics.totalBudgetUsed) && (
              <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">入力済</span>
            )}
          </div>
          {showDetailedMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetailedMetrics && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">日額予算（円）</Label>
              <Input
                type="number"
                value={metrics.dailyBudget ?? ""}
                onChange={(e) => onMetricsChange({ dailyBudget: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="例: 1000"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">合計予算・利用済（円）</Label>
              <Input
                type="number"
                value={metrics.totalBudgetUsed ?? ""}
                onChange={(e) => onMetricsChange({ totalBudgetUsed: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="例: 30000"
                className="text-sm h-9"
              />
            </div>
          </div>
        )}

        {/* ===== 自動算出エリア ===== */}
        <button
          type="button"
          onClick={() => setShowCalculated(!showCalculated)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-violet-50 to-blue-50 hover:from-violet-100 hover:to-blue-100 rounded-lg border border-violet-200 transition-colors text-sm text-violet-700"
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
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
                {!manualOverrides.cpc && calcCpc !== undefined && <span className="text-violet-500 text-[10px]">自動</span>}
              </Label>
              <Input
                type="number"
                value={displayCpc ?? ""}
                onChange={(e) => handleManualOverride("cpc", e.target.value)}
                placeholder={calcCpc !== undefined ? `${calcCpc}` : "自動計算"}
                className={`text-sm h-9 ${!manualOverrides.cpc && calcCpc !== undefined ? "bg-violet-50/50 border-violet-200" : ""}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 flex items-center gap-1">
                応募開始率（%）
                {!manualOverrides.applicationStartRate && calcAppStartRate !== undefined && <span className="text-violet-500 text-[10px]">自動</span>}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={displayAppStartRate ?? ""}
                onChange={(e) => handleManualOverride("applicationStartRate", e.target.value)}
                placeholder={calcAppStartRate !== undefined ? `${calcAppStartRate}` : "自動計算"}
                className={`text-sm h-9 ${!manualOverrides.applicationStartRate && calcAppStartRate !== undefined ? "bg-violet-50/50 border-violet-200" : ""}`}
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
