"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExistingIndeedFields } from "@/app/components/forms/ExistingIndeedFields";
import { ExistingAirWorkFields } from "@/app/components/forms/ExistingAirWorkFields";
import { ExistingJobMedleyFields } from "@/app/components/forms/ExistingJobMedleyFields";
import { ExistingHelloWorkFields } from "@/app/components/forms/ExistingHelloWorkFields";
import { TeamBInput, ExistingPostingFields, IndeedMetrics, AirWorkMetrics } from "@/types/team-b";
import { Platform } from "@/types/platform";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, CheckCircle, ImageIcon } from "lucide-react";
import { ThumbnailPreview } from "@/app/components/output/ThumbnailPreview";

export default function JobRewritePostingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const initialPlatform = (searchParams.get("platform") as Platform) || "indeed";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [posting, setPosting] = useState<ExistingPostingFields>({});
  const [indeedMetrics, setIndeedMetrics] = useState<IndeedMetrics>({});
  const [airworkMetrics, setAirworkMetrics] = useState<AirWorkMetrics>({});
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);

  // 前回のTeam A出力を自動ロード
  useEffect(() => {
    fetch(`/api/jobs/${jobId}/history-context`)
      .then((r) => r.json())
      .then((data) => {
        setHistoryCount(data.recordCount || 0);

        if (data.latestThumbnailUrls?.length > 0) {
          setThumbnailUrls(data.latestThumbnailUrls);
        }

        if (data.latestTeamAOutput) {
          const output = data.latestTeamAOutput;
          // Indeed出力から既存原稿フィールドに変換
          const indeed = output.indeed;
          const airwork = output.airwork;
          const jobmedley = output.jobmedley;

          if (indeed) {
            setPosting((prev) => ({
              ...prev,
              companyName: indeed.companyName || "",
              jobTitle: indeed.jobTitle || "",
              catchphrase: indeed.catchphrase || "",
              numberOfHires: indeed.numberOfHires || "",
              location: indeed.location || "",
              employmentType: indeed.employmentType || "",
              salary: indeed.salary || "",
              workingHours: indeed.workingHours || "",
              socialInsurance: indeed.socialInsurance || "",
              probationPeriod: indeed.probationPeriod || "",
              jobDescription: indeed.jobDescription || "",
              appealPoints: indeed.appealPoints || "",
              requirements: indeed.requirements || "",
              holidays: indeed.holidays || "",
              access: indeed.access || "",
              benefits: indeed.benefits || "",
              recruitmentBudget: indeed.recruitmentBudget || "",
              // AirWork fields
              ...(airwork ? {
                selectionProcess: airwork.selectionProcess || "",
              } : {}),
              // JobMedley fields
              ...(jobmedley ? {
                appealTitle: jobmedley.appealTitle || "",
                appealText: jobmedley.appealText || "",
                trainingSystem: jobmedley.trainingSystem || "",
                welcomeRequirements: jobmedley.welcomeRequirements || "",
                employmentTypeAndSalary: jobmedley.employmentTypeAndSalary || "",
              } : {}),
              // HelloWork fields
              ...(output.hellowork ? {
                companyAddress: output.hellowork.companyAddress || "",
                workLocation: output.hellowork.workLocation || "",
                employmentPeriod: output.hellowork.employmentPeriod || "",
                contractRenewal: output.hellowork.contractRenewal || "",
                wageType: output.hellowork.wageType || "",
                wageAmount: output.hellowork.wageAmount || "",
                allowances: output.hellowork.allowances || "",
                commutingAllowance: output.hellowork.commutingAllowance || "",
                bonus: output.hellowork.bonus || "",
                raise: output.hellowork.raise || "",
                overtime: output.hellowork.overtime || "",
                annualLeave: output.hellowork.annualLeave || "",
                insurance: output.hellowork.insurance || "",
                pension: output.hellowork.pension || "",
                trialPeriod: output.hellowork.trialPeriod || "",
                requiredLicenses: output.hellowork.requiredLicenses || "",
                selectionMethod: output.hellowork.selectionMethod || "",
                applicationDocuments: output.hellowork.applicationDocuments || "",
                remarks: output.hellowork.remarks || "",
              } : {}),
            }));
            setLoadedFromHistory(true);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId]);

  const updatePosting = (data: Partial<ExistingPostingFields>) => {
    setPosting((prev) => ({ ...prev, ...data }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const input: TeamBInput = {
      platform,
      existingPosting: posting,
      metrics: platform === "indeed" ? indeedMetrics : platform === "airwork" ? airworkMetrics : undefined,
    };

    // jobIdも一緒にsessionStorageに保存
    sessionStorage.setItem("teamBInput", JSON.stringify(input));
    sessionStorage.setItem("teamBJobId", jobId);

    router.push(`/jobs/${jobId}/rewrite-posting/progress`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          前回の原稿データを読み込み中...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/jobs/${jobId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          求人詳細に戻る
        </Link>

        <h1 className="text-2xl font-bold mb-2">再掲載用原稿改善</h1>
        <p className="text-muted-foreground mb-4">
          AIが既存原稿の課題を分析し、改善案を提案します。
        </p>

        {loadedFromHistory && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">
                  前回の チームA 出力を自動ロードしました（過去{historyCount}件の履歴あり）
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                原稿内容は編集可能です。掲載数値を入力してAIに改善を依頼してください。
              </p>
            </CardContent>
          </Card>
        )}

        {thumbnailUrls.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                現在のサムネイル（{thumbnailUrls.length}枚）
              </CardTitle>
              <CardDescription>
                前回のTeam A実行時に生成されたサムネイル画像です。Team B実行時に改善版が生成されます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThumbnailPreview urls={thumbnailUrls} />
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>既存原稿と掲載数値の入力</CardTitle>
              <CardDescription>
                改善したい媒体を選択し、掲載数値を入力してください。原稿は前回のTeam A出力から自動入力されています。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="indeed" onValueChange={(v) => setPlatform(v as Platform)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="indeed">インディード</TabsTrigger>
                  <TabsTrigger value="airwork">エアワーク</TabsTrigger>
                  <TabsTrigger value="jobmedley">ジョブメドレー</TabsTrigger>
                  <TabsTrigger value="hellowork">ハローワーク</TabsTrigger>
                </TabsList>

                <TabsContent value="indeed" className="mt-6">
                  <ExistingIndeedFields
                    data={posting}
                    metrics={indeedMetrics}
                    onChange={updatePosting}
                    onMetricsChange={(data) => setIndeedMetrics((prev) => ({ ...prev, ...data }))}
                  />
                </TabsContent>

                <TabsContent value="airwork" className="mt-6">
                  <ExistingAirWorkFields
                    data={posting}
                    metrics={airworkMetrics}
                    onChange={updatePosting}
                    onMetricsChange={(data) => setAirworkMetrics((prev) => ({ ...prev, ...data }))}
                  />
                </TabsContent>

                <TabsContent value="jobmedley" className="mt-6">
                  <ExistingJobMedleyFields data={posting} onChange={updatePosting} />
                </TabsContent>

                <TabsContent value="hellowork" className="mt-6">
                  <ExistingHelloWorkFields data={posting} onChange={updatePosting} />
                </TabsContent>
              </Tabs>

              <div className="mt-8 flex justify-end">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "処理中..." : "AIで原稿を改善する"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </main>
  );
}
