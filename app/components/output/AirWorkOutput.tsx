"use client";

import { AirWorkPosting } from "@/types/platform";
import { Button } from "@/components/ui/button";
import { Copy, Check, Pencil } from "lucide-react";
import { useState } from "react";
import { ThumbnailPreview } from "./ThumbnailPreview";

interface AirWorkOutputProps {
  posting: AirWorkPosting;
  thumbnailUrls: string[];
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

export function AirWorkOutput({ posting, thumbnailUrls, editable, onFieldChange, onThumbnailsChange, jobId }: AirWorkOutputProps) {
  const copyAll = async () => {
    const allText = `【職種名】
${posting.jobTitle}

${posting.hpCatchphrase ? `【採用HP向けキャッチコピー】\n${posting.hpCatchphrase}\n\n` : ""}【仕事内容】
${posting.jobDescription}

【勤務地】
${posting.location}

【求める人材】
${posting.requirements}

【採用予定人数】
${posting.numberOfHires}

【給与】
${posting.salary}${posting.salaryDisplayType ? `（表示方法：${posting.salaryDisplayType}）` : ""}

【試用・研修】
${posting.trialPeriod}

【応募受付方法】
${posting.applicationReceiveMethod}

【応募者から取得する情報】
${posting.applicantInfoToGet}

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
        <h2 className="text-xl font-bold">エアワーク 求人原稿</h2>
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
            filenamePrefix="airwork_thumbnail"
            editable={editable}
            jobId={jobId}
            platform="airwork"
            regeneratePrompt={`求人サイト用のバナー画像。職種は「${posting.jobTitle}」。${posting.hpCatchphrase ? `「${posting.hpCatchphrase}」の雰囲気を伝える、` : ""}実際の職場で20〜30代のスタッフ2〜3名が働くリアルで自然なシーン。自然光ベースの明るい照明、プロフェッショナルで清潔感のある構図。画像内にテキスト・ロゴ・文字は一切含めないこと。`}
            onUrlsChange={onThumbnailsChange}
          />
        </div>
      )}

      <div className="space-y-4">
        <FieldBlock label="職種名" value={posting.jobTitle} charLimit={30} editable={editable} fieldKey="jobTitle" onFieldChange={onFieldChange} />
        {posting.hpCatchphrase && (
          <FieldBlock label="採用HP向けキャッチコピー" value={posting.hpCatchphrase} charLimit={40} editable={editable} fieldKey="hpCatchphrase" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="仕事内容" value={posting.jobDescription} charLimit={600} editable={editable} fieldKey="jobDescription" onFieldChange={onFieldChange} />
        <FieldBlock label="勤務地" value={posting.location} editable={editable} fieldKey="location" onFieldChange={onFieldChange} />
        <FieldBlock label="求める人材" value={posting.requirements} charLimit={200} editable={editable} fieldKey="requirements" onFieldChange={onFieldChange} />
        <FieldBlock label="採用予定人数" value={posting.numberOfHires} editable={editable} fieldKey="numberOfHires" onFieldChange={onFieldChange} />
        <FieldBlock label="給与" value={posting.salary} editable={editable} fieldKey="salary" onFieldChange={onFieldChange} />
        {posting.salaryDisplayType && (
          <FieldBlock label="給与の表示方法" value={posting.salaryDisplayType} editable={false} />
        )}
        <FieldBlock label="試用・研修" value={posting.trialPeriod} editable={editable} fieldKey="trialPeriod" onFieldChange={onFieldChange} />
        <FieldBlock label="応募受付方法" value={posting.applicationReceiveMethod} editable={editable} fieldKey="applicationReceiveMethod" onFieldChange={onFieldChange} />
        <FieldBlock label="応募者から取得する情報" value={posting.applicantInfoToGet} editable={editable} fieldKey="applicantInfoToGet" onFieldChange={onFieldChange} />
        {posting.workDays && posting.workDays.length > 0 && (
          <FieldBlock label="勤務曜日" value={posting.workDays.join("、")} editable={false} />
        )}
        {posting.shiftPolicy && (
          <FieldBlock label="シフトの決め方" value={posting.shiftPolicy} editable={editable} fieldKey="shiftPolicy" onFieldChange={onFieldChange} />
        )}
        {posting.workPeriod && (
          <FieldBlock label="勤務期間" value={posting.workPeriod} editable={editable} fieldKey="workPeriod" onFieldChange={onFieldChange} />
        )}
        {posting.commuteAllowance && (
          <FieldBlock label="交通費" value={posting.commuteAllowance} editable={editable} fieldKey="commuteAllowance" onFieldChange={onFieldChange} />
        )}
        <FieldBlock label="休日・休暇" value={posting.holidays} editable={editable} fieldKey="holidays" onFieldChange={onFieldChange} />
        <FieldBlock label="社会保険" value={posting.socialInsurance} editable={editable} fieldKey="socialInsurance" onFieldChange={onFieldChange} />
        <FieldBlock label="福利厚生" value={posting.benefits} editable={editable} fieldKey="benefits" onFieldChange={onFieldChange} />
        <FieldBlock label="選考の流れ" value={posting.selectionProcess} editable={editable} fieldKey="selectionProcess" onFieldChange={onFieldChange} />
        {posting.smokingPolicy && (
          <FieldBlock label="受動喫煙対策" value={posting.smokingPolicy} editable={editable} fieldKey="smokingPolicy" onFieldChange={onFieldChange} />
        )}

        {posting.featureTags && posting.featureTags.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">特徴タグ</span>
            <div className="flex gap-2 flex-wrap">
              {posting.featureTags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {posting.shiftIncomeExample && (
          <FieldBlock label="シフト・収入例" value={posting.shiftIncomeExample} editable={editable} fieldKey="shiftIncomeExample" onFieldChange={onFieldChange} />
        )}
        {posting.seniorStaffMessage && (
          <FieldBlock label="先輩スタッフからの一言" value={posting.seniorStaffMessage} editable={editable} fieldKey="seniorStaffMessage" onFieldChange={onFieldChange} />
        )}
        {posting.workplaceAtmosphere && (
          <FieldBlock label="職場の環境・雰囲気" value={posting.workplaceAtmosphere} editable={editable} fieldKey="workplaceAtmosphere" onFieldChange={onFieldChange} />
        )}
        {posting.applicationFlow && (
          <FieldBlock label="応募の流れ" value={posting.applicationFlow} editable={editable} fieldKey="applicationFlow" onFieldChange={onFieldChange} />
        )}
        {posting.contactPhone && (
          <FieldBlock label="問い合わせ電話番号" value={posting.contactPhone} editable={editable} fieldKey="contactPhone" onFieldChange={onFieldChange} />
        )}
      </div>
    </div>
  );
}
