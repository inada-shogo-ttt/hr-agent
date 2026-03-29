"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap, RefreshCw, FileText, BarChart3, Clock,
  ChevronDown, ChevronUp, Copy, Check, ImageIcon,
  Send, Calendar, CheckCircle,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThumbnailPreview } from "@/app/components/output/ThumbnailPreview";
import { ManuscriptOutput } from "@/app/components/output/ManuscriptOutput";
import { ModificationDiffDialog } from "@/app/components/ModificationDiffDialog";
import { AllPlatformPostings } from "@/types/platform";
import { StatusBadge } from "@/app/components/StatusBadge";
import { PublishRequestStatusBadge } from "@/app/components/PublishRequestStatusBadge";
import { StatusTimeline } from "@/app/components/StatusTimeline";
import { useUser } from "@/app/providers/auth-provider";
import { JobStatus } from "@/types/auth";
import { PublishRequestStatus } from "@/types/publish-request";
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

interface PublishRequestEntry {
  id: string;
  platform: string;
  status: PublishRequestStatus;
  startDate: string | null;
  endDate: string | null;
  assignedUser: { id: string; name: string } | null;
  createdAt: string;
  modificationPending?: boolean;
}

interface JobDetail {
  id: string;
  officeId: string;
  officeName: string;
  jobTypeName: string;
  employmentTypeName: string;
  status: JobStatus;
  createdBy: string | null;
  createdAt: string;
  records: JobRecord[];
  publishRequests: PublishRequestEntry[];
}

interface UserOption {
  id: string;
  name: string;
  role: string;
}

interface PlatformConfig {
  platform: string;
  startDate: string;
  endDate: string;
  assignedTo: string;
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
      const parsed = JSON.parse(record.outputData);
      if (isTeamA) {
        if (record.platform === "all") {
          outputFields = parsed;
        } else {
          outputFields = parsed;
        }
      } else {
        // Team B: { improvedPosting: {...}, improvements: [...], ... }
        outputFields = parsed;
      }
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
              {isTeamA ? "チームA: 新規作成" : "チームB: 改善"}
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

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  // 掲載依頼ダイアログ
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishers, setPublishers] = useState<UserOption[]>([]);
  const [defaultPublisher, setDefaultPublisher] = useState("");
  const [platformConfigs, setPlatformConfigs] = useState<PlatformConfig[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    fetchJob();
  }, [jobId, router]);

  async function handleStatusAction(action: string) {
    setStatusLoading(true);
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success("ステータスを更新しました");
      fetchJob();
    } else {
      const data = await res.json();
      toast.error(data.error || "エラーが発生しました");
    }
    setStatusLoading(false);
  }

  function openPublishDialog() {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((users: UserOption[]) =>
        setPublishers(users.filter((u) => u.role === "publisher" || u.role === "admin"))
      );
    setPlatformConfigs([]);
    setDefaultPublisher("");
    setPublishDialogOpen(true);
  }

  function togglePlatform(platform: string) {
    setPlatformConfigs((prev) => {
      const exists = prev.find((p) => p.platform === platform);
      if (exists) return prev.filter((p) => p.platform !== platform);
      return [...prev, { platform, startDate: "", endDate: "", assignedTo: "" }];
    });
  }

  function updatePlatformConfig(platform: string, field: string, value: string) {
    setPlatformConfigs((prev) =>
      prev.map((p) => (p.platform === platform ? { ...p, [field]: value } : p))
    );
  }

  async function handlePublishSubmit() {
    if (!defaultPublisher || platformConfigs.length === 0) {
      toast.error("担当者と媒体を選択してください");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/jobs/${jobId}/publish-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultAssignedTo: defaultPublisher,
        platforms: platformConfigs.map((p) => ({
          platform: p.platform,
          assignedTo: p.assignedTo || undefined,
          startDate: p.startDate || undefined,
          endDate: p.endDate || undefined,
        })),
      }),
    });
    if (res.ok) {
      toast.success("掲載依頼を送信しました");
      setPublishDialogOpen(false);
      fetchJob();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
    setSubmitting(false);
  }

  // 最新原稿の編集状態
  const [latestOutput, setLatestOutput] = useState<AllPlatformPostings | null>(null);
  const [latestRecordId, setLatestRecordId] = useState<string | null>(null);
  const [modificationSaving, setModificationSaving] = useState(false);
  const [showModificationDiff, setShowModificationDiff] = useState(false);
  const savedOutputRef = useRef<AllPlatformPostings | null>(null);
  const [manuscriptSaveStatus, setManuscriptSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestOutputRef = useRef<AllPlatformPostings | null>(null);

  // 掲載中かどうか
  const hasPublishing = job?.publishRequests?.some((pr) => pr.status === "publishing") || false;

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
      savedOutputRef.current = JSON.parse(JSON.stringify(parsed));
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

  function openModificationDiff() {
    if (!latestOutput || !savedOutputRef.current) return;
    setShowModificationDiff(true);
  }

  async function handleModificationConfirm() {
    const rid = latestRecordIdRef.current;
    if (!latestOutput || !rid) return;
    setModificationSaving(true);

    // デバウンスタイマーがあればキャンセルして即保存
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    // 原稿をDB保存（PATCH APIが掲載中のPublishRequestへの通知も自動で行う）
    const res = await fetch(`/api/jobs/${jobId}/records/${rid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputData: latestOutput }),
    });

    if (res.ok) {
      if (hasPublishing) {
        toast.success("修正依頼を掲載担当に送信しました");
      } else {
        toast.success("原稿を保存しました");
      }
      // savedOutputRef を更新（送信後は新しい状態がベースになる）
      savedOutputRef.current = JSON.parse(JSON.stringify(latestOutput));
      fetchJob();
    } else {
      toast.error("修正依頼の送信に失敗しました");
    }
    setModificationSaving(false);
    setShowModificationDiff(false);
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
            <StatusBadge status={job.status || "draft"} />
          </div>
          <p className="text-lg text-muted-foreground">{job.jobTypeName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            登録日: {new Date(job.createdAt).toLocaleDateString("ja-JP")} / ID: {job.id}
          </p>

        </div>

        {/* アクションバー */}
        {(user?.role === "editor" || user?.role === "admin") && (
          <div className="mb-6 p-3 rounded-lg bg-gray-50 border flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {/* draft: Team A 作成 + 確定 */}
              {job.status === "draft" && (
                <>
                  <Link href={`/jobs/${jobId}/new-posting`}>
                    <Button size="sm">
                      <Zap className="w-4 h-4 mr-1.5" />
                      Team A 原稿作成
                    </Button>
                  </Link>
                  {hasTeamARecord && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusAction("confirm")}
                      disabled={statusLoading}
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      確定する
                    </Button>
                  )}
                </>
              )}

              {/* confirmed: 掲載依頼 + 修正依頼 + Team B */}
              {job.status === "confirmed" && (
                <>
                  {hasTeamARecord && (
                    <Button size="sm" onClick={openPublishDialog}>
                      <Send className="w-4 h-4 mr-1.5" />
                      掲載依頼
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={openModificationDiff}
                    disabled={modificationSaving}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    修正依頼
                  </Button>
                  <Link href={`/jobs/${jobId}/rewrite-posting`}>
                    <Button size="sm" variant="outline">
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      求人をブラッシュアップする
                    </Button>
                  </Link>
                </>
              )}

              {/* awaiting_republish: 求人をブラッシュアップする */}
              {job.status === "awaiting_republish" && (
                <Link href={`/jobs/${jobId}/rewrite-posting`}>
                  <Button size="sm" variant="outline">
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    求人をブラッシュアップする
                  </Button>
                </Link>
              )}
            </div>

            {/* 保存ステータス */}
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
        )}

        {/* PublishRequest 一覧 */}
        {job.publishRequests && job.publishRequests.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">掲載依頼状況</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {job.publishRequests.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <PublishRequestStatusBadge status={pr.status} />
                      <span className="text-sm font-medium">
                        {PLATFORM_OPTIONS.find((p) => p.value === pr.platform)?.label || pr.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {pr.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {pr.startDate}{pr.endDate ? ` ~ ${pr.endDate}` : ""}
                        </span>
                      )}
                      {pr.assignedUser && (
                        <span>担当: {pr.assignedUser.name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 最新の原稿表示・編集 */}
        {job.status === "confirmed" && latestOutput && (user?.role === "editor" || user?.role === "admin") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">最新の原稿</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                原稿を編集すると自動保存されます
              </p>
            </CardHeader>
            <CardContent>
              <ManuscriptOutput
                output={latestOutput}
                editable={true}
                jobId={jobId}
                onOutputChange={handleLatestOutputChange}
              />

              {/* 修正依頼ログ */}
              {job.publishRequests && job.publishRequests.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">掲載担当への修正依頼状況</h4>
                  <div className="space-y-2">
                    {job.publishRequests.map((pr) => (
                        <div
                          key={pr.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                            pr.modificationPending
                              ? "bg-orange-50 border-orange-200"
                              : pr.status === "expired"
                              ? "bg-gray-100 border-gray-200 opacity-60"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {PLATFORM_OPTIONS.find((p) => p.value === pr.platform)?.label || pr.platform}
                            </span>
                            <PublishRequestStatusBadge status={pr.status} />
                            {pr.modificationPending ? (
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
                                修正依頼中
                              </Badge>
                            ) : pr.status !== "expired" ? (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                                最新反映済み
                              </Badge>
                            ) : null}
                          </div>
                          {pr.assignedUser && (
                            <span className="text-xs text-gray-500">担当: {pr.assignedUser.name}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 掲載依頼ダイアログ */}
        <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>掲載依頼</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              <div className="space-y-2">
                <Label>デフォルトの掲載担当者</Label>
                <Select value={defaultPublisher} onValueChange={setDefaultPublisher}>
                  <SelectTrigger>
                    <SelectValue placeholder="掲載担当者を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>掲載する媒体</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => {
                    const selected = platformConfigs.some((c) => c.platform === p.value);
                    // 既に active な PublishRequest がある媒体は除外
                    const hasActive = job?.publishRequests?.some(
                      (pr) => pr.platform === p.value && pr.status !== "expired"
                    );
                    if (hasActive) return null;
                    return (
                      <Button
                        key={p.value}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => togglePlatform(p.value)}
                      >
                        {selected && <Check className="w-3 h-3 mr-1" />}
                        {p.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {platformConfigs.map((config) => (
                <div key={config.platform} className="p-3 rounded-lg bg-gray-50 border space-y-3">
                  <Label className="text-xs font-semibold">
                    {PLATFORM_OPTIONS.find((p) => p.value === config.platform)?.label}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-gray-500">掲載開始日</Label>
                      <Input
                        type="date"
                        value={config.startDate}
                        onChange={(e) => updatePlatformConfig(config.platform, "startDate", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-500">掲載終了日</Label>
                      <Input
                        type="date"
                        value={config.endDate}
                        onChange={(e) => updatePlatformConfig(config.platform, "endDate", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">担当者を上書き（任意）</Label>
                    <Select
                      value={config.assignedTo}
                      onValueChange={(v) => updatePlatformConfig(config.platform, "assignedTo", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="デフォルト担当者を使用" />
                      </SelectTrigger>
                      <SelectContent>
                        {publishers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              <Button
                className="w-full"
                disabled={submitting || !defaultPublisher || platformConfigs.length === 0}
                onClick={handlePublishSubmit}
              >
                {submitting ? "送信中..." : `${platformConfigs.length}媒体の掲載依頼を送信`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 修正差分確認ダイアログ */}
        {savedOutputRef.current && latestOutput && (
          <ModificationDiffDialog
            open={showModificationDiff}
            onOpenChange={setShowModificationDiff}
            savedOutput={savedOutputRef.current}
            currentOutput={latestOutput}
            onConfirm={handleModificationConfirm}
            loading={modificationSaving}
          />
        )}

        {/* Team A アクションカードは削除 — アクションバーに統合 */}

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
                まだ実行履歴がありません。Team Aで原稿を作成してください。
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
        {/* ステータス履歴 */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <StatusTimeline jobId={jobId} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
