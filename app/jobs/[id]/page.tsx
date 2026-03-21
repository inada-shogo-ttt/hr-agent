"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, Zap, RefreshCw, FileText, BarChart3, Clock,
  ChevronDown, ChevronUp, Copy, Check, ImageIcon,
} from "lucide-react";
import { ThumbnailPreview } from "@/app/components/output/ThumbnailPreview";

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
  officeName: string;
  jobTitle: string;
  employmentType: string;
  createdAt: string;
  records: JobRecord[];
}

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
              <ThumbnailPreview urls={thumbnailUrls} />
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
                          <span className="whitespace-pre-wrap">{imp.before?.slice(0, 100)}{imp.before?.length > 100 ? "..." : ""}</span>
                        </div>
                        <div className="p-2 bg-green-50 rounded text-xs">
                          <span className="text-green-600 font-medium">変更後: </span>
                          <span className="whitespace-pre-wrap">{imp.after?.slice(0, 100)}{imp.after?.length > 100 ? "..." : ""}</span>
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
            {value.length > 200 ? value.slice(0, 200) + "..." : value}
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
  const jobId = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setJob)
      .catch(() => router.replace("/jobs"))
      .finally(() => setLoading(false));
  }, [jobId, router]);

  if (loading || !job) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          求人一覧に戻る
        </Link>

        {/* 求人ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{job.officeName}</h1>
            <Badge variant="outline">{job.employmentType}</Badge>
          </div>
          <p className="text-lg text-muted-foreground">{job.jobTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">
            登録日: {new Date(job.createdAt).toLocaleDateString("ja-JP")} / ID: {job.id}
          </p>
        </div>

        {/* Team A アクション */}
        <Card className="border-2 border-blue-200 bg-blue-50/50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">チームA: 新規原稿作成</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AIが4媒体分の求人原稿を自動生成します。
                </p>
              </div>
              <Link href={`/jobs/${jobId}/new-posting`}>
                <Button>
                  <Zap className="w-4 h-4 mr-2" />
                  原稿を作成する
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

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
                      {/* Team B 改善ボタン */}
                      {hasTeamARecord && (
                        <div className="mb-4 p-4 rounded-lg border-2 border-orange-200 bg-orange-50/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 text-orange-600" />
                              <span className="text-sm font-medium">
                                {PLATFORM_LABELS[platform]}の原稿を改善する
                              </span>
                            </div>
                            <Link href={`/jobs/${jobId}/rewrite-posting?platform=${platform}`}>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                チームB で改善
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

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
