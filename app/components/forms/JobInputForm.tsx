"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommonFields } from "./CommonFields";
import { IndeedFields } from "./IndeedFields";
import { AirWorkFields } from "./AirWorkFields";
import { JobMedleyFields } from "./JobMedleyFields";
import { HelloWorkFields } from "./HelloWorkFields";
import { SmartDefaultsSelector } from "./SmartDefaultsSelector";
import { AIInputMode } from "./AIInputMode";
import { JobPostingInput, CommonJobInfo } from "@/types/job-posting";
import { Platform } from "@/types/platform";
import { Sparkles, ClipboardEdit, ImageIcon, X, Check } from "lucide-react";
import { fileToCompressedDataUrl } from "@/lib/client-image";
import { toast } from "sonner";

const defaultCommonInfo: CommonJobInfo = {
  companyName: "",
  industry: "",
  companyDescription: "",
  jobTitle: "",
  employmentType: "正社員",
  numberOfHires: 1,
  prefecture: "東京都",
  city: "",
  address: "",
  nearestStation: "",
  accessFromStation: "",
  salaryMin: 200000,
  salaryMax: undefined,
  salaryType: "月給",
  salaryDescription: "",
  workingHours: "",
  workingHoursDescription: "",
  jobDescription: "",
  requirements: "",
  welcomeRequirements: "",
  holidays: "",
  benefits: "",
  socialInsurance: [],
  probationPeriod: "",
  selectionProcess: "",
  appealPoints: "",
  targetAudience: "",
  competitiveAdvantage: "",
};

const PLATFORM_OPTIONS: { value: Platform; label: string; description: string }[] = [
  { value: "indeed", label: "インディード", description: "サムネイル付き" },
  { value: "airwork", label: "エアワーク", description: "サムネイル付き" },
  { value: "jobmedley", label: "ジョブメドレー", description: "サムネイル付き" },
  { value: "hellowork", label: "ハローワーク", description: "求人票形式" },
];

const ALL_PLATFORMS: Platform[] = PLATFORM_OPTIONS.map((o) => o.value);

interface JobInputFormProps {
  jobId: string;
  /** 既存求人の流用時に渡す初期値。渡すとフォーム入力モードで開き、内容を反映する */
  initialData?: JobPostingInput;
  /** 流用元の求人ID。渡すと流用元の確定原稿を参考原稿として生成に注入する */
  reuseSourceJobId?: string;
}

export function JobInputForm({ jobId, initialData, reuseSourceJobId }: JobInputFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<"ai" | "manual">(initialData ? "manual" : "ai");
  const [formData, setFormData] = useState<JobPostingInput>({
    common: { ...defaultCommonInfo, ...initialData?.common },
    indeed: initialData?.indeed || {},
    airwork: initialData?.airwork || {},
    jobmedley: initialData?.jobmedley || {},
    hellowork: initialData?.hellowork || {},
    selectedPlatforms:
      initialData?.selectedPlatforms && initialData.selectedPlatforms.length > 0
        ? initialData.selectedPlatforms
        : [...ALL_PLATFORMS],
  });
  const [activeTab, setActiveTab] = useState("common");
  const thumbnailRefInputRef = useRef<HTMLInputElement>(null);

  const selectedPlatforms = formData.selectedPlatforms ?? ALL_PLATFORMS;

  const togglePlatform = (p: Platform) => {
    setFormData((prev) => {
      const current = prev.selectedPlatforms ?? [...ALL_PLATFORMS];
      const next = current.includes(p)
        ? current.filter((x) => x !== p)
        : [...current, p];
      return { ...prev, selectedPlatforms: next };
    });
    // 選択解除した媒体のタブを開いていたら共通情報タブに戻す
    if (selectedPlatforms.includes(p) && activeTab === p) {
      setActiveTab("common");
    }
  };

  // AI解析（約25秒）中のアップロード・編集が漏れないよう、送信時は常に最新の formData を参照する
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  async function handleThumbnailReferenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (thumbnailRefInputRef.current) thumbnailRefInputRef.current.value = "";
    if (!file?.type.startsWith("image/")) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setFormData((prev) => ({ ...prev, thumbnailReference: dataUrl }));
    } catch {
      toast.error("画像の読み込みに失敗しました");
    }
  }

  const updateCommon = (data: Partial<CommonJobInfo>) => {
    setFormData((prev) => ({
      ...prev,
      common: { ...prev.common, ...data },
    }));
  };

  const handleAIParsed = (data: Partial<CommonJobInfo>) => {
    // AI解析結果をマージしてそのままTeam Aを起動
    // formData を直接参照すると解析中にアップロードした参考画像等が stale closure で落ちるため ref 経由で読む
    const latest = formDataRef.current;
    if (!latest.selectedPlatforms || latest.selectedPlatforms.length === 0) {
      toast.error("出力する媒体を1つ以上選択してください");
      return;
    }
    const merged: JobPostingInput = {
      ...latest,
      common: { ...latest.common, ...data },
    };
    sessionStorage.setItem(
      "jobPostingInput",
      JSON.stringify({ ...merged, ...(reuseSourceJobId ? { reuseSourceJobId } : {}) })
    );
    router.push(`/jobs/${jobId}/new-posting/progress`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latest = formDataRef.current;
    if (!latest.selectedPlatforms || latest.selectedPlatforms.length === 0) {
      toast.error("出力する媒体を1つ以上選択してください");
      return;
    }
    setIsSubmitting(true);

    // フォームデータをsessionStorageに保存
    sessionStorage.setItem(
      "jobPostingInput",
      JSON.stringify({ ...latest, ...(reuseSourceJobId ? { reuseSourceJobId } : {}) })
    );

    // 進捗ページへ遷移
    router.push(`/jobs/${jobId}/new-posting/progress`);
  };

  return (
    <div className="space-y-6">
      {/* Input mode selector */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setInputMode("ai")}
          className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
            inputMode === "ai"
              ? "border-violet-400 bg-violet-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <Sparkles className={`w-5 h-5 ${inputMode === "ai" ? "text-violet-500" : "text-gray-400"}`} />
          <div>
            <p className={`font-medium text-sm ${inputMode === "ai" ? "text-violet-700" : "text-gray-700"}`}>
              AIかんたん入力
            </p>
            <p className="text-xs text-muted-foreground">テキスト or ファイルからAIが自動入力</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setInputMode("manual")}
          className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
            inputMode === "manual"
              ? "border-blue-400 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <ClipboardEdit className={`w-5 h-5 ${inputMode === "manual" ? "text-blue-500" : "text-gray-400"}`} />
          <div>
            <p className={`font-medium text-sm ${inputMode === "manual" ? "text-blue-700" : "text-gray-700"}`}>
              フォーム入力
            </p>
            <p className="text-xs text-muted-foreground">各項目を手動で入力・編集</p>
          </div>
        </button>
      </div>

      {/* 出力する媒体の選択（両モード共通） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">出力する媒体</CardTitle>
          <CardDescription>
            求人原稿を作成する媒体を選択してください。選択した媒体のみ原稿を生成します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORM_OPTIONS.map((option) => {
              const checked = selectedPlatforms.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => togglePlatform(option.value)}
                  aria-pressed={checked}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all text-left ${
                    checked
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`w-5 h-5 shrink-0 rounded flex items-center justify-center border ${
                      checked
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span>
                    <span
                      className={`block text-sm font-medium ${
                        checked ? "text-blue-700" : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {selectedPlatforms.length === 0 && (
            <p className="mt-3 text-xs text-red-500">
              出力する媒体を1つ以上選択してください
            </p>
          )}
        </CardContent>
      </Card>

      {/* サムネイル参考画像（両モード共通・任意） */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <input
              ref={thumbnailRefInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailReferenceUpload}
              className="hidden"
            />
            {formData.thumbnailReference ? (
              <div className="relative shrink-0 w-40 aspect-video rounded-lg overflow-hidden border group">
                <img
                  src={formData.thumbnailReference}
                  alt="サムネイル参考画像"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, thumbnailReference: null }))
                  }
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="参考画像を削除"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbnailRefInputRef.current?.click()}
                className="shrink-0 w-40 aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-500">画像を選択</span>
              </button>
            )}
            <div>
              <p className="font-medium text-sm mb-1">サムネイル参考画像（任意）</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                実際の職場写真や過去に成果が出たサムネイルを登録すると、AIがその構図・色調・雰囲気を踏襲してサムネイルを生成します。未登録の場合は求人情報から自動生成します。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Input Mode */}
      {inputMode === "ai" && (
        <Card>
          <CardContent className="pt-6">
            <AIInputMode onParsed={handleAIParsed} />
          </CardContent>
        </Card>
      )}

      {/* Manual Form Mode */}
      {inputMode === "manual" && (
        <form onSubmit={handleSubmit}>
          <SmartDefaultsSelector onApply={updateCommon} />
          <Card>
            <CardHeader>
              <CardTitle>求人情報の入力</CardTitle>
              <CardDescription>
                共通情報と各媒体向けの情報を入力してください。AIが自動で選択した媒体分の求人原稿を生成します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList
                  className={`grid w-full ${
                    ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5"][
                      selectedPlatforms.length
                    ]
                  }`}
                >
                  <TabsTrigger value="common">共通情報</TabsTrigger>
                  {PLATFORM_OPTIONS.filter((o) => selectedPlatforms.includes(o.value)).map(
                    (o) => (
                      <TabsTrigger key={o.value} value={o.value}>
                        {o.label}
                      </TabsTrigger>
                    )
                  )}
                </TabsList>

                <TabsContent value="common" className="mt-6">
                  <CommonFields data={formData.common} onChange={updateCommon} />
                </TabsContent>

                {selectedPlatforms.includes("indeed") && (
                  <TabsContent value="indeed" className="mt-6">
                    <IndeedFields
                      data={formData.indeed || {}}
                      onChange={(data) =>
                        setFormData((prev) => ({ ...prev, indeed: { ...prev.indeed, ...data } }))
                      }
                    />
                  </TabsContent>
                )}

                {selectedPlatforms.includes("airwork") && (
                  <TabsContent value="airwork" className="mt-6">
                    <AirWorkFields
                      data={formData.airwork || {}}
                      onChange={(data) =>
                        setFormData((prev) => ({ ...prev, airwork: { ...prev.airwork, ...data } }))
                      }
                    />
                  </TabsContent>
                )}

                {selectedPlatforms.includes("jobmedley") && (
                  <TabsContent value="jobmedley" className="mt-6">
                    <JobMedleyFields
                      data={formData.jobmedley || {}}
                      onChange={(data) =>
                        setFormData((prev) => ({
                          ...prev,
                          jobmedley: { ...prev.jobmedley, ...data },
                        }))
                      }
                    />
                  </TabsContent>
                )}

                {selectedPlatforms.includes("hellowork") && (
                  <TabsContent value="hellowork" className="mt-6">
                    <HelloWorkFields
                      data={formData.hellowork || {}}
                      onChange={(data) =>
                        setFormData((prev) => ({
                          ...prev,
                          hellowork: { ...prev.hellowork, ...data },
                        }))
                      }
                    />
                  </TabsContent>
                )}
              </Tabs>

              <div className="mt-8 flex justify-end">
                <Button type="submit" size="lg" disabled={isSubmitting || selectedPlatforms.length === 0}>
                  {isSubmitting ? "処理中..." : "AIで求人原稿を自動生成"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
