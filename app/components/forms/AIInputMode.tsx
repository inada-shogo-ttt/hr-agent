"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CommonJobInfo } from "@/types/job-posting";
import {
  Upload,
  FileText,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link2,
  Plus,
} from "lucide-react";

interface UploadedFile {
  name: string;
  type: "text" | "image" | "pdf";
  content: string; // base64 for images/PDFs, raw text for text files
  mimeType?: string;
}

interface AIInputModeProps {
  onParsed: (data: Partial<CommonJobInfo>) => void;
}

const ACCEPTED_TYPES = {
  "text/plain": "text",
  "text/csv": "text",
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
} as const;

const PLACEHOLDER_TEXT = `例えばこんな風に入力できます：

株式会社サンケアで介護職を募集しています。
場所は東京都世田谷区の住宅型有料老人ホームです。
正社員で月給25万〜30万円、9時〜18時勤務。
介護福祉士の資格がある方歓迎。未経験でもOKです。
週休2日制で年間休日120日。社会保険完備。
駅から徒歩5分で通勤便利です。

---
または、既存の求人票のスクリーンショットや
テキストファイルをドラッグ&ドロップしてください。`;

export function AIInputMode({ onParsed }: AIInputModeProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    const mimeType = file.type;
    const fileType = ACCEPTED_TYPES[mimeType as keyof typeof ACCEPTED_TYPES];
    if (!fileType) return null;

    if (fileType === "image" || fileType === "pdf") {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve({ name: file.name, type: fileType, content: base64, mimeType });
        };
        reader.readAsDataURL(file);
      });
    } else {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ name: file.name, type: "text", content: reader.result as string });
        };
        reader.readAsText(file);
      });
    }
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadedFile[] = [];
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) continue; // 10MB limit
        const processed = await processFile(file);
        if (processed) newFiles.push(processed);
      }
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed); // validate
      setUrls((prev) => [...prev, trimmed]);
      setUrlInput("");
    } catch {
      setError("有効なURLを入力してください（https://...）");
    }
  };

  const removeUrl = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleParse = async () => {
    if (!text.trim() && files.length === 0 && urls.length === 0) return;
    setIsParsing(true);
    setError(null);

    try {
      const res = await fetch("/api/parse-job-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          fileContents: files.length > 0 ? files.map((f) => ({
            type: f.type,
            content: f.content,
            mimeType: f.mimeType,
            name: f.name,
          })) : undefined,
          urls: urls.length > 0 ? urls : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "解析に失敗しました");
      }

      const data = await res.json();
      onParsed(data.common);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析中にエラーが発生しました");
    } finally {
      setIsParsing(false);
    }
  };

  const hasInput = text.trim().length > 0 || files.length > 0 || urls.length > 0;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-violet-800">AIかんたん入力モード</p>
            <p className="text-sm text-violet-600 mt-1">
              求人情報をテキストで自由に入力、参考URLを添付、または既存の求人票（画像・テキスト）をアップロードしてください。
              AIが自動で項目を解析・分類します。
            </p>
          </div>
        </div>
      </div>

      {/* Text input area */}
      <div className="space-y-2">
        <Label htmlFor="ai-input" className="text-base font-medium">
          求人情報を入力
        </Label>
        <Textarea
          id="ai-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER_TEXT}
          rows={10}
          className="text-base leading-relaxed resize-y"
          disabled={isParsing}
        />
      </div>

      {/* URL input */}
      <div className="space-y-2">
        <Label className="text-base font-medium flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          参考URLを添付
        </Label>
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/job-posting"
            disabled={isParsing}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addUrl}
            disabled={isParsing || !urlInput.trim()}
            className="shrink-0 px-3"
          >
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          求人サイトや会社HPのURLを入力すると、AIがページ内容を読み取って解析します
        </p>
        {urls.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {urls.map((url, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate text-blue-700 flex-1">{url}</span>
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="p-0.5 text-gray-400 hover:text-red-500"
                  disabled={isParsing}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File upload area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? "border-violet-400 bg-violet-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          ファイルをドラッグ&ドロップ、またはクリックして選択
        </p>
        <p className="text-xs text-muted-foreground">
          PDF、画像（JPG, PNG）、テキストファイル（TXT, CSV）に対応（10MBまで）
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv"
          multiple
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={isParsing}
        />
      </div>

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <Card key={i}>
              <CardContent className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="truncate max-w-[300px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({file.type === "image" ? "画像" : file.type === "pdf" ? "PDF" : "テキスト"})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    disabled={isParsing}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="whitespace-pre-line">{error}</div>
          </div>
          {error.includes("URL") && (
            <p className="text-xs text-red-500 pl-6">
              ヒント: 求人ページをブラウザで開き、内容をコピーして上のテキスト欄に貼り付けることでも解析できます。
            </p>
          )}
        </div>
      )}

      {/* Parse button */}
      <Button
        type="button"
        size="lg"
        className="w-full bg-violet-600 hover:bg-violet-700"
        onClick={handleParse}
        disabled={!hasInput || isParsing}
      >
        {isParsing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            AIが解析中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            AIで自動解析する
          </>
        )}
      </Button>
    </div>
  );
}
