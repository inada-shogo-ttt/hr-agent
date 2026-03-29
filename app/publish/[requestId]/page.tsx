"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PublishRequestStatusBadge } from "@/app/components/PublishRequestStatusBadge";
import { Play, CheckCircle, Save, Calendar, ImageIcon, AlertTriangle, CheckCheck } from "lucide-react";
import { ThumbnailPreview } from "@/app/components/output/ThumbnailPreview";
import { toast } from "sonner";
import { PublishRequestStatus } from "@/types/publish-request";

interface RequestDetail {
  id: string;
  platform: string;
  status: PublishRequestStatus;
  startDate: string | null;
  endDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  assignedUser: { id: string; name: string } | null;
  requestedUser: { id: string; name: string } | null;
  job: {
    id: string;
    officeName: string;
    jobTypeName: string;
    employmentTypeName: string;
  } | null;
  modificationPending: boolean;
  modificationRequestedAt: string | null;
  records: Array<{
    id: string;
    type: string;
    outputData: string | null;
    thumbnailUrls: string | null;
    createdAt: string;
  }>;
  manuscriptData: Record<string, string> | null;
  manuscriptThumbnails: string[];
}

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
};

const FIELD_LABELS: Record<string, string> = {
  jobTitle: "職種名", catchphrase: "キャッチコピー", jobDescription: "仕事内容",
  appealPoints: "アピールポイント", requirements: "求める人材", salary: "給与",
  workingHours: "勤務時間", holidays: "休暇・休日", benefits: "待遇・福利厚生",
  access: "アクセス", socialInsurance: "社会保険", location: "勤務地",
  numberOfHires: "採用予定人数", selectionProcess: "選考の流れ",
  appealTitle: "訴求文タイトル", appealText: "訴求文",
};

// 媒体別メトリクスフィールド
const METRICS_FIELDS: Record<string, { field: string; label: string; required: boolean; type: string }[]> = {
  indeed: [
    { field: "impressions", label: "表示回数", required: true, type: "number" },
    { field: "clicks", label: "クリック数", required: true, type: "number" },
    { field: "applications", label: "応募数", required: true, type: "number" },
    { field: "applicationStarts", label: "応募開始数", required: true, type: "number" },
    { field: "cost", label: "掲載費用（円）", required: true, type: "number" },
    { field: "dailyBudget", label: "日額予算（円）", required: true, type: "number" },
    { field: "notes", label: "備考", required: true, type: "text" },
  ],
  airwork: [
    { field: "impressions", label: "表示回数", required: true, type: "number" },
    { field: "clicks", label: "クリック数", required: true, type: "number" },
    { field: "applications", label: "応募数", required: true, type: "number" },
    { field: "applicationStarts", label: "応募開始数", required: true, type: "number" },
    { field: "cost", label: "掲載費用（円）", required: true, type: "number" },
    { field: "dailyBudget", label: "日額予算（円）", required: true, type: "number" },
    { field: "notes", label: "備考", required: true, type: "text" },
  ],
  jobmedley: [
    { field: "applications", label: "応募数", required: true, type: "number" },
    { field: "applicationStarts", label: "応募開始数", required: true, type: "number" },
    { field: "notes", label: "備考", required: true, type: "text" },
  ],
  hellowork: [
    { field: "applications", label: "応募数", required: true, type: "number" },
    { field: "applicationStarts", label: "応募開始数", required: true, type: "number" },
    { field: "notes", label: "備考", required: true, type: "text" },
  ],
};

export default function PublishRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const [req, setReq] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [metricsForm, setMetricsForm] = useState<Record<string, string>>({});

  function fetchRequest() {
    fetch(`/api/publish-requests/${requestId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setReq)
      .catch(() => router.push("/publish"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRequest(); }, [requestId]);

  async function handleAction(action: string) {
    setActionLoading(true);
    const res = await fetch(`/api/publish-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success("ステータスを更新しました");
      fetchRequest();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
    setActionLoading(false);
  }

  async function handleMetricsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);

    const payload: Record<string, unknown> = {
      startDate: metricsForm.startDate || null,
      endDate: metricsForm.endDate || null,
    };
    const fields = METRICS_FIELDS[req?.platform || "indeed"] || [];
    for (const f of fields) {
      if (f.type === "number") {
        payload[f.field] = metricsForm[f.field] ? parseInt(metricsForm[f.field]) : null;
      } else {
        payload[f.field] = metricsForm[f.field] || null;
      }
    }

    const res = await fetch(`/api/publish-requests/${requestId}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("数値を保存しました");
      fetchRequest();
    } else {
      toast.error("保存に失敗しました");
    }
    setActionLoading(false);
  }

  if (loading || !req) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-gray-500 text-center">読み込み中...</p>
      </div>
    );
  }

  // サーバー側でパース済みの原稿データを使用（Team Aレコードの該当プラットフォーム）
  const manuscriptData = req.manuscriptData;
  const thumbnailUrls = req.manuscriptThumbnails || [];

  const fields = METRICS_FIELDS[req.platform] || METRICS_FIELDS.indeed;

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-bold">
              {PLATFORM_LABELS[req.platform]} 掲載依頼
            </h1>
            <PublishRequestStatusBadge status={req.status} />
          </div>
          {req.job && (
            <p className="text-muted-foreground">
              {req.job.officeName} / {req.job.jobTypeName} / {req.job.employmentTypeName}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {req.startDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                予定: {req.startDate}{req.endDate ? ` ~ ${req.endDate}` : ""}
              </span>
            )}
            {req.requestedUser && (
              <span>依頼者: {req.requestedUser.name}</span>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        {/* 修正依頼アラート（全ステータス共通） */}
        {req.modificationPending && (
          <Card className="mb-4 border-orange-200 bg-orange-50">
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">原稿の修正依頼があります</p>
                    <p className="text-xs text-orange-600">
                      下に表示されている原稿が最新版です。内容を確認し、媒体へ反映してください
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAction("complete_modification")}
                  disabled={actionLoading}
                  className="bg-orange-600 hover:bg-orange-700 shrink-0"
                >
                  <CheckCheck className="w-4 h-4 mr-1.5" />
                  修正完了
                </Button>
              </div>
              {req.modificationRequestedAt && (
                <p className="text-[11px] text-orange-500 ml-6">
                  修正依頼日時: {new Date(req.modificationRequestedAt).toLocaleString("ja-JP")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="py-4">
            {req.status === "pending" && (
              <div className="flex items-center justify-between">
                <p className="text-sm">この求人を媒体に掲載してください</p>
                <Button
                  onClick={() => handleAction("start_publishing")}
                  disabled={actionLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  掲載開始
                </Button>
              </div>
            )}
            {req.status === "publishing" && (
              <div className="flex items-center justify-between">
                <p className="text-sm">掲載が完了したらボタンを押してください</p>
                <Button
                  onClick={() => handleAction("complete")}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  掲載完了
                </Button>
              </div>
            )}
            {req.status === "completed" && (
              <form onSubmit={handleMetricsSubmit} className="space-y-4">
                <p className="text-sm font-medium">掲載数値を入力してください</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">
                      掲載開始日<span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={metricsForm.startDate || ""}
                      onChange={(e) => setMetricsForm({ ...metricsForm, startDate: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">
                      掲載終了日<span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={metricsForm.endDate || ""}
                      onChange={(e) => setMetricsForm({ ...metricsForm, endDate: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  {fields.map((f) => (
                    <div key={f.field} className={f.field === "notes" ? "col-span-2" : ""}>
                      <Label className="text-sm">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {f.field === "notes" ? (
                        <Textarea
                          value={metricsForm[f.field] || ""}
                          onChange={(e) => setMetricsForm({ ...metricsForm, [f.field]: e.target.value })}
                          rows={2}
                          className="mt-1"
                        />
                      ) : (
                        <Input
                          type="number"
                          value={metricsForm[f.field] || ""}
                          onChange={(e) => setMetricsForm({ ...metricsForm, [f.field]: e.target.value })}
                          required={f.required}
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={actionLoading}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {actionLoading ? "報告中..." : "数値を入力して報告する"}
                </Button>
              </form>
            )}
            {req.status === "expired" && (
              <p className="text-sm text-gray-500">この掲載依頼は完了しました</p>
            )}
          </CardContent>
        </Card>

        {/* サムネイルプレビュー */}
        {thumbnailUrls.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                サムネイル（{thumbnailUrls.length}枚）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThumbnailPreview urls={thumbnailUrls} filenamePrefix={`${req.platform}_thumbnail`} />
            </CardContent>
          </Card>
        )}

        {/* 原稿プレビュー */}
        {manuscriptData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">原稿内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(manuscriptData)
                  .filter(([k, v]) => v && typeof v === "string" && v.trim() && k !== "thumbnailUrls")
                  .map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        {FIELD_LABELS[key] || key}
                      </p>
                      <div className="bg-gray-50 border rounded p-2 text-sm whitespace-pre-wrap">
                        {value}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
