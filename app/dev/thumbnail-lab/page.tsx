"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, FlaskConical, ImageIcon, Loader2, X } from "lucide-react";
import { fileToCompressedDataUrl } from "@/lib/client-image";
import { toast } from "sonner";

const PLATFORMS = [
  { value: "indeed", label: "インディード" },
  { value: "airwork", label: "エアワーク" },
  { value: "jobmedley", label: "ジョブメドレー" },
] as const;

type LabPlatform = (typeof PLATFORMS)[number]["value"];

interface LabResult {
  platformThumbnails: Record<string, string[]>;
  generationStatus: "success" | "error" | "placeholder";
  message: string;
  visualStyle?: {
    uniformDescription?: string;
    colorPalette?: string;
    sceneDescription?: string;
  };
  elapsedMs: number;
}

const STORAGE_KEY = "thumbnailLabInput";

export default function ThumbnailLabPage() {
  const [jobTitle, setJobTitle] = useState("介護職");
  const [catchphrase, setCatchphrase] = useState("未経験からプロへ。日勤のみで家庭と両立");
  const [companyName, setCompanyName] = useState("テスト株式会社");
  const [industry, setIndustry] = useState("介護・福祉");
  const [platforms, setPlatforms] = useState<LabPlatform[]>(["indeed"]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<LabResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 前回入力を復元（画像以外）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const v = JSON.parse(saved);
        if (v.jobTitle) setJobTitle(v.jobTitle);
        if (v.catchphrase !== undefined) setCatchphrase(v.catchphrase);
        if (v.companyName) setCompanyName(v.companyName);
        if (v.industry) setIndustry(v.industry);
        if (Array.isArray(v.platforms) && v.platforms.length > 0) setPlatforms(v.platforms);
      }
    } catch {
      // 復元失敗は無視
    }
  }, []);

  // 実行中の経過秒数表示
  useEffect(() => {
    if (!isRunning) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const togglePlatform = (p: LabPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file?.type.startsWith("image/")) return;
    try {
      setReferenceImage(await fileToCompressedDataUrl(file));
    } catch {
      toast.error("画像の読み込みに失敗しました");
    }
  }

  const handleRun = async () => {
    if (!jobTitle.trim() || platforms.length === 0) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ jobTitle, catchphrase, companyName, industry, platforms })
    );
    setIsRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/agents/thumbnail-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          catchphrase,
          companyName,
          industry,
          platforms,
          referenceImage,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(
          res.status === 403
            ? "このページは最高管理者（super_admin）専用です"
            : err?.error || `生成に失敗しました (${res.status})`
        );
      }
      setResult(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成中にエラーが発生しました");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-6 h-6 text-violet-500" />
          <h1 className="text-2xl font-bold">サムネイルラボ</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          原稿生成を経由せず、本番と同じパイプラインでサムネイル生成だけを単体実行します（開発用・最高管理者専用）
        </p>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>職種名（必須）</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={isRunning} />
              </div>
              <div className="space-y-2">
                <Label>キャッチコピー</Label>
                <Input value={catchphrase} onChange={(e) => setCatchphrase(e.target.value)} disabled={isRunning} />
              </div>
              <div className="space-y-2">
                <Label>会社名</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={isRunning} />
              </div>
              <div className="space-y-2">
                <Label>業種</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={isRunning} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>対象媒体</Label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => {
                  const checked = platforms.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePlatform(p.value)}
                      disabled={isRunning}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        checked
                          ? "border-violet-400 bg-violet-50 text-violet-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                媒体数が少ないほど1回のテストが速くなります
              </p>
            </div>

            <div className="space-y-2">
              <Label>サムネ素材画像（任意）</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {referenceImage ? (
                <div className="relative w-40 aspect-video rounded-lg overflow-hidden border group">
                  <img src={referenceImage} alt="素材画像" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="素材画像を削除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRunning}
                  className="w-40 aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-500">画像を選択</span>
                </button>
              )}
            </div>

            <Button
              size="lg"
              className="w-full bg-violet-600 hover:bg-violet-700"
              onClick={handleRun}
              disabled={isRunning || !jobTitle.trim() || platforms.length === 0}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  生成中... {elapsed}秒
                </>
              ) : (
                "サムネイルを生成"
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            <div
              className={`text-sm rounded-lg border p-3 ${
                result.generationStatus === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              <span className="font-medium">
                {result.generationStatus === "success" ? "生成成功" : "フォールバック"}
              </span>
              {" ・ "}
              {(result.elapsedMs / 1000).toFixed(1)}秒 ・ {result.message}
              {result.visualStyle?.uniformDescription && (
                <div className="text-xs mt-1 opacity-80">
                  スタイル: {result.visualStyle.uniformDescription} / {result.visualStyle.sceneDescription}
                </div>
              )}
            </div>

            {PLATFORMS.filter(
              (p) => (result.platformThumbnails[p.value] || []).length > 0
            ).map((p) => (
              <Card key={p.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {p.label}（{result.platformThumbnails[p.value].length}枚）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {result.platformThumbnails[p.value].map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={`${p.label} サムネイル${i + 1}`}
                          className="w-full rounded-lg border hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
