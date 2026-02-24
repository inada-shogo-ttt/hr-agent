"use client";

import { AirWorkPosting } from "@/types/platform";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { ThumbnailPreview } from "./ThumbnailPreview";

interface AirWorkOutputProps {
  posting: AirWorkPosting;
  thumbnailUrls: string[];
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
            <span className={`text-xs ${isOver ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
              {count}/{charLimit}文字
            </span>
          )}
          <CopyButton text={value} />
        </div>
      </div>
      <div className="bg-gray-50 border rounded-md p-3 text-sm whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

export function AirWorkOutput({ posting, thumbnailUrls }: AirWorkOutputProps) {
  const copyAll = async () => {
    const allText = `【職種名】
${posting.jobTitle}

【キャッチコピー】
${posting.catchphrase}

【仕事内容】
${posting.jobDescription}

【勤務地】
${posting.location}

【求める人材】
${posting.requirements}

【採用予定人数】
${posting.numberOfHires}

【給与】
${posting.salary}

【勤務形態】
${posting.workStyle}

【休日・休暇】
${posting.holidays}

【社会保険】
${posting.socialInsurance}

【福利厚生】
${posting.benefits}

【選考の流れ】
${posting.selectionProcess}`;
    await navigator.clipboard.writeText(allText);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">AirWork 求人原稿</h2>
        <Button onClick={copyAll} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          全文コピー
        </Button>
      </div>

      <div className="space-y-4">
        <FieldBlock label="職種名" value={posting.jobTitle} charLimit={30} />
        <FieldBlock label="キャッチコピー" value={posting.catchphrase} charLimit={40} />
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={600} />
        <FieldBlock label="勤務地" value={posting.location} />
        <FieldBlock label="求める人材" value={posting.requirements} charLimit={200} />
        <FieldBlock label="採用予定人数" value={posting.numberOfHires} />
        <FieldBlock label="給与" value={posting.salary} />
        <FieldBlock label="勤務形態" value={posting.workStyle} />
        <FieldBlock label="休日・休暇" value={posting.holidays} />
        <FieldBlock label="社会保険" value={posting.socialInsurance} />
        <FieldBlock label="福利厚生" value={posting.benefits} />
        <FieldBlock label="選考の流れ" value={posting.selectionProcess} />
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
