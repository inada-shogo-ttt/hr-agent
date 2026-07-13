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
    const allText = `${posting.facilityType ? `【施設種別】\n${posting.facilityType}\n\n` : ""}【訴求文タイトル】
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
${posting.holidays}${posting.longTermHolidays ? `\n長期休暇・特別休暇: ${posting.longTermHolidays}` : ""}

【応募要件】
${posting.requirements}

【歓迎要件】
${posting.welcomeRequirements}

【アクセス】
${posting.access}

【選考プロセス】
${posting.selectionProcess}${posting.staffVoice ? `\n\n【職員の声】\n${posting.staffVoice}` : ""}${posting.workplaceAtmosphere ? `\n\n【職場の環境】\n${posting.workplaceAtmosphere}` : ""}${posting.hiringManagerName ? `\n\n【採用担当者】\n${posting.hiringManagerName}${posting.contactPhone ? ` / ${posting.contactPhone}` : ""}${posting.contactEmail ? ` / ${posting.contactEmail}` : ""}` : ""}`;
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

      {(urls.length > 0 || (editable && jobId)) && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            サムネイル（{urls.length}枚）
          </h3>
          <ThumbnailPreview
            urls={urls}
            filenamePrefix="jobmedley_thumbnail"
            editable={editable}
            jobId={jobId}
            platform="jobmedley"
            regeneratePrompt={`医療・介護系求人サイト用のバナー画像。「${posting.appealTitle}」の雰囲気を伝える、実際の職場で20〜30代のスタッフ2〜3名が働くリアルで自然なシーン。自然光ベースの明るい照明、プロフェッショナルで清潔感のある構図。画像内にテキスト・ロゴ・文字は一切含めないこと。`}
            onUrlsChange={onThumbnailsChange}
          />
        </div>
      )}

      <div className="space-y-4">
        {posting.facilityType && (
          <FieldBlock label="施設種別" value={posting.facilityType} editable={editable} fieldKey="facilityType" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="訴求文タイトル" value={posting.appealTitle} charLimit={30} editable={editable} fieldKey="appealTitle" onFieldChange={onFieldChange} />
        <FieldBlock label="訴求文" value={posting.appealText} charLimit={300} editable={editable} fieldKey="appealText" onFieldChange={onFieldChange} />
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={500} editable={editable} fieldKey="jobDescription" onFieldChange={onFieldChange} />
        <FieldBlock label="雇用形態と給与" value={posting.employmentTypeAndSalary} editable={editable} fieldKey="employmentTypeAndSalary" onFieldChange={onFieldChange} />
        <FieldBlock label="待遇" value={posting.benefits} editable={editable} fieldKey="benefits" onFieldChange={onFieldChange} />
        <FieldBlock label="教育体制・研修" value={posting.trainingSystem} editable={editable} fieldKey="trainingSystem" onFieldChange={onFieldChange} />
        <FieldBlock label="勤務時間・休憩時間" value={posting.workingHours} editable={editable} fieldKey="workingHours" onFieldChange={onFieldChange} />
        <FieldBlock label="休日" value={posting.holidays} editable={editable} fieldKey="holidays" onFieldChange={onFieldChange} />
        {posting.longTermHolidays && (
          <FieldBlock label="長期休暇・特別休暇" value={posting.longTermHolidays} editable={editable} fieldKey="longTermHolidays" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="応募要件" value={posting.requirements} editable={editable} fieldKey="requirements" onFieldChange={onFieldChange} />
        <FieldBlock label="歓迎要件" value={posting.welcomeRequirements} editable={editable} fieldKey="welcomeRequirements" onFieldChange={onFieldChange} />
        <FieldBlock label="アクセス" value={posting.access} editable={editable} fieldKey="access" onFieldChange={onFieldChange} />
        <FieldBlock label="選考プロセス" value={posting.selectionProcess} editable={editable} fieldKey="selectionProcess" onFieldChange={onFieldChange} />
        {posting.staffVoice && (
          <FieldBlock label="職員の声" value={posting.staffVoice} editable={editable} fieldKey="staffVoice" onFieldChange={onFieldChange} />
        )}
        {posting.workplaceAtmosphere && (
          <FieldBlock label="職場の環境" value={posting.workplaceAtmosphere} editable={editable} fieldKey="workplaceAtmosphere" onFieldChange={onFieldChange} />
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
      </div>
    </div>
  );
}
