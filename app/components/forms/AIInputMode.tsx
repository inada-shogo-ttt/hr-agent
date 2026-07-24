"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileText, X, Link2, Plus } from "lucide-react";

export interface UploadedFile {
  name: string;
  type: "text" | "image" | "pdf";
  content: string; // base64 for images/PDFs, raw text for text files
  mimeType?: string;
}

export type AIInputMethod = "text" | "url" | "file";

export interface AIInputValue {
  text: string;
  urlInput: string;
  urls: string[];
  files: UploadedFile[];
}

export const EMPTY_AI_INPUT: AIInputValue = {
  text: "",
  urlInput: "",
  urls: [],
  files: [],
};

export function parseValidUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
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
駅から徒歩5分で通勤便利です。`;

interface AIInputFieldsProps {
  method: AIInputMethod;
  value: AIInputValue;
  onChange: (value: AIInputValue) => void;
  disabled?: boolean;
}

export function AIInputFields({
  method,
  value,
  onChange,
  disabled,
}: AIInputFieldsProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

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
      onChange({ ...value, files: [...value.files, ...newFiles] });
    },
    [processFile, value, onChange]
  );

  const addUrl = (input: string) => {
    if (!input.trim()) return;
    const valid = parseValidUrl(input);
    if (valid) {
      onChange({
        ...value,
        urls: value.urls.includes(valid) ? value.urls : [...value.urls, valid],
        urlInput: "",
      });
      setUrlError(null);
    } else {
      setUrlError("有効なURLを入力してください（https://...）");
    }
  };

  if (method === "text") {
    return (
      <div className="space-y-2">
        <Label htmlFor="ai-input" className="text-base font-medium">
          求人情報を入力
        </Label>
        <Textarea
          id="ai-input"
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={PLACEHOLDER_TEXT}
          rows={10}
          className="text-base leading-relaxed resize-y"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          文体は自由です。AIが内容を読み取って各項目に自動で整理します
        </p>
      </div>
    );
  }

  if (method === "url") {
    return (
      <div className="space-y-2">
        <Label className="text-base font-medium flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          求人ページのURL
        </Label>
        <div className="flex gap-2">
          <Input
            value={value.urlInput}
            onChange={(e) => onChange({ ...value, urlInput: e.target.value })}
            placeholder="https://example.com/job-posting"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl(value.urlInput);
              }
            }}
            onPaste={(e) => {
              // 有効なURLの貼り付けは自動でリストに追加する
              const pasted = parseValidUrl(e.clipboardData.getData("text"));
              if (pasted) {
                e.preventDefault();
                onChange({
                  ...value,
                  urls: value.urls.includes(pasted)
                    ? value.urls
                    : [...value.urls, pasted],
                  urlInput: "",
                });
                setUrlError(null);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addUrl(value.urlInput)}
            disabled={disabled || !value.urlInput.trim()}
            className="shrink-0 px-3"
          >
            <Plus className="w-4 h-4 mr-1" />
            追加
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          貼り付けるだけでOK。求人サイトや会社HPのURLからAIがページ内容を読み取ります（複数可）
        </p>
        {urlError && <p className="text-xs text-red-500">{urlError}</p>}
        {value.urls.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {value.urls.map((url, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate text-blue-700 flex-1">{url}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      urls: value.urls.filter((_, idx) => idx !== i),
                    })
                  }
                  className="p-0.5 text-gray-400 hover:text-red-500"
                  disabled={disabled}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // method === "file"
  return (
    <div className="space-y-4">
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
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          ファイルをドラッグ&ドロップ、またはクリックして選択
        </p>
        <p className="text-xs text-muted-foreground">
          PDF、画像（JPG, PNG）、テキストファイル（TXT, CSV）に対応（10MBまで）
        </p>
        <Input
          type="file"
          className="absolute inset-0 opacity-0 cursor-pointer"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv"
          multiple
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={disabled}
        />
      </div>

      {value.files.length > 0 && (
        <div className="space-y-2">
          {value.files.map((file, i) => (
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
                    onClick={() =>
                      onChange({
                        ...value,
                        files: value.files.filter((_, idx) => idx !== i),
                      })
                    }
                    className="p-1 text-gray-400 hover:text-red-500"
                    disabled={disabled}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
