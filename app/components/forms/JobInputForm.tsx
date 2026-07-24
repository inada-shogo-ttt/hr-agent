"use client";

import { Fragment, useEffect, useRef, useState } from "react";
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
import {
  AIInputFields,
  AIInputMethod,
  AIInputValue,
  EMPTY_AI_INPUT,
  parseValidUrl,
} from "./AIInputMode";
import { JobPostingInput, CommonJobInfo } from "@/types/job-posting";
import { Platform } from "@/types/platform";
import {
  Sparkles,
  ClipboardEdit,
  ImageIcon,
  X,
  Check,
  Link2,
  FileUp,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
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

const STEPS = [
  { num: 1, label: "入力方法" },
  { num: 2, label: "情報を入力" },
  { num: 3, label: "サムネ素材と生成" },
] as const;

const METHOD_OPTIONS: {
  value: AIInputMethod;
  icon: typeof ClipboardEdit;
  title: string;
  description: string;
}[] = [
  {
    value: "text",
    icon: ClipboardEdit,
    title: "求人情報を自分で入力",
    description: "フリーテキストで書くだけ。詳細フォームへの切替もできます",
  },
  {
    value: "url",
    icon: Link2,
    title: "求人のURLを貼り付ける",
    description: "求人ページや会社HPのURLからAIが情報を読み取ります",
  },
  {
    value: "file",
    icon: FileUp,
    title: "PDFなどのファイルを添付",
    description: "求人票PDF・画像・テキストファイルからAIが情報を読み取ります",
  },
];

interface JobInputFormProps {
  jobId: string;
  /** 既存求人の流用時に渡す初期値。渡すと詳細フォームを開いた状態で開始し、内容を反映する */
  initialData?: JobPostingInput;
  /** 流用元の求人ID。渡すと流用元の確定原稿を参考原稿として生成に注入する */
  reuseSourceJobId?: string;
}

export function JobInputForm({ jobId, initialData, reuseSourceJobId }: JobInputFormProps) {
  const router = useRouter();
  const isReuse = !!initialData;
  const [step, setStep] = useState<1 | 2 | 3>(isReuse ? 2 : 1);
  const [method, setMethod] = useState<AIInputMethod | null>(isReuse ? "text" : null);
  const [manualVariant, setManualVariant] = useState<"freetext" | "form">(
    isReuse ? "form" : "freetext"
  );
  const [aiInput, setAiInput] = useState<AIInputValue>(EMPTY_AI_INPUT);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const isDirectForm = method === "text" && manualVariant === "form";

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

  const goToProgress = (input: JobPostingInput) => {
    sessionStorage.setItem(
      "jobPostingInput",
      JSON.stringify({ ...input, ...(reuseSourceJobId ? { reuseSourceJobId } : {}) })
    );
    // 前回実行の runId が残っていると進捗ページが古い実行へ復帰してしまうためクリア
    sessionStorage.removeItem(`teamARunId:${jobId}`);
    router.push(`/jobs/${jobId}/new-posting/progress`);
  };

  const canProceedStep2 = (() => {
    if (method === "text") {
      return manualVariant === "form" || aiInput.text.trim().length > 0;
    }
    if (method === "url") {
      return aiInput.urls.length > 0 || parseValidUrl(aiInput.urlInput) !== null;
    }
    if (method === "file") return aiInput.files.length > 0;
    return false;
  })();

  const handleGenerate = async () => {
    // formData を直接参照すると解析中にアップロードした参考画像等が stale closure で落ちるため ref 経由で読む
    const latest = formDataRef.current;
    if (!latest.selectedPlatforms || latest.selectedPlatforms.length === 0) {
      toast.error("出力する媒体を1つ以上選択してください");
      return;
    }

    // 詳細フォーム経由はAI解析なしで直接生成へ
    if (isDirectForm) {
      setIsSubmitting(true);
      goToProgress(latest);
      return;
    }

    // フリーテキスト / URL / ファイルはAI解析してから生成へ
    setIsParsing(true);
    setParseError(null);
    try {
      // 「追加」ボタン未クリックで入力欄に残っている有効URLも解析対象に取り込む
      const pendingUrl = parseValidUrl(aiInput.urlInput);
      const urls =
        pendingUrl && !aiInput.urls.includes(pendingUrl)
          ? [...aiInput.urls, pendingUrl]
          : aiInput.urls;

      const body =
        method === "url"
          ? { urls }
          : method === "file"
          ? {
              fileContents: aiInput.files.map((f) => ({
                type: f.type,
                content: f.content,
                mimeType: f.mimeType,
                name: f.name,
              })),
            }
          : { text: aiInput.text.trim() };

      const res = await fetch("/api/parse-job-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "解析に失敗しました");
      }

      const data = await res.json();
      const merged = formDataRef.current;
      goToProgress({
        ...merged,
        common: { ...merged.common, ...(data.common as Partial<CommonJobInfo>) },
      });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "解析中にエラーが発生しました");
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ステップインジケータ */}
      <div className="flex items-center gap-3">
        {STEPS.map((s, i) => {
          const isDone = step > s.num;
          const isActive = step === s.num;
          return (
            <Fragment key={s.num}>
              {i > 0 && (
                <div
                  className={`flex-1 h-px ${isDone || isActive ? "bg-violet-300" : "bg-gray-200"}`}
                />
              )}
              <button
                type="button"
                onClick={() => isDone && !isParsing && setStep(s.num)}
                disabled={!isDone || isParsing}
                className={`flex items-center gap-2 ${isDone ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isDone
                      ? "bg-violet-500 text-white"
                      : isActive
                      ? "border-2 border-violet-500 text-violet-600"
                      : "border-2 border-gray-200 text-gray-400"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.num}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-violet-700" : isDone ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* 出力する媒体の選択（常時表示） */}
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

      {/* ステップ1: 入力方法の選択 */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {METHOD_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = method === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setMethod(option.value);
                  setParseError(null);
                  setStep(2);
                }}
                className={`flex flex-col items-start gap-3 p-5 rounded-lg border-2 transition-all text-left ${
                  selected
                    ? "border-violet-400 bg-violet-50"
                    : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/40"
                }`}
              >
                <span className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-600" />
                </span>
                <span>
                  <span className="block font-medium text-sm text-gray-800">
                    {option.title}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ステップ2: 情報を入力 */}
      {step === 2 && method && (
        <div className="space-y-4">
          {method === "text" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setManualVariant("freetext")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  manualVariant === "freetext"
                    ? "border-violet-400 bg-violet-50 text-violet-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                フリーテキストで入力
              </button>
              <button
                type="button"
                onClick={() => setManualVariant("form")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  manualVariant === "form"
                    ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <ClipboardEdit className="w-4 h-4" />
                詳細フォームで入力
              </button>
            </div>
          )}

          {isDirectForm ? (
            <>
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
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <AIInputFields method={method} value={aiInput} onChange={setAiInput} />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              戻る
            </Button>
            <Button type="button" onClick={() => setStep(3)} disabled={!canProceedStep2}>
              次へ
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ステップ3: サムネ素材と生成 */}
      {step === 3 && (
        <div className="space-y-4">
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
                      alt="サムネ素材画像"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, thumbnailReference: null }))
                      }
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="素材画像を削除"
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
                  <p className="font-medium text-sm mb-1">サムネ生成の素材になる画像（任意）</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    実際の職場写真や過去に成果が出たサムネイルを登録すると、AIがその構図・色調・雰囲気を踏襲してサムネイルを生成します。未登録の場合は求人情報から自動生成します。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {parseError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="whitespace-pre-line">{parseError}</div>
              </div>
              <p className="text-xs text-red-500 pl-6">
                ヒント: 入力方法を「求人情報を自分で入力」に切り替え、求人ページの内容を貼り付けることでも解析できます。
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              disabled={isParsing || isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              戻る
            </Button>
            <Button
              type="button"
              size="lg"
              className={isDirectForm ? "" : "bg-violet-600 hover:bg-violet-700"}
              onClick={handleGenerate}
              disabled={isParsing || isSubmitting || selectedPlatforms.length === 0}
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AIが解析中...
                </>
              ) : isSubmitting ? (
                "処理中..."
              ) : isDirectForm ? (
                "AIで求人原稿を自動生成"
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  AIで解析して原稿を作成
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
