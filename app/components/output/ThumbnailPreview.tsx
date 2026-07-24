"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Trash2, Plus, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ThumbnailRegenerateDialog } from "./ThumbnailRegenerateDialog";
import { ThumbnailSlotOption } from "@/lib/thumbnail-prompts";
import { createZip, ZipEntry } from "@/lib/zip";

interface ThumbnailPreviewProps {
  urls: string[];
  filenamePrefix?: string;
  editable?: boolean;
  jobId?: string;
  platform?: string;
  regeneratePrompt?: string;
  // Indeed 用: スロット（1〜3枚目）別の再生成プロンプト
  regenerateSlotOptions?: ThumbnailSlotOption[];
  onUrlsChange?: (urls: string[]) => void;
}

// 媒体ごとの生成解像度に合わせたプレビュー比率
// (lib/nanobanana.ts の PLATFORM_IMAGE_CONFIG と対応: indeed/airwork=800×600, jobmedley=1024×576)
const PLATFORM_ASPECT_CLASS: Record<string, string> = {
  indeed: "aspect-[4/3]",
  airwork: "aspect-[4/3]",
  jobmedley: "aspect-video",
};

function extFromMimeType(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

// 画像をブラウザに即ダウンロードさせる。
// ストレージの画像はクロスオリジンURLのため a[download] が無視され
// 「タブで開くだけ」になる。blob 化してから保存させる
async function downloadImage(url: string, baseName: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  downloadBlob(blob, `${baseName}.${extFromMimeType(blob.type)}`);
}

export function ThumbnailPreview({
  urls,
  filenamePrefix = "thumbnail",
  editable = false,
  jobId,
  platform,
  regeneratePrompt,
  regenerateSlotOptions,
  onUrlsChange,
}: ThumbnailPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // 媒体が指定されていれば生成解像度に合った比率で表示する(未指定は16:9)
  const aspectClass = (platform && PLATFORM_ASPECT_CLASS[platform]) || "aspect-video";

  if (urls.length === 0 && !editable) return null;

  const handleDownloadCurrent = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadImage(urls[selectedIndex], `${filenamePrefix}_${selectedIndex + 1}`);
    } catch {
      // 自動保存できない場合のフォールバック(新しいタブで開く)
      window.open(urls[selectedIndex], "_blank");
      toast.error("自動保存できなかったため、新しいタブで開きました");
    } finally {
      setDownloading(false);
    }
  };

  // 複数ファイルの自動ダウンロードはブラウザが2枚目以降をブロックするため、
  // 全枚数を1つの ZIP にまとめて単一ダウンロードにする
  const handleDownloadAll = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress(`0/${urls.length}`);
    try {
      let fetched = 0;
      const files: ZipEntry[] = await Promise.all(
        urls.map(async (url, i) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          fetched++;
          setDownloadProgress(`${fetched}/${urls.length}`);
          return {
            name: `${filenamePrefix}_${i + 1}.${extFromMimeType(blob.type)}`,
            data: new Uint8Array(await blob.arrayBuffer()),
          };
        })
      );
      downloadBlob(createZip(files), `${filenamePrefix}_all.zip`);
      toast.success(`${files.length}枚の画像をZIPにまとめて保存しました`);
    } catch {
      toast.error("画像の保存に失敗しました");
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  async function uploadFile(file: File): Promise<string | null> {
    if (!jobId || !platform) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch("/api/thumbnails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              images: [base64],
              jobId,
              platform,
            }),
          });
          if (res.ok) {
            const { urls: uploaded } = await res.json();
            resolve(uploaded[0] || null);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    const newUrls = [...urls];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const uploaded = await uploadFile(file);
      if (uploaded) newUrls.push(uploaded);
    }

    onUrlsChange?.(newUrls);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    setUploading(true);

    const uploaded = await uploadFile(file);
    if (uploaded) {
      const newUrls = [...urls];
      newUrls[selectedIndex] = uploaded;
      onUrlsChange?.(newUrls);
    }

    setUploading(false);
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  }

  function handleDelete(index: number) {
    const newUrls = urls.filter((_, i) => i !== index);
    if (selectedIndex >= newUrls.length) {
      setSelectedIndex(Math.max(0, newUrls.length - 1));
    }
    onUrlsChange?.(newUrls);
  }

  // AIで再生成（編集モード + jobId/platform がある場合のみ）
  const regenerateDialog =
    editable && jobId && platform ? (
      <ThumbnailRegenerateDialog
        jobId={jobId}
        platform={platform}
        currentUrls={urls}
        defaultPrompt={regeneratePrompt}
        slotOptions={regenerateSlotOptions}
        defaultSlotIndex={selectedIndex}
        onGenerated={(newUrls) => onUrlsChange?.([...urls, ...newUrls])}
      />
    ) : null;

  // 画像なし + 編集モード → アップロードエリア
  if (urls.length === 0 && editable) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleAddFiles}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-full ${aspectClass} rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors`}
          disabled={uploading}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500">クリックして画像をアップロード</span>
            </>
          )}
        </button>
        {regenerateDialog}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddFiles}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceFile}
        className="hidden"
      />

      {/* メイン画像 */}
      <div className={`relative w-full ${aspectClass} rounded-lg overflow-hidden border bg-gray-100 group`}>
        <img
          src={urls[selectedIndex]}
          alt={`サムネイル ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
        {/* アクションボタン(タッチ端末では常時表示、PCではホバー表示。保存中は表示を維持) */}
        <div
          className={`absolute top-2 right-2 flex gap-1.5 transition-opacity ${
            downloading
              ? "opacity-100"
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
          }`}
        >
          {editable && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => replaceInputRef.current?.click()}
                disabled={uploading}
                className="h-8 px-3 text-xs bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                差替え
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDelete(selectedIndex)}
                className="h-8 px-3 text-xs bg-red-50/90 hover:bg-red-100 text-red-600 shadow-sm backdrop-blur-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadCurrent}
            disabled={downloading}
            className="h-8 px-3 text-xs bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm"
          >
            {downloading && !downloadProgress ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            保存
          </Button>
          {urls.length > 1 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadAll}
              disabled={downloading}
              className="h-8 px-3 text-xs bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm"
            >
              {downloadProgress ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  保存中 {downloadProgress}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  全て保存
                </>
              )}
            </Button>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* サムネイル一覧 + 追加ボタン */}
      <div className="flex gap-2 overflow-x-auto">
        {urls.map((url, index) => (
          <div
            key={index}
            className={`shrink-0 relative w-20 ${aspectClass} rounded overflow-hidden border-2 transition-all cursor-pointer ${
              index === selectedIndex
                ? "border-blue-500"
                : "border-gray-200 hover:border-gray-400"
            }`}
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={url}
              alt={`サムネイル ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {editable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(index);
                }}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px]"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {editable && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`shrink-0 w-20 ${aspectClass} rounded border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors`}
          >
            <Plus className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {regenerateDialog}
    </div>
  );
}
