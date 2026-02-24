"use client";

import { JobMedleyPosting } from "@/types/platform";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface JobMedleyOutputProps {
  posting: JobMedleyPosting;
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

export function JobMedleyOutput({ posting }: JobMedleyOutputProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">JobMedley 求人原稿</h2>
        <Button onClick={copyAll} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          全文コピー
        </Button>
      </div>

      <div className="space-y-4">
        <FieldBlock label="訴求文タイトル" value={posting.appealTitle} charLimit={30} />
        <FieldBlock label="訴求文" value={posting.appealText} charLimit={300} />
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={500} />
        <FieldBlock label="雇用形態と給与" value={posting.employmentTypeAndSalary} />
        <FieldBlock label="待遇" value={posting.benefits} />
        <FieldBlock label="教育体制・研修" value={posting.trainingSystem} />
        <FieldBlock label="勤務時間・休憩時間" value={posting.workingHours} />
        <FieldBlock label="休日" value={posting.holidays} />
        <FieldBlock label="応募要件" value={posting.requirements} />
        <FieldBlock label="歓迎要件" value={posting.welcomeRequirements} />
        <FieldBlock label="アクセス" value={posting.access} />
        <FieldBlock label="選考プロセス" value={posting.selectionProcess} />
      </div>
    </div>
  );
}
