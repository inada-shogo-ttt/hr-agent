"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PLATFORM_FIELDS } from "@/lib/platform-fields";
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";

const CATCHPHRASE_PLATFORMS = new Set(["indeed", "airwork"]);

export default function NewSystemReferencePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("indeed");
  const [industry, setIndustry] = useState("");
  const [jobType, setJobType] = useState("");
  const [performance, setPerformance] = useState("");
  const [catchphrase, setCatchphrase] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [postingData, setPostingData] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false);

  const group = PLATFORM_FIELDS[platform];
  const showCatchphrase = CATCHPHRASE_PLATFORMS.has(platform);
  const canAnalyze = !!platform && !!rawContent.trim() && !!industry && !!jobType;

  const resetAnalysis = () => {
    setAnalyzed(false);
    setPostingData({});
    setShowOptional(false);
  };

  const handlePlatformChange = (v: string) => {
    setPlatform(v);
    resetAnalysis();
  };

  const updateField = (key: string, value: string) => {
    setPostingData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/settings/system-references/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, content: rawContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "解析に失敗しました");
        return;
      }
      const data = (await res.json()) as { postingData: Record<string, string> };
      setPostingData(data.postingData || {});
      const hasOptionalValue = (group.optional ?? []).some(
        (f) => data.postingData && data.postingData[f.key]?.trim()
      );
      setShowOptional(hasOptionalValue);
      setAnalyzed(true);
      toast.success("原稿を解析しました。内容を確認・修正してください。");
    } catch (error) {
      console.error(error);
      toast.error("解析中にエラーが発生しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !industry || !jobType) return;
    if (!analyzed) {
      toast.error("先に原稿を解析してください");
      return;
    }

    const filteredData: Record<string, string> = {};
    for (const [k, v] of Object.entries(postingData)) {
      if (typeof v === "string" && v.trim()) filteredData[k] = v.trim();
    }
    if (showCatchphrase && catchphrase.trim()) {
      filteredData.catchphrase = catchphrase.trim();
    }

    if (Object.keys(filteredData).length === 0) {
      toast.error("原稿データを少なくとも1つ入力してください");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch("/api/settings/system-references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        platform,
        industry,
        jobType,
        postingData: filteredData,
        performance: performance || undefined,
      }),
    });

    if (res.ok) {
      router.push("/settings/system-references");
    } else {
      setIsSubmitting(false);
      toast.error("登録に失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>参考原稿を登録</CardTitle>
        <CardDescription>
          応募殺到した求人原稿を貼り付けると、AIが項目ごとに自動で切り分けます。内容を確認してから登録してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">管理用タイトル *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 介護職_応募殺到ver"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">媒体 *</Label>
              <Select value={platform} onValueChange={handlePlatformChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indeed">Indeed</SelectItem>
                  <SelectItem value="airwork">AirWork</SelectItem>
                  <SelectItem value="jobmedley">JobMedley</SelectItem>
                  <SelectItem value="hellowork">ハローワーク</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="performance">実績メモ</Label>
              <Input
                id="performance"
                value={performance}
                onChange={(e) => setPerformance(e.target.value)}
                placeholder="例: 月50件応募"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">業種 *</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="例: 介護・福祉"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobType">職種 *</Label>
              <Input
                id="jobType"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                placeholder="例: 介護職・ヘルパー"
                required
              />
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold">原稿データ</h3>
              <p className="text-xs text-muted-foreground mt-1">
                原稿本文を貼り付けて「原稿を解析する」を押すと、AIが仕事内容・アピールポイント・求める人材などに自動で切り分けます。
              </p>
            </div>

            {showCatchphrase && (
              <div className="space-y-1">
                <Label htmlFor="catchphrase" className="text-sm">キャッチコピー</Label>
                <Input
                  id="catchphrase"
                  value={catchphrase}
                  onChange={(e) => setCatchphrase(e.target.value)}
                  placeholder="例: 未経験歓迎！残業ほぼなし、土日休みの介護職"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="rawContent" className="text-sm">原稿本文 *</Label>
              <Textarea
                id="rawContent"
                value={rawContent}
                onChange={(e) => {
                  setRawContent(e.target.value);
                  if (analyzed) setAnalyzed(false);
                }}
                rows={14}
                placeholder="応募殺到した求人原稿を丸ごと貼り付けてください（仕事内容・給与・待遇・応募要件など、全セクションを含めて OK）"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {analyzed ? "再度解析すると下の各項目が上書きされます。" : "業種・職種・媒体・原稿本文を入力してから解析できます。"}
              </p>
              <Button
                type="button"
                variant={analyzed ? "outline" : "default"}
                size="sm"
                onClick={handleAnalyze}
                disabled={!canAnalyze || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {analyzed ? "再解析する" : "原稿を解析する"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {analyzed && (
            <div className="border-t pt-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold">解析結果（編集できます）</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  誤抽出や抜けがあれば修正してください。空欄のまま登録しても OK です。
                </p>
              </div>

              {group.main
                .filter((field) => field.key !== "catchphrase")
                .map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label htmlFor={field.key} className="text-sm">{field.label}</Label>
                    {field.multiline ? (
                      <Textarea
                        id={field.key}
                        value={postingData[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        rows={4}
                        placeholder={`${field.label}を入力`}
                      />
                    ) : (
                      <Input
                        id={field.key}
                        value={postingData[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={`${field.label}を入力`}
                      />
                    )}
                  </div>
                ))}

              {group.optional.length > 0 && (
                <div className="pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowOptional((v) => !v)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    任意項目（研修体制・会社概要・選考フロー など）
                  </button>
                  {showOptional && (
                    <div className="space-y-4 mt-2">
                      {group.optional.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={field.key} className="text-sm">{field.label}</Label>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">任意</span>
                          </div>
                          {field.multiline ? (
                            <Textarea
                              id={field.key}
                              value={postingData[field.key] || ""}
                              onChange={(e) => updateField(field.key, e.target.value)}
                              rows={4}
                              placeholder={`${field.label}を入力`}
                            />
                          ) : (
                            <Input
                              id={field.key}
                              value={postingData[field.key] || ""}
                              onChange={(e) => updateField(field.key, e.target.value)}
                              placeholder={`${field.label}を入力`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !analyzed}
          >
            {isSubmitting ? "登録中..." : "参考原稿を登録する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
