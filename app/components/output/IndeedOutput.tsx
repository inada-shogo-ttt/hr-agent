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
  onThumbnailsChange?: (urls: string[]) => void;
  jobId?: string;
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

export function IndeedOutput({ posting, thumbnailUrls, editable, onFieldChange, onThumbnailsChange, jobId }: IndeedOutputProps) {
  const copyAll = async () => {
    const featureTagsLine = posting.featureTags?.length
      ? `\n【特長タグ】\n${posting.featureTags.join(" / ")}`
      : "";
    const screeningLine = posting.screeningQuestions?.length
      ? `\n【応募者への質問】\n${posting.screeningQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";
    const allText = `【会社名】
${posting.companyName}${posting.postalCode ? `（〒${posting.postalCode}）` : ""}

【職種名】
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
${posting.salary}${posting.salaryDisplayType ? `（表示方法：${posting.salaryDisplayType}）` : ""}
${posting.fixedOvertimePay ? `固定残業代：${posting.fixedOvertimePay}\n` : ""}
【勤務時間】
${posting.workingHours}${posting.monthlyWorkingHours ? `\n${posting.monthlyWorkingHours}` : ""}

【休暇・休日】
${posting.holidays}

【待遇・福利厚生】
${posting.benefits}

【社会保険】
${posting.socialInsurance}

【アクセス】
${posting.access}

${posting.smokingPolicy ? `【受動喫煙対策】\n${posting.smokingPolicy}\n\n` : ""}${posting.probationPeriod ? `【試用期間】\n${posting.probationPeriod}\n\n` : ""}【採用予定人数】
${posting.numberOfHires}
${featureTagsLine}${screeningLine}
${posting.hiringManagerName ? `\n【採用担当者】\n${posting.hiringManagerName}${posting.contactPhone ? ` / ${posting.contactPhone}` : ""}${posting.contactEmail ? ` / ${posting.contactEmail}` : ""}` : ""}${posting.applicationMethod ? `\n\n【応募経路】\n${posting.applicationMethod}${posting.applicationUrl ? `（${posting.applicationUrl}）` : ""}` : ""}`;
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

      {(thumbnailUrls.length > 0 || (editable && jobId)) && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            サムネイル（{thumbnailUrls.length}枚）
          </h3>
          <ThumbnailPreview
            urls={thumbnailUrls}
            filenamePrefix="indeed_thumbnail"
            editable={editable}
            jobId={jobId}
            platform="indeed"
            regeneratePrompt={`${posting.companyName}の求人バナー画像。職種は「${posting.jobTitle}」。「${posting.catchphrase}」の雰囲気を伝える、実際の職場で20〜30代のスタッフ2〜3名が働くリアルで自然なシーン。自然光ベースの明るい照明、プロフェッショナルで清潔感のある構図。画像内にテキスト・ロゴ・文字は一切含めないこと。`}
            onUrlsChange={onThumbnailsChange}
          />
        </div>
      )}

      <div className="space-y-4">
        <FieldBlock label="会社名" value={posting.companyName} editable={editable} fieldKey="companyName" onFieldChange={onFieldChange} />
        {posting.postalCode && (
          <FieldBlock label="郵便番号" value={posting.postalCode} editable={editable} fieldKey="postalCode" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="職種名" value={posting.jobTitle} charLimit={30} editable={editable} fieldKey="jobTitle" onFieldChange={onFieldChange} />
        <FieldBlock label="キャッチコピー" value={posting.catchphrase} charLimit={50} editable={editable} fieldKey="catchphrase" onFieldChange={onFieldChange} />
        <FieldBlock label="採用予定人数" value={posting.numberOfHires} editable={editable} fieldKey="numberOfHires" onFieldChange={onFieldChange} />
        <FieldBlock label="勤務地" value={posting.location} editable={editable} fieldKey="location" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用形態" value={posting.employmentType} editable={editable} fieldKey="employmentType" onFieldChange={onFieldChange} />
        <FieldBlock label="給与" value={posting.salary} editable={editable} fieldKey="salary" onFieldChange={onFieldChange} />
        {posting.salaryDisplayType && (
          <FieldBlock label="給与の表示方法" value={posting.salaryDisplayType} editable={editable} fieldKey="salaryDisplayType" onFieldChange={onFieldChange} />
        )}
        {posting.fixedOvertimePay && (
          <FieldBlock label="固定残業代" value={posting.fixedOvertimePay} editable={editable} fieldKey="fixedOvertimePay" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="勤務時間" value={posting.workingHours} editable={editable} fieldKey="workingHours" onFieldChange={onFieldChange} />
        {posting.monthlyWorkingHours && (
          <FieldBlock label="月間平均所定労働時間" value={posting.monthlyWorkingHours} editable={editable} fieldKey="monthlyWorkingHours" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="社会保険" value={posting.socialInsurance} editable={editable} fieldKey="socialInsurance" onFieldChange={onFieldChange} />
        {posting.probationPeriod && (
          <FieldBlock label="試用期間" value={posting.probationPeriod} editable={editable} fieldKey="probationPeriod" onFieldChange={onFieldChange} />
        )}
        {posting.smokingPolicy && (
          <FieldBlock label="受動喫煙対策" value={posting.smokingPolicy} editable={editable} fieldKey="smokingPolicy" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={500} editable={editable} fieldKey="jobDescription" onFieldChange={onFieldChange} />
        <FieldBlock label="アピールポイント" value={posting.appealPoints} charLimit={300} editable={editable} fieldKey="appealPoints" onFieldChange={onFieldChange} />
        <FieldBlock label="求める人材" value={posting.requirements} charLimit={200} editable={editable} fieldKey="requirements" onFieldChange={onFieldChange} />
        <FieldBlock label="休暇・休日" value={posting.holidays} editable={editable} fieldKey="holidays" onFieldChange={onFieldChange} />
        <FieldBlock label="アクセス" value={posting.access} editable={editable} fieldKey="access" onFieldChange={onFieldChange} />
        <FieldBlock label="待遇・福利厚生" value={posting.benefits} editable={editable} fieldKey="benefits" onFieldChange={onFieldChange} />

        {posting.featureTags && posting.featureTags.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">特長タグ（最大3）</span>
            <div className="flex gap-2 flex-wrap">
              {posting.featureTags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {posting.screeningQuestions && posting.screeningQuestions.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">応募者への質問</span>
            <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
              {posting.screeningQuestions.map((q, i) => (
                <div key={i}>
                  {i + 1}. {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {(posting.hiringManagerName || posting.contactPhone || posting.contactEmail) && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">採用担当者・連絡先</span>
            <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
              {posting.hiringManagerName && <div>担当者：{posting.hiringManagerName}</div>}
              {posting.contactPhone && <div>電話：{posting.contactPhone}</div>}
              {posting.contactEmail && <div>メール：{posting.contactEmail}</div>}
            </div>
          </div>
        )}

        {posting.applicationMethod && (
          <FieldBlock
            label="応募経路"
            value={`${posting.applicationMethod}${posting.applicationUrl ? `（${posting.applicationUrl}）` : ""}`}
            editable={false}
          />
        )}
      </div>

    </div>
  );
}
