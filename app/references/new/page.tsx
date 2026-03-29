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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLATFORM_FIELDS: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
  indeed: [
    { key: "jobTitle", label: "職種名" },
    { key: "catchphrase", label: "キャッチコピー" },
    { key: "jobDescription", label: "仕事内容", multiline: true },
    { key: "appealPoints", label: "アピールポイント", multiline: true },
    { key: "requirements", label: "求める人材", multiline: true },
    { key: "holidays", label: "休暇休日" },
    { key: "benefits", label: "待遇・福利厚生", multiline: true },
  ],
  airwork: [
    { key: "jobTitle", label: "職種名" },
    { key: "catchphrase", label: "キャッチコピー" },
    { key: "jobDescription", label: "仕事内容", multiline: true },
    { key: "requirements", label: "求める人材", multiline: true },
    { key: "selectionProcess", label: "選考の流れ", multiline: true },
  ],
  jobmedley: [
    { key: "appealTitle", label: "訴求文タイトル" },
    { key: "appealText", label: "訴求文", multiline: true },
    { key: "jobDescription", label: "仕事内容", multiline: true },
    { key: "trainingSystem", label: "教育体制・研修", multiline: true },
    { key: "requirements", label: "応募要件", multiline: true },
  ],
  hellowork: [
    { key: "jobTitle", label: "職種" },
    { key: "jobDescription", label: "仕事の内容", multiline: true },
    { key: "requirements", label: "必要な経験・知識・技能等", multiline: true },
    { key: "wageAmount", label: "賃金額" },
    { key: "workingHours", label: "就業時間" },
    { key: "holidays", label: "休日" },
    { key: "remarks", label: "求人に関する特記事項", multiline: true },
  ],
};

export default function NewReferencePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("indeed");
  const [industry, setIndustry] = useState("");
  const [jobType, setJobType] = useState("");
  const [performance, setPerformance] = useState("");
  const [postingData, setPostingData] = useState<Record<string, string>>({});

  const updateField = (key: string, value: string) => {
    setPostingData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !industry || !jobType) return;

    // Filter out empty fields
    const filteredData: Record<string, string> = {};
    for (const [k, v] of Object.entries(postingData)) {
      if (v.trim()) filteredData[k] = v.trim();
    }

    if (Object.keys(filteredData).length === 0) {
      toast.error("原稿データを少なくとも1つ入力してください");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/references", {
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
      router.push("/references");
    } else {
      setIsSubmitting(false);
      toast.error("登録に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>参考原稿を登録</CardTitle>
            <CardDescription>
              応募殺到した求人原稿を登録しておくと、AIが原稿作成・改善時に参考にします。
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
                  <Select value={platform} onValueChange={(v) => { setPlatform(v); setPostingData({}); }}>
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
                    <TabsTrigger value="indeed" className="flex-1" onClick={() => { setPlatform("indeed"); setPostingData({}); }}>Indeed</TabsTrigger>
                    <TabsTrigger value="airwork" className="flex-1" onClick={() => { setPlatform("airwork"); setPostingData({}); }}>AirWork</TabsTrigger>
                    <TabsTrigger value="jobmedley" className="flex-1" onClick={() => { setPlatform("jobmedley"); setPostingData({}); }}>JobMedley</TabsTrigger>
                    <TabsTrigger value="hellowork" className="flex-1" onClick={() => { setPlatform("hellowork"); setPostingData({}); }}>ハローワーク</TabsTrigger>
                  </TabsList>
                  {Object.entries(PLATFORM_FIELDS).map(([plat, fields]) => (
                    <TabsContent key={plat} value={plat} className="space-y-4 mt-4">
                      {fields.map((field) => (
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
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "登録中..." : "参考原稿を登録する"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
