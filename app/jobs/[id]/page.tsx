"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, FileText, BarChart3, Clock,
  ChevronDown, ChevronUp, Copy, Check, ImageIcon,
  CheckCircle, PenLine, ChevronRight, Plus, Trash2, Building2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbnailPreview } from "@/app/components/output/ThumbnailPreview";
import { ManuscriptOutput } from "@/app/components/output/ManuscriptOutput";
import { AllPlatformPostings } from "@/types/platform";
import { toast } from "sonner";

interface JobRecord {
  id: string;
  type: string;
  platform: string;
  createdAt: string;
  inputData: string | null;
  outputData: string | null;
  metricsData: string | null;
  thumbnailUrls: string | null;
}

interface JobDetail {
  id: string;
  officeId: string;
  officeName: string;
  jobTypeName: string;
  employmentTypeName: string;
  createdBy: string | null;
  createdAt: string;
  records: JobRecord[];
}

interface SourceJobEntry {
  id: string;
  officeName: string;
  jobTypeName: string;
  employmentTypeName: string;
  records: { type: string; platform: string; createdAt: string }[];
}

interface PublishMetric {
  id: string;
  platform: string;
  startDate: string;
  endDate: string | null;
  impressions: number | null;
  clicks: number | null;
  applications: number | null;
  cost: number | null;
  notes: string | null;
}

const PLATFORM_OPTIONS = [
  { value: "indeed", label: "Indeed" },
  { value: "airwork", label: "AirWork" },
  { value: "jobmedley", label: "JobMedley" },
  { value: "hellowork", label: "ハローワーク" },
];

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "インディード",
  airwork: "エアワーク",
  jobmedley: "ジョブメドレー",
  hellowork: "ハローワーク",
  all: "全媒体",
};

// 媒体ごとのフィールド定義（表示用）
const FIELD_LABELS: Record<string, string> = {
  jobTitle: "職種名",
  catchphrase: "キャッチコピー",
  jobDescription: "仕事内容",
  appealPoints: "アピールポイント",
  requirements: "求める人材",
  salary: "給与",
  workingHours: "勤務時間",
  holidays: "休暇・休日",
  benefits: "待遇・福利厚生",
  access: "アクセス",
  socialInsurance: "社会保険",
  location: "勤務地",
  employmentType: "雇用形態",
  numberOfHires: "採用予定人数",
  probationPeriod: "試用期間",
  selectionProcess: "選考の流れ",
  appealTitle: "訴求文タイトル",
  appealText: "訴求文",
  trainingSystem: "教育体制・研修",
  welcomeRequirements: "歓迎要件",
  salaryDescription: "給与の補足",
  workStyle: "勤務形態",
  workEnvironment: "職場環境",
  // ハローワーク
  companyAddress: "所在地",
  workLocation: "就業場所",
  smokingPolicy: "受動喫煙対策",
  employmentPeriod: "雇用期間",
  contractRenewal: "契約更新",
  wageType: "賃金形態",
  wageAmount: "賃金額",
  allowances: "手当",
  commutingAllowance: "通勤手当",
  bonus: "賞与",
  raise: "昇給",
  overtime: "時間外労働",
  breakTime: "休憩時間",
  annualLeave: "年次有給休暇",
  insurance: "加入保険",
  pension: "企業年金",
  trialPeriod: "試用期間",
  specialNotes: "特記事項",
  requiredLicenses: "必要な免許・資格",
  ageRestriction: "年齢制限",
  selectionMethod: "選考方法",
  applicationDocuments: "応募書類",
  selectionNotification: "選考結果通知",
  remarks: "求人に関する特記事項",
};

function CopyFieldButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-xs shrink-0">
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {copied ? "済" : "コピー"}
    </Button>
  );
}

function RecordPreview({ record, index, total }: { record: JobRecord; index: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const isTeamA = record.type === "team-a";

  // サムネイルURLをパース
  let thumbnailUrls: string[] = [];
  if (record.thumbnailUrls) {
    try {
      thumbnailUrls = JSON.parse(record.thumbnailUrls);
    } catch { /* ignore */ }
  }

  // outputDataをパース
  let outputFields: Record<string, unknown> | null = null;
  let platformData: Record<string, string> | null = null;

  if (record.outputData) {
    try {
      outputFields = JSON.parse(record.outputData);
    } catch { /* ignore */ }
  }

  // Team A のプラットフォームデータを抽出
  if (isTeamA && outputFields) {
    // Team A は all platform で保存されるので、指定媒体のフィールドを取り出す
    const platformKey = record.platform === "all" ? null : record.platform;
    if (platformKey && outputFields[platformKey]) {
      platformData = outputFields[platformKey] as Record<string, string>;
    }
  }

  // Team B の改善後データ
  let improvedPosting: Record<string, string> | null = null;
  let improvements: Array<{ field: string; fieldLabel: string; before: string; after: string; reason: string }> = [];
  if (!isTeamA && outputFields) {
    improvedPosting = (outputFields as Record<string, unknown>).improvedPosting as Record<string, string> | null;
    improvements = ((outputFields as Record<string, unknown>).improvements as typeof improvements) || [];
  }

  return (
    <div className={`rounded-lg border ${isTeamA ? "border-blue-200" : "border-orange-200"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/50 transition-colors ${
          isTeamA ? "bg-blue-50/30" : "bg-orange-50/30"
        }`}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: isTeamA ? "#dbeafe" : "#ffedd5" }}
        >
          {isTeamA ? (
            <FileText className="w-4 h-4 text-blue-600" />
          ) : (
            <BarChart3 className="w-4 h-4 text-orange-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="secondary"
              className={isTeamA ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}
            >
              {isTeamA ? "新規作成" : "ブラッシュアップ"}
            </Badge>
            {!isTeamA && improvements.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {improvements.length}箇所改善
              </Badge>
            )}
            {thumbnailUrls.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <ImageIcon className="w-3 h-3" />
                {thumbnailUrls.length}枚
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(record.createdAt).toLocaleString("ja-JP")}
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-mono mr-2">#{total - index}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 bg-white">
          {/* サムネイルプレビュー */}
          {thumbnailUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                サムネイル（{thumbnailUrls.length}枚）
              </p>
              <ThumbnailPreview urls={thumbnailUrls} filenamePrefix="history_thumbnail" />
            </div>
          )}

          {isTeamA && platformData && (
            <FieldList fields={platformData} />
          )}
          {!isTeamA && improvedPosting && (
            <div className="space-y-4">
              {improvements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">改善箇所</p>
                  {improvements.map((imp, i) => (
                    <div key={i} className="text-sm border rounded-md p-3 bg-green-50/50 border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                          {imp.fieldLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{imp.reason}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="p-2 bg-red-50 rounded text-xs">
                          <span className="text-red-500 font-medium">変更前: </span>
                          <span className="whitespace-pre-wrap">{imp.before}</span>
                        </div>
                        <div className="p-2 bg-green-50 rounded text-xs">
                          <span className="text-green-600 font-medium">変更後: </span>
                          <span className="whitespace-pre-wrap">{imp.after}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">改善後フィールド</p>
                <FieldList fields={improvedPosting} />
              </div>
            </div>
          )}
          {!platformData && !improvedPosting && thumbnailUrls.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              プレビューデータがありません
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FieldList({ fields }: { fields: Record<string, string> }) {
  const entries = Object.entries(fields).filter(
    ([k, v]) => v && typeof v === "string" && v.trim().length > 0 && k !== "thumbnailUrls"
  );

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">フィールドデータなし</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              {FIELD_LABELS[key] || key}
            </span>
            <CopyFieldButton text={value} />
          </div>
          <div className="bg-gray-50 border rounded p-2 text-sm whitespace-pre-wrap break-words">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

// 媒体タブ用: Team A の出力を媒体ごとに分解してレコードリストを作る
function getPlatformRecords(records: JobRecord[], platform: string): { record: JobRecord; platformData: Record<string, string> | null }[] {
  return records
    .map((record) => {
      if (!record.outputData) return { record, platformData: null };
      try {
        const parsed = JSON.parse(record.outputData);
        if (record.type === "team-a") {
          // Team A は all platform 出力 → 該当媒体を取り出す
          const data = parsed[platform];
          return { record, platformData: data || null };
        } else {
          // Team B は単一媒体
          if (record.platform === platform) {
            return { record, platformData: parsed.improvedPosting || null };
          }
          return null;
        }
      } catch {
        return { record, platformData: null };
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

const emptyMetricsForm = {
  platform: "indeed",
  startDate: "",
  endDate: "",
  impressions: "",
  clicks: "",
  applications: "",
  cost: "",
  notes: "",
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 流用作成ダイアログ
  const [reuseDialogOpen, setReuseDialogOpen] = useState(false);
  const [sourceJobs, setSourceJobs] = useState<SourceJobEntry[] | null>(null);

  // 掲載数値
  const [metrics, setMetrics] = useState<PublishMetric[]>([]);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [metricsForm, setMetricsForm] = useState({ ...emptyMetricsForm });
  const [metricsSubmitting, setMetricsSubmitting] = useState(false);

  function fetchJob() {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setJob)
      .catch(() => router.replace("/jobs"))
      .finally(() => setLoading(false));
  }

  function fetchMetrics() {
    fetch(`/api/jobs/${jobId}/metrics`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMetrics)
      .catch(() => { /* ignore */ });
  }

  useEffect(() => {
    fetchJob();
    fetchMetrics();
  }, [jobId, router]);

  // 流用元候補（原稿ありの他求人）をロード
  function openReuseDialog() {
    setReuseDialogOpen(true);
    if (sourceJobs === null) {
      fetch("/api/jobs")
        .then((r) => (r.ok ? r.json() : []))
        .then((jobs: SourceJobEntry[]) =>
          setSourceJobs(
            jobs.filter((j) => j.id !== jobId && j.records?.length > 0)
          )
        )
        .catch(() => setSourceJobs([]));
    }
  }

  async function handleMetricsSubmit() {
    if (!metricsForm.startDate) {
      toast.error("掲載開始日を入力してください");
      return;
    }
    setMetricsSubmitting(true);
    const res = await fetch(`/api/jobs/${jobId}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: metricsForm.platform,
        startDate: metricsForm.startDate,
        endDate: metricsForm.endDate || null,
        impressions: metricsForm.impressions ? Number(metricsForm.impressions) : null,
        clicks: metricsForm.clicks ? Number(metricsForm.clicks) : null,
        applications: metricsForm.applications ? Number(metricsForm.applications) : null,
        cost: metricsForm.cost ? Number(metricsForm.cost) : null,
        notes: metricsForm.notes || null,
      }),
    });
    if (res.ok) {
      toast.success("掲載数値を登録しました");
      setMetricsDialogOpen(false);
      setMetricsForm({ ...emptyMetricsForm });
      fetchMetrics();
    } else {
      const data = await res.json();
      toast.error(data.error || "登録に失敗しました");
    }
    setMetricsSubmitting(false);
  }

  async function handleMetricsDelete(metricsId: string) {
    const res = await fetch(`/api/jobs/${jobId}/metrics/${metricsId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("掲載数値を削除しました");
      fetchMetrics();
    } else {
      toast.error("削除に失敗しました");
    }
  }

  // 最新原稿の編集状態
  const [latestOutput, setLatestOutput] = useState<AllPlatformPostings | null>(null);
  const [latestRecordId, setLatestRecordId] = useState<string | null>(null);
  const [manuscriptSaveStatus, setManuscriptSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestOutputRef = useRef<AllPlatformPostings | null>(null);

  // 最新の原稿をDBから取得
  // Team A レコードを正として使う（全媒体のデータを持つため）
  // Team B の改善結果は既にTeam Aレコードにマージ保存されている
  const manuscriptLoadedRef = useRef(false);
  useEffect(() => {
    if (manuscriptLoadedRef.current && latestOutput) return;
    if (!job?.records?.length) return;

    const teamARecord = job.records.find((r) => r.type === "team-a");
    if (!teamARecord?.outputData) return;

    try {
      const parsed = typeof teamARecord.outputData === "string"
        ? JSON.parse(teamARecord.outputData)
        : teamARecord.outputData;

      setLatestOutput(parsed);
      setLatestRecordId(teamARecord.id);
      manuscriptLoadedRef.current = true;
    } catch { /* ignore */ }
  }, [job]);

  // latestRecordId を ref でも保持（コールバック内で最新値を参照するため）
  const latestRecordIdRef = useRef<string | null>(null);
  useEffect(() => {
    latestRecordIdRef.current = latestRecordId;
  }, [latestRecordId]);

  // 自動保存（2秒デバウンス）
  async function doSaveManuscript(data: AllPlatformPostings) {
    const rid = latestRecordIdRef.current;
    if (!rid) return;
    setManuscriptSaveStatus("saving");
    try {
      const res = await fetch(`/api/jobs/${jobId}/records/${rid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputData: data }),
      });
      if (res.ok) {
        setManuscriptSaveStatus("saved");
        setTimeout(() => setManuscriptSaveStatus("idle"), 2000);
      } else {
        console.error("Manuscript save failed:", res.status);
        setManuscriptSaveStatus("idle");
      }
    } catch {
      setManuscriptSaveStatus("idle");
    }
  }

  function handleLatestOutputChange(newOutput: AllPlatformPostings) {
    setLatestOutput(newOutput);
    latestOutputRef.current = newOutput;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (latestOutputRef.current) {
        doSaveManuscript(latestOutputRef.current);
      }
    }, 2000);
  }

  if (loading || !job) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          読み込み中...
        </div>
      </main>
    );
  }

  const hasTeamARecord = job.records.some((r) => r.type === "team-a");
  const platforms = ["indeed", "airwork", "jobmedley", "hellowork"] as const;

  // 媒体ごとにレコードを分類
  const platformRecordMap = Object.fromEntries(
    platforms.map((p) => [p, getPlatformRecords(job.records, p)])
  );

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 求人ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{job.officeName}</h1>
            <Badge variant="outline">{job.employmentTypeName}</Badge>
          </div>
          <p className="text-lg text-muted-foreground">{job.jobTypeName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            登録日: {new Date(job.createdAt).toLocaleDateString("ja-JP")} / ID: {job.id}
          </p>
        </div>

        {/* 原稿作成アクション: 3パターン */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">原稿を作成する</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ① 新規作成 */}
            <button
              onClick={() => router.push(`/jobs/${jobId}/new-posting`)}
              className="group text-left rounded-xl border-2 border-gray-200 bg-white p-5 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <PenLine className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-bold text-sm mb-1">新規作成</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                求人情報を入力して、AIがゼロから4媒体分の原稿を作成します
              </p>
              <div className="flex items-center gap-1 mt-3 text-xs font-medium text-blue-600">
                はじめる
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* ② 流用して作成 */}
            <button
              onClick={openReuseDialog}
              className="group text-left rounded-xl border-2 border-gray-200 bg-white p-5 hover:border-violet-400 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-3">
                <Copy className="w-5 h-5 text-violet-600" />
              </div>
              <p className="font-bold text-sm mb-1">既存求人を流用して作成</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                他の求人の原稿をベースに、この求人用の原稿を作成します
              </p>
              <div className="flex items-center gap-1 mt-3 text-xs font-medium text-violet-600">
                流用元を選ぶ
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* ③ ブラッシュアップ */}
            <button
              onClick={() => hasTeamARecord && router.push(`/jobs/${jobId}/rewrite-posting`)}
              disabled={!hasTeamARecord}
              className={`group text-left rounded-xl border-2 p-5 transition-all ${
                hasTeamARecord
                  ? "border-gray-200 bg-white hover:border-amber-400 hover:shadow-md"
                  : "border-gray-100 bg-gray-50 cursor-not-allowed"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                hasTeamARecord ? "bg-amber-50" : "bg-gray-100"
              }`}>
                <RefreshCw className={`w-5 h-5 ${hasTeamARecord ? "text-amber-600" : "text-gray-300"}`} />
              </div>
              <p className={`font-bold text-sm mb-1 ${!hasTeamARecord ? "text-gray-400" : ""}`}>
                掲載中の求人をブラッシュアップ
              </p>
              <p className={`text-xs leading-relaxed ${hasTeamARecord ? "text-gray-500" : "text-gray-400"}`}>
                {hasTeamARecord
                  ? "アナリティクスデータを元にAIが原稿を分析・改善します"
                  : "先に原稿を作成すると利用できます"}
              </p>
              {hasTeamARecord && (
                <div className="flex items-center gap-1 mt-3 text-xs font-medium text-amber-600">
                  ブラッシュアップする
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 掲載数値（アナリティクスデータ） */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  掲載数値（アナリティクスデータ）
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  媒体の掲載結果を登録すると、ブラッシュアップ時にAIが分析に使用します
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setMetricsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                数値を登録
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                まだ掲載数値が登録されていません
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <Badge variant="secondary" className="shrink-0">
                        {PLATFORM_OPTIONS.find((p) => p.value === m.platform)?.label || m.platform}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {m.startDate}{m.endDate ? ` ~ ${m.endDate}` : " ~"}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        {m.impressions != null && <span>表示 <b>{m.impressions.toLocaleString()}</b></span>}
                        {m.clicks != null && <span>クリック <b>{m.clicks.toLocaleString()}</b></span>}
                        {m.applications != null && <span>応募 <b>{m.applications.toLocaleString()}</b></span>}
                        {m.cost != null && <span>費用 <b>¥{m.cost.toLocaleString()}</b></span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-gray-400 hover:text-red-500 shrink-0"
                      onClick={() => handleMetricsDelete(m.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最新の原稿表示・編集 */}
        {latestOutput && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">最新の原稿</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    原稿を編集すると自動保存されます
                  </p>
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                  {manuscriptSaveStatus === "saving" && (
                    <>
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      保存中...
                    </>
                  )}
                  {manuscriptSaveStatus === "saved" && (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      保存済み
                    </>
                  )}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ManuscriptOutput
                output={latestOutput}
                editable={true}
                jobId={jobId}
                onOutputChange={handleLatestOutputChange}
              />
            </CardContent>
          </Card>
        )}

        {/* 流用元選択ダイアログ */}
        <Dialog open={reuseDialogOpen} onOpenChange={setReuseDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>流用元の求人を選択</DialogTitle>
              <DialogDescription>
                選択した求人の入力内容をベースに、この求人用の原稿を作成します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {sourceJobs === null ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  読み込み中...
                </div>
              ) : sourceJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  流用できる求人がありません。原稿を作成済みの求人が流用元になります。
                </p>
              ) : (
                sourceJobs.map((sj) => (
                  <button
                    key={sj.id}
                    onClick={() =>
                      router.push(`/jobs/${jobId}/new-posting?source=${sj.id}`)
                    }
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-violet-300 hover:bg-violet-50/40 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {sj.officeName} / {sj.jobTypeName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sj.employmentTypeName}
                        {sj.records[0] && (
                          <> ・ 最終作成 {new Date(sj.records[0].createdAt).toLocaleDateString("ja-JP")}</>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 掲載数値登録ダイアログ */}
        <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>掲載数値を登録</DialogTitle>
              <DialogDescription>
                媒体の管理画面で確認できる数値を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>媒体</Label>
                <Select
                  value={metricsForm.platform}
                  onValueChange={(v) => setMetricsForm((f) => ({ ...f, platform: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">掲載開始日 *</Label>
                  <Input
                    type="date"
                    value={metricsForm.startDate}
                    onChange={(e) => setMetricsForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">掲載終了日</Label>
                  <Input
                    type="date"
                    value={metricsForm.endDate}
                    onChange={(e) => setMetricsForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">表示回数</Label>
                  <Input
                    type="number"
                    min="0"
                    value={metricsForm.impressions}
                    onChange={(e) => setMetricsForm((f) => ({ ...f, impressions: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">クリック数</Label>
                  <Input
                    type="number"
                    min="0"
                    value={metricsForm.clicks}
                    onChange={(e) => setMetricsForm((f) => ({ ...f, clicks: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">応募数</Label>
                  <Input
                    type="number"
                    min="0"
                    value={metricsForm.applications}
                    onChange={(e) => setMetricsForm((f) => ({ ...f, applications: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">掲載費用（円）</Label>
                  <Input
                    type="number"
                    min="0"
                    value={metricsForm.cost}
                    onChange={(e) => setMetricsForm((f) => ({ ...f, cost: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">備考</Label>
                <Input
                  value={metricsForm.notes}
                  onChange={(e) => setMetricsForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="キャンペーン内容など"
                />
              </div>

              <Button
                className="w-full"
                disabled={metricsSubmitting || !metricsForm.startDate}
                onClick={handleMetricsSubmit}
              >
                {metricsSubmitting ? "登録中..." : "登録する"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 媒体別タブ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              実行履歴（{job.records.length}件）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.records.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                まだ実行履歴がありません。上のメニューから原稿を作成してください。
              </p>
            ) : (
              <Tabs defaultValue="indeed">
                <TabsList className="grid w-full grid-cols-4">
                  {platforms.map((p) => (
                    <TabsTrigger key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                      {platformRecordMap[p].length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                          {platformRecordMap[p].length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {platforms.map((platform) => {
                  const records = platformRecordMap[platform];
                  return (
                    <TabsContent key={platform} value={platform} className="mt-4">
                      {records.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">
                          {PLATFORM_LABELS[platform]}の履歴はありません
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {records.map(({ record }, index) => (
                            <RecordPreview
                              key={record.id}
                              record={{
                                ...record,
                                // Team A の場合は platform を上書きして正しいデータを表示
                                platform: record.type === "team-a" ? platform : record.platform,
                              }}
                              index={index}
                              total={records.length}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
