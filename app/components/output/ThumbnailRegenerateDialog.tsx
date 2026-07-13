"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Upload, X, Check, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { fileToCompressedDataUrl } from "@/lib/client-image";

interface ThumbnailRegenerateDialogProps {
  jobId: string;
  platform: string;
  currentUrls: string[];
  defaultPrompt?: string;
  onGenerated: (urls: string[]) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "インディード",
  airwork: "エアワーク",
  jobmedley: "ジョブメドレー",
};

export function ThumbnailRegenerateDialog({
  jobId,
  platform,
  currentUrls,
  defaultPrompt = "",
  onGenerated,
}: ThumbnailRegenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    if (!prompt) setPrompt(defaultPrompt);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file?.type.startsWith("image/")) return;
    try {
      setReferenceImage(await fileToCompressedDataUrl(file));
    } catch {
      toast.error("画像の読み込みに失敗しました");
    }
  }

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setResults([]);
    setSelected(new Set());
    try {
      const res = await fetch("/api/thumbnails/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          platform,
          prompt: prompt.trim(),
          referenceImage,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "生成に失敗しました");
        return;
      }
      setResults(data.urls);
      setSelected(new Set(data.urls.map((_: string, i: number) => i)));
    } catch {
      toast.error("生成中にエラーが発生しました。時間をおいてもう一度お試しください。");
    } finally {
      setGenerating(false);
    }
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleAdd() {
    const urls = results.filter((_, i) => selected.has(i));
    if (urls.length === 0) return;
    onGenerated(urls);
    toast.success(`${urls.length}枚のサムネイルを追加しました`);
    setResults([]);
    setSelected(new Set());
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
        AIで再生成
      </Button>

      <Dialog open={open} onOpenChange={(v) => !generating && setOpen(v)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              サムネイルをAIで再生成
            </DialogTitle>
            <DialogDescription>
              {PLATFORM_LABELS[platform] || platform}
              用のサムネイルを生成します。参考画像を選ぶと、その構図・雰囲気を踏襲します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* 参考画像の選択 */}
            <div className="space-y-2">
              <Label className="text-xs">参考画像（任意）</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              <div className="flex gap-2 overflow-x-auto pb-1">
                {currentUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setReferenceImage(referenceImage === url ? null : url)
                    }
                    className={`shrink-0 relative w-24 aspect-video rounded overflow-hidden border-2 transition-all ${
                      referenceImage === url
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`候補 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {referenceImage === url && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
                {/* アップロードした参考画像（既存サムネイル以外） */}
                {referenceImage && !currentUrls.includes(referenceImage) && (
                  <div className="shrink-0 relative w-24 aspect-video rounded overflow-hidden border-2 border-blue-500 ring-2 ring-blue-200">
                    <img
                      src={referenceImage}
                      alt="アップロード画像"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setReferenceImage(null)}
                      className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                      aria-label="参考画像を削除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 w-24 aspect-video rounded border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-0.5 transition-colors"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] text-gray-500">アップロード</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                既存のサムネイルをクリックで選択、または画像をアップロードできます
              </p>
            </div>

            {/* プロンプト */}
            <div className="space-y-2">
              <Label className="text-xs">生成プロンプト</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="どんなサムネイルを生成するか日本語で入力してください"
              />
            </div>

            {/* 生成枚数 */}
            <div className="space-y-2">
              <Label className="text-xs">生成枚数</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <Button
                    key={n}
                    variant={count === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCount(n)}
                  >
                    {n}枚
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={generating || !prompt.trim()}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                  生成中...（{count}枚・1分ほどかかります）
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成する
                </>
              )}
            </Button>

            {/* 生成中スケルトン */}
            {generating && (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-lg bg-gray-100 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}

            {/* 生成結果 */}
            {results.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  生成結果（追加する画像を選択）
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {results.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => toggleSelected(index)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                        selected.has(index)
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`生成結果 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selected.has(index) && (
                        <span className="absolute top-1 right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={selected.size === 0}
                  onClick={handleAdd}
                >
                  選択した{selected.size}枚をサムネイルに追加
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
