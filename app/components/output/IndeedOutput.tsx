"use client";

import { IndeedPosting } from "@/types/platform";
import { Button } from "@/components/ui/button";
import { Copy, Check, Pencil } from "lucide-react";
import { useState } from "react";
import { ThumbnailPreview } from "./ThumbnailPreview";

interface IndeedOutputProps {
  posting: IndeedPosting;
  thumbnailUrls: string[];
  editable?: boolean;
  onFieldChange?: (field: string, value: string) => void;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-6 px-2 text-xs"
    >
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {copied ? "コピー済み" : label}
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
            <span
              className={`text-xs ${isOver ? "text-red-500 font-bold" : "text-muted-foreground"}`}
            >
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
          <CopyButton text={value} label="コピー" />
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

export function IndeedOutput({ posting, thumbnailUrls, editable, onFieldChange }: IndeedOutputProps) {
  const copyAll = async () => {
    const allText = `【職種名】
${posting.jobTitle}

【キャッチコピー】
${posting.catchphrase}

【仕事内容】
${posting.jobDescription}

【アピールポイント】
${posting.appealPoints}

【求める人材】
${posting.requirements}

【給与】
${posting.salary}

【勤務時間】
${posting.workingHours}

【休暇・休日】
${posting.holidays}

【待遇・福利厚生】
${posting.benefits}

【社会保険】
${posting.socialInsurance}

【アクセス】
${posting.access}

${posting.probationPeriod ? `【試用期間】\n${posting.probationPeriod}\n` : ""}【採用予定人数】
${posting.numberOfHires}`;
    await navigator.clipboard.writeText(allText);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">インディード 求人原稿</h2>
        <Button onClick={copyAll} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          全文コピー
        </Button>
      </div>

      <div className="space-y-4">
        <FieldBlock label="職種名" value={posting.jobTitle} charLimit={30} editable={editable} fieldKey="jobTitle" onFieldChange={onFieldChange} />
        <FieldBlock label="キャッチコピー" value={posting.catchphrase} charLimit={50} editable={editable} fieldKey="catchphrase" onFieldChange={onFieldChange} />
        <FieldBlock label="採用予定人数" value={posting.numberOfHires} editable={editable} fieldKey="numberOfHires" onFieldChange={onFieldChange} />
        <FieldBlock label="勤務地" value={posting.location} editable={editable} fieldKey="location" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用形態" value={posting.employmentType} editable={editable} fieldKey="employmentType" onFieldChange={onFieldChange} />
        <FieldBlock label="給与" value={posting.salary} editable={editable} fieldKey="salary" onFieldChange={onFieldChange} />
        <FieldBlock label="勤務時間" value={posting.workingHours} editable={editable} fieldKey="workingHours" onFieldChange={onFieldChange} />
        <FieldBlock label="社会保険" value={posting.socialInsurance} editable={editable} fieldKey="socialInsurance" onFieldChange={onFieldChange} />
        {posting.probationPeriod && (
          <FieldBlock label="試用期間" value={posting.probationPeriod} editable={editable} fieldKey="probationPeriod" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={500} editable={editable} fieldKey="jobDescription" onFieldChange={onFieldChange} />
        <FieldBlock label="アピールポイント" value={posting.appealPoints} charLimit={300} editable={editable} fieldKey="appealPoints" onFieldChange={onFieldChange} />
        <FieldBlock label="求める人材" value={posting.requirements} charLimit={200} editable={editable} fieldKey="requirements" onFieldChange={onFieldChange} />
        <FieldBlock label="休暇・休日" value={posting.holidays} editable={editable} fieldKey="holidays" onFieldChange={onFieldChange} />
        <FieldBlock label="アクセス" value={posting.access} editable={editable} fieldKey="access" onFieldChange={onFieldChange} />
        <FieldBlock label="待遇・福利厚生" value={posting.benefits} editable={editable} fieldKey="benefits" onFieldChange={onFieldChange} />
      </div>

      {thumbnailUrls.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            サムネイル（{thumbnailUrls.length}枚）
          </h3>
          <ThumbnailPreview urls={thumbnailUrls} />
        </div>
      )}
    </div>
  );
}
