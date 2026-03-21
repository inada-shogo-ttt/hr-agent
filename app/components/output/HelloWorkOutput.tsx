"use client";

import { HelloWorkPosting } from "@/types/platform";
import { Button } from "@/components/ui/button";
import { Copy, Check, Pencil } from "lucide-react";
import { useState } from "react";

interface HelloWorkOutputProps {
  posting: HelloWorkPosting;
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

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 border-b pb-1 mt-4">
      {title}
    </h3>
  );
}

export function HelloWorkOutput({ posting, editable, onFieldChange }: HelloWorkOutputProps) {
  const copyAll = async () => {
    const allText = `【求人事業所】
事業所名: ${posting.companyName}
所在地: ${posting.companyAddress}
就業場所: ${posting.workLocation}
受動喫煙対策: ${posting.smokingPolicy}

【仕事の内容】
職種: ${posting.jobTitle}
仕事の内容: ${posting.jobDescription}
雇用形態: ${posting.employmentType}
雇用期間: ${posting.employmentPeriod}
契約更新: ${posting.contractRenewal}

【賃金・手当】
賃金形態: ${posting.wageType}
賃金額: ${posting.wageAmount}
手当: ${posting.allowances}
通勤手当: ${posting.commutingAllowance}
賞与: ${posting.bonus}
昇給: ${posting.raise}

【労働時間】
就業時間: ${posting.workingHours}
時間外労働: ${posting.overtime}
休憩時間: ${posting.breakTime}
休日: ${posting.holidays}
年次有給休暇: ${posting.annualLeave}

【その他の労働条件等】
加入保険: ${posting.insurance}
企業年金: ${posting.pension}
試用期間: ${posting.trialPeriod}
特記事項: ${posting.specialNotes}

【必要な経験等】
必要な経験・知識・技能等: ${posting.requirements}
必要な免許・資格: ${posting.requiredLicenses}
年齢制限: ${posting.ageRestriction}

【選考等】
採用人数: ${posting.numberOfHires}
選考方法: ${posting.selectionMethod}
応募書類: ${posting.applicationDocuments}
選考結果通知: ${posting.selectionNotification}

【求人に関する特記事項】
${posting.remarks}`;
    await navigator.clipboard.writeText(allText);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">ハローワーク 求人票</h2>
        <Button onClick={copyAll} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          全文コピー
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
        ハローワークの求人票は全角文字で記載されています。絵文字は含まれていません。
      </div>

      <div className="space-y-4">
        <SectionHeader title="求人事業所" />
        <FieldBlock label="事業所名" value={posting.companyName} editable={editable} fieldKey="companyName" onFieldChange={onFieldChange} />
        <FieldBlock label="所在地" value={posting.companyAddress} editable={editable} fieldKey="companyAddress" onFieldChange={onFieldChange} />
        <FieldBlock label="就業場所" value={posting.workLocation} editable={editable} fieldKey="workLocation" onFieldChange={onFieldChange} />
        <FieldBlock label="受動喫煙対策" value={posting.smokingPolicy} editable={editable} fieldKey="smokingPolicy" onFieldChange={onFieldChange} />

        <SectionHeader title="仕事の内容" />
        <FieldBlock label="職種" value={posting.jobTitle} charLimit={30} editable={editable} fieldKey="jobTitle" onFieldChange={onFieldChange} />
        <FieldBlock label="仕事の内容" value={posting.jobDescription} charLimit={500} editable={editable} fieldKey="jobDescription" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用形態" value={posting.employmentType} editable={editable} fieldKey="employmentType" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用期間" value={posting.employmentPeriod} editable={editable} fieldKey="employmentPeriod" onFieldChange={onFieldChange} />
        <FieldBlock label="契約更新の可能性" value={posting.contractRenewal} editable={editable} fieldKey="contractRenewal" onFieldChange={onFieldChange} />

        <SectionHeader title="賃金・手当" />
        <FieldBlock label="賃金形態" value={posting.wageType} editable={editable} fieldKey="wageType" onFieldChange={onFieldChange} />
        <FieldBlock label="賃金額" value={posting.wageAmount} editable={editable} fieldKey="wageAmount" onFieldChange={onFieldChange} />
        <FieldBlock label="手当" value={posting.allowances} editable={editable} fieldKey="allowances" onFieldChange={onFieldChange} />
        <FieldBlock label="通勤手当" value={posting.commutingAllowance} editable={editable} fieldKey="commutingAllowance" onFieldChange={onFieldChange} />
        <FieldBlock label="賞与" value={posting.bonus} editable={editable} fieldKey="bonus" onFieldChange={onFieldChange} />
        <FieldBlock label="昇給" value={posting.raise} editable={editable} fieldKey="raise" onFieldChange={onFieldChange} />

        <SectionHeader title="労働時間" />
        <FieldBlock label="就業時間" value={posting.workingHours} editable={editable} fieldKey="workingHours" onFieldChange={onFieldChange} />
        <FieldBlock label="時間外労働" value={posting.overtime} editable={editable} fieldKey="overtime" onFieldChange={onFieldChange} />
        <FieldBlock label="休憩時間" value={posting.breakTime} editable={editable} fieldKey="breakTime" onFieldChange={onFieldChange} />
        <FieldBlock label="休日" value={posting.holidays} editable={editable} fieldKey="holidays" onFieldChange={onFieldChange} />
        <FieldBlock label="年次有給休暇" value={posting.annualLeave} editable={editable} fieldKey="annualLeave" onFieldChange={onFieldChange} />

        <SectionHeader title="その他の労働条件等" />
        <FieldBlock label="加入保険" value={posting.insurance} editable={editable} fieldKey="insurance" onFieldChange={onFieldChange} />
        <FieldBlock label="企業年金" value={posting.pension} editable={editable} fieldKey="pension" onFieldChange={onFieldChange} />
        <FieldBlock label="試用期間" value={posting.trialPeriod} editable={editable} fieldKey="trialPeriod" onFieldChange={onFieldChange} />
        <FieldBlock label="特記事項" value={posting.specialNotes} editable={editable} fieldKey="specialNotes" onFieldChange={onFieldChange} />

        <SectionHeader title="必要な経験等" />
        <FieldBlock label="必要な経験・知識・技能等" value={posting.requirements} charLimit={150} editable={editable} fieldKey="requirements" onFieldChange={onFieldChange} />
        <FieldBlock label="必要な免許・資格" value={posting.requiredLicenses} editable={editable} fieldKey="requiredLicenses" onFieldChange={onFieldChange} />
        <FieldBlock label="年齢制限" value={posting.ageRestriction} editable={editable} fieldKey="ageRestriction" onFieldChange={onFieldChange} />

        <SectionHeader title="選考等" />
        <FieldBlock label="採用人数" value={posting.numberOfHires} editable={editable} fieldKey="numberOfHires" onFieldChange={onFieldChange} />
        <FieldBlock label="選考方法" value={posting.selectionMethod} editable={editable} fieldKey="selectionMethod" onFieldChange={onFieldChange} />
        <FieldBlock label="応募書類" value={posting.applicationDocuments} editable={editable} fieldKey="applicationDocuments" onFieldChange={onFieldChange} />
        <FieldBlock label="選考結果通知" value={posting.selectionNotification} editable={editable} fieldKey="selectionNotification" onFieldChange={onFieldChange} />

        <SectionHeader title="求人に関する特記事項" />
        <FieldBlock label="特記事項" value={posting.remarks} charLimit={300} editable={editable} fieldKey="remarks" onFieldChange={onFieldChange} />
      </div>
    </div>
  );
}
