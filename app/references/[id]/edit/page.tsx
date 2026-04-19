"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLATFORM_FIELDS } from "../../fields";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function EditReferencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("indeed");
  const [industry, setIndustry] = useState("");
  const [jobType, setJobType] = useState("");
  const [performance, setPerformance] = useState("");
  const [postingData, setPostingData] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    fetch(`/api/references/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          toast.error("参考原稿が見つかりません");
          router.push("/references");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setTitle(data.title ?? "");
        setPlatform(data.platform ?? "indeed");
        setIndustry(data.industry ?? "");
        setJobType(data.jobType ?? "");
        setPerformance(data.performance ?? "");
        const parsed =
          typeof data.postingData === "string"
            ? (() => {
                try {
                  return JSON.parse(data.postingData);
                } catch {
                  return {};
                }
              })()
            : data.postingData ?? {};
        setPostingData(parsed);
        const platformKey = data.platform ?? "indeed";
        const optional = PLATFORM_FIELDS[platformKey]?.optional ?? [];
        const hasOptionalValue = optional.some(
          (f) => typeof parsed[f.key] === "string" && parsed[f.key].trim() !== ""
        );
        if (hasOptionalValue) setShowOptional(true);
        setLoading(false);
      });
  }, [id, router]);

  const updateField = (key: string, value: string) => {
    setPostingData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !industry || !jobType) return;

    const filteredData: Record<string, string> = {};
    for (const [k, v] of Object.entries(postingData)) {
      if (typeof v === "string" && v.trim()) filteredData[k] = v.trim();
    }

    if (Object.keys(filteredData).length === 0) {
      toast.error("原稿データを少なくとも1つ入力してください");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch(`/api/references/${id}`, {
      method: "PATCH",
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
      toast.success("参考原稿を更新しました");
      router.push("/references");
    } else {
      setIsSubmitting(false);
      toast.error("更新に失敗しました");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8]">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">読み込み中...</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>参考原稿を編集</CardTitle>
            <CardDescription>
              登録済みの参考原稿を編集します。Team A/B は更新後の内容を次回以降の参考に使用します。
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
                  <Select value={platform} onValueChange={(v) => setPlatform(v)}>
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

              <div className="space-y-2">
                <Label>原稿データ *</Label>
                <Tabs value={platform} className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="indeed" className="flex-1" onClick={() => setPlatform("indeed")}>Indeed</TabsTrigger>
                    <TabsTrigger value="airwork" className="flex-1" onClick={() => setPlatform("airwork")}>AirWork</TabsTrigger>
                    <TabsTrigger value="jobmedley" className="flex-1" onClick={() => setPlatform("jobmedley")}>JobMedley</TabsTrigger>
                    <TabsTrigger value="hellowork" className="flex-1" onClick={() => setPlatform("hellowork")}>ハローワーク</TabsTrigger>
                  </TabsList>
                  {Object.entries(PLATFORM_FIELDS).map(([plat, group]) => (
                    <TabsContent key={plat} value={plat} className="space-y-4 mt-4">
                      {group.main.map((field) => (
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
                            任意項目を追加（研修体制・会社概要・選考フロー など）
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
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/references")}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "更新中..." : "更新する"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
