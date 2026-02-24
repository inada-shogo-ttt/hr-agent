"use client";

import { IndeedPosting } from "@/types/platform";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { ThumbnailPreview } from "./ThumbnailPreview";

interface IndeedOutputProps {
  posting: IndeedPosting;
  thumbnailUrls: string[];
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
}: {
  label: string;
  value: string;
  charLimit?: number;
}) {
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
          <CopyButton text={value} label="コピー" />
        </div>
      </div>
      <div className="bg-gray-50 border rounded-md p-3 text-sm whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

export function IndeedOutput({ posting, thumbnailUrls }: IndeedOutputProps) {
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

${posting.probationPeriod ? `【試用期間】\n${posting.probationPeriod}\n` : ""}
【採用予定人数】
${posting.numberOfHires}`;
    await navigator.clipboard.writeText(allText);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Indeed 求人原稿</h2>
        <Button onClick={copyAll} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          全文コピー
        </Button>
      </div>

      <div className="space-y-4">
        <FieldBlock label="職種名" value={posting.jobTitle} charLimit={30} />
        <FieldBlock label="キャッチコピー" value={posting.catchphrase} charLimit={50} />
        <FieldBlock label="採用予定人数" value={posting.numberOfHires} />
        <FieldBlock label="勤務地" value={posting.location} />
        <FieldBlock label="雇用形態" value={posting.employmentType} />
        <FieldBlock label="給与" value={posting.salary} />
        <FieldBlock label="勤務時間" value={posting.workingHours} />
        <FieldBlock label="社会保険" value={posting.socialInsurance} />
        {posting.probationPeriod && (
          <FieldBlock label="試用期間" value={posting.probationPeriod} />
        )}
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={500} />
        <FieldBlock label="アピールポイント" value={posting.appealPoints} charLimit={300} />
        <FieldBlock label="求める人材" value={posting.requirements} charLimit={200} />
        <FieldBlock label="休暇・休日" value={posting.holidays} />
        <FieldBlock label="アクセス" value={posting.access} />
        <FieldBlock label="待遇・福利厚生" value={posting.benefits} />
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
