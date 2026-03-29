"use client";

import { JobMedleyPosting } from "@/types/platform";
import { Button } from "@/components/ui/button";
import { Copy, Check, Pencil } from "lucide-react";
import { useState } from "react";
import { ThumbnailPreview } from "./ThumbnailPreview";

interface JobMedleyOutputProps {
  posting: JobMedleyPosting;
  thumbnailUrls?: string[];
  editable?: boolean;
  onFieldChange?: (field: string, value: string) => void;
  onThumbnailsChange?: (urls: string[]) => void;
  jobId?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-xs">
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {copied ? "コピー済み" : "コピー"}
    </Button>
  );
}

function FieldBlock({
  label,
  value,
  charLimit,
  editable,
  fieldKey,
  onFieldChange,
}: {
  label: string;
  value: string;
  charLimit?: number;
  editable?: boolean;
  fieldKey?: string;
  onFieldChange?: (field: string, value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const count = value.length;
  const isOver = charLimit ? count > charLimit : false;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          {charLimit && (
            <span className={`text-xs ${isOver ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
              {count}/{charLimit}文字
            </span>
          )}
          {editable && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 px-2 text-xs"
            >
              <Pencil className="w-3 h-3 mr-1" />
              編集
            </Button>
          )}
          <CopyButton text={value} />
        </div>
      </div>
      {isEditing && editable ? (
        <div className="space-y-1">
          <textarea
            className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={value}
            onChange={(e) => {
              if (fieldKey && onFieldChange) {
                onFieldChange(fieldKey, e.target.value);
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="text-xs"
            >
              閉じる
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border rounded-md p-3 text-sm whitespace-pre-wrap">
          {value}
        </div>
      )}
    </div>
  );
}

export function JobMedleyOutput({ posting, thumbnailUrls, editable, onFieldChange, onThumbnailsChange, jobId }: JobMedleyOutputProps) {
  const copyAll = async () => {
    const allText = `【訴求文タイトル】
${posting.appealTitle}

【訴求文】
${posting.appealText}

【仕事内容】
${posting.jobDescription}

【雇用形態と給与】
${posting.employmentTypeAndSalary}

【待遇】
${posting.benefits}

【教育体制・研修】
${posting.trainingSystem}

【勤務時間・休憩時間】
${posting.workingHours}

【休日】
${posting.holidays}

【応募要件】
${posting.requirements}

【歓迎要件】
${posting.welcomeRequirements}

【アクセス】
${posting.access}

【選考プロセス】
${posting.selectionProcess}`;
    await navigator.clipboard.writeText(allText);
  };

  const urls = thumbnailUrls ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ジョブメドレー 求人原稿</h2>
        <Button onClick={copyAll} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          全文コピー
        </Button>
      </div>

      {urls.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            サムネイル（{urls.length}枚）
          </h3>
          <ThumbnailPreview urls={urls} filenamePrefix="jobmedley_thumbnail" editable={editable} jobId={jobId} platform="jobmedley" onUrlsChange={onThumbnailsChange} />
        </div>
      )}

      <div className="space-y-4">
        <FieldBlock label="訴求文タイトル" value={posting.appealTitle} charLimit={30} editable={editable} fieldKey="appealTitle" onFieldChange={onFieldChange} />
        <FieldBlock label="訴求文" value={posting.appealText} charLimit={300} editable={editable} fieldKey="appealText" onFieldChange={onFieldChange} />
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={500} editable={editable} fieldKey="jobDescription" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用形態と給与" value={posting.employmentTypeAndSalary} editable={editable} fieldKey="employmentTypeAndSalary" onFieldChange={onFieldChange} />
        <FieldBlock label="待遇" value={posting.benefits} editable={editable} fieldKey="benefits" onFieldChange={onFieldChange} />
        <FieldBlock label="教育体制・研修" value={posting.trainingSystem} editable={editable} fieldKey="trainingSystem" onFieldChange={onFieldChange} />
        <FieldBlock label="勤務時間・休憩時間" value={posting.workingHours} editable={editable} fieldKey="workingHours" onFieldChange={onFieldChange} />
        <FieldBlock label="休日" value={posting.holidays} editable={editable} fieldKey="holidays" onFieldChange={onFieldChange} />
        <FieldBlock label="応募要件" value={posting.requirements} editable={editable} fieldKey="requirements" onFieldChange={onFieldChange} />
        <FieldBlock label="歓迎要件" value={posting.welcomeRequirements} editable={editable} fieldKey="welcomeRequirements" onFieldChange={onFieldChange} />
        <FieldBlock label="アクセス" value={posting.access} editable={editable} fieldKey="access" onFieldChange={onFieldChange} />
        <FieldBlock label="選考プロセス" value={posting.selectionProcess} editable={editable} fieldKey="selectionProcess" onFieldChange={onFieldChange} />
      </div>
    </div>
  );
}
