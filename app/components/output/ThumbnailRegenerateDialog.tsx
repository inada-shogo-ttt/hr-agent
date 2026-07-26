"use client";

import { useEffect, useRef, useState } from "react";
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
import { ThumbnailSlotOption } from "@/lib/thumbnail-prompts";

interface ThumbnailRegenerateDialogProps {
  jobId: string;
  platform: string;
  currentUrls: string[];
  defaultPrompt?: string;
  // Indeed 用: スロット（1〜3枚目）別の基本プロンプト。指定時はスロット選択 + 追加指示 UI になる
  slotOptions?: ThumbnailSlotOption[];
  defaultSlotIndex?: number;
  onGenerated: (urls: string[]) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "インディード",
  airwork: "エアワーク",
  jobmedley: "ジョブメドレー",
};

// 媒体ごとの生成解像度に合わせたプレビュー比率
// (lib/nanobanana.ts の PLATFORM_IMAGE_CONFIG と対応: indeed/airwork=800×600, jobmedley=1024×576)
const PLATFORM_ASPECT_CLASS: Record<string, string> = {
  indeed: "aspect-[4/3]",
  airwork: "aspect-[4/3]",
  jobmedley: "aspect-video",
};

export function ThumbnailRegenerateDialog({
  jobId,
  platform,
  currentUrls,
  defaultPrompt = "",
  slotOptions,
  defaultSlotIndex = 0,
  onGenerated,
}: ThumbnailRegenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [slotIndex, setSlotIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  // スロット切替・参考画像変更時に、ユーザー編集済みプロンプトを勝手に上書きしないための記録
  const lastAutoPromptRef = useRef("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 生成開始（スケルトン）・結果表示のタイミングで、スクロール領域の下部へ自動スクロール
  useEffect(() => {
    if (generating || results.length > 0) {
      scrollAreaRef.current?.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [generating, results]);

  const slotMode = !!slotOptions?.length;
  const aspectClass = PLATFORM_ASPECT_CLASS[platform] || "aspect-video";

  function slotBasePrompt(index: number, reference: string | null): string {
    const option = slotOptions![index];
    return reference && option.referencePrompt ? option.referencePrompt : option.prompt;
  }

  function applySlot(index: number, reference: string | null) {
    const base = slotBasePrompt(index, reference);
    setSlotIndex(index);
    setPrompt(base);
    lastAutoPromptRef.current = base;
  }

  function handleOpen() {
    setOpen(true);
    if (slotMode) {
      const index = Math.min(Math.max(defaultSlotIndex, 0), slotOptions!.length - 1);
      // 未編集（自動セットのまま or 空）の場合のみ選択中スロットに合わせて更新
      if (!prompt || prompt === lastAutoPromptRef.current) {
        applySlot(index, referenceImage);
      }
    } else if (!prompt) {
      setPrompt(defaultPrompt);
    }
  }

  function updateReferenceImage(next: string | null) {
    setReferenceImage(next);
    // 基本プロンプトが未編集なら、参考画像の有無に合わせたスロットプロンプトへ差し替え
    if (slotMode && prompt === lastAutoPromptRef.current) {
      const base = slotBasePrompt(slotIndex, next);
      setPrompt(base);
      lastAutoPromptRef.current = base;
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file?.type.startsWith("image/")) return;
    try {
      updateReferenceImage(await fileToCompressedDataUrl(file));
    } catch {
      toast.error("画像の読み込みに失敗しました");
    }
  }

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setResults([]);
    setSelected(new Set());
    const finalPrompt =
      slotMode && extraPrompt.trim()
        ? `${prompt.trim()}\n\n【追加の指示（最優先で反映すること）】\n${extraPrompt.trim()}`
        : prompt.trim();
    try {
      const res = await fetch("/api/thumbnails/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          platform,
          prompt: finalPrompt,
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
        {/* ヘッダー・フッター固定 + 中身のみスクロール（縦に伸びても操作ボタンが見切れない構造） */}
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              サムネイルをAIで再生成
            </DialogTitle>
            <DialogDescription>
              {PLATFORM_LABELS[platform] || platform}
              用のサムネイルを生成します。参考画像を選ぶと、その雰囲気を踏襲します
            </DialogDescription>
          </DialogHeader>

          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* スロット選択（Indeed のみ） */}
            {slotMode && (
              <div className="space-y-2">
                <Label className="text-xs">作り直すサムネイル</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {slotOptions!.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => applySlot(i, referenceImage)}
                      className={`rounded-lg border-2 p-2 text-left transition-all ${
                        i === slotIndex
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <span className="text-xs font-medium block">{option.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                      updateReferenceImage(referenceImage === url ? null : url)
                    }
                    className={`shrink-0 relative w-24 ${aspectClass} rounded overflow-hidden border-2 transition-all ${
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
                  <div className={`shrink-0 relative w-24 ${aspectClass} rounded overflow-hidden border-2 border-blue-500 ring-2 ring-blue-200`}>
                    <img
                      src={referenceImage}
                      alt="アップロード画像"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => updateReferenceImage(null)}
                      className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                      aria-label="参考画像を削除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`shrink-0 w-24 ${aspectClass} rounded border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-0.5 transition-colors`}
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] text-gray-500">アップロード</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {slotMode
                  ? "既存のサムネイルをクリックで選択、または事業所の写真などをアップロードできます"
                  : "既存のサムネイルをクリックで選択、または画像をアップロードできます"}
              </p>
            </div>

            {/* プロンプト */}
            <div className="space-y-2">
              <Label className="text-xs">
                {slotMode ? "基本プロンプト（スロットに合わせて自動設定・編集可）" : "生成プロンプト"}
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="どんなサムネイルを生成するか日本語で入力してください"
              />
            </div>

            {/* 追加指示（スロットモードのみ） */}
            {slotMode && (
              <div className="space-y-2">
                <Label className="text-xs">追加の指示（任意）</Label>
                <Textarea
                  value={extraPrompt}
                  onChange={(e) => setExtraPrompt(e.target.value)}
                  rows={2}
                  placeholder="例: もっと笑顔を強調して / 背景を明るくして / 文字を大きく"
                />
                <p className="text-xs text-muted-foreground">
                  入力した指示は基本プロンプトより優先して反映されます
                </p>
              </div>
            )}

            {/* 生成中スケルトン */}
            {generating && (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className={`${aspectClass} rounded-lg bg-gray-100 animate-pulse`}
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
                      className={`relative ${aspectClass} rounded-lg overflow-hidden border-2 transition-all ${
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
              </div>
            )}
          </div>

          {/* フッター（固定）: 枚数選択と生成・追加ボタンは常に見える位置に置く */}
          <div className="border-t px-6 py-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">枚数</span>
              {[1, 2, 3].map((n) => (
                <Button
                  key={n}
                  variant={count === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Button
              className="flex-1 min-w-36"
              variant={results.length > 0 ? "outline" : "default"}
              disabled={generating || !prompt.trim()}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin mr-2" />
                  生成中...（{count}枚・1分ほど）
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {results.length > 0 ? "もう一度生成" : "生成する"}
                </>
              )}
            </Button>
            {results.length > 0 && (
              <Button
                className="flex-1 min-w-40"
                disabled={selected.size === 0}
                onClick={handleAdd}
              >
                選択した{selected.size}枚をサムネイルに追加
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
