"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Pencil } from "lucide-react";
import { ExistingPostingFields } from "@/types/team-b";
import { ThumbnailPreview } from "./ThumbnailPreview";

interface FieldDef {
  key: keyof ExistingPostingFields;
  label: string;
}

const INDEED_FIELDS: FieldDef[] = [
  { key: "jobTitle", label: "職種名" },
  { key: "catchphrase", label: "キャッチコピー" },
  { key: "numberOfHires", label: "採用予定人数" },
  { key: "employmentType", label: "雇用形態" },
  { key: "location", label: "勤務地" },
  { key: "salary", label: "給与" },
  { key: "salaryDescription", label: "給与の補足" },
  { key: "workingHours", label: "勤務時間" },
  { key: "jobDescription", label: "仕事内容" },
  { key: "appealPoints", label: "アピールポイント" },
  { key: "requirements", label: "求める人材" },
  { key: "holidays", label: "休暇・休日" },
  { key: "access", label: "アクセス" },
  { key: "benefits", label: "待遇・福利厚生" },
  { key: "socialInsurance", label: "社会保険" },
  { key: "probationPeriod", label: "試用期間" },
];

const AIRWORK_FIELDS: FieldDef[] = [
  { key: "jobTitle", label: "職種名" },
  { key: "jobCategory", label: "職種" },
  { key: "catchphrase", label: "求人キャッチコピー" },
  { key: "jobDescription", label: "仕事内容" },
  { key: "jobDescriptionFeatures", label: "仕事内容の特徴" },
  { key: "location", label: "勤務地" },
  { key: "locationFeatures", label: "勤務地の特徴" },
  { key: "requirements", label: "求める人材" },
  { key: "numberOfHires", label: "採用予定人数" },
  { key: "salary", label: "給与形態" },
  { key: "salaryFeatures", label: "給与の特徴" },
  { key: "salarySupplementary", label: "給与の補足説明" },
  { key: "salaryExample", label: "給与例" },
  { key: "workPatternFeatures", label: "勤務形態の特徴" },
  { key: "workTimeSupplementary", label: "勤務時間の補足" },
  { key: "holidays", label: "休日・休暇" },
  { key: "benefits", label: "福利厚生" },
  { key: "benefitsSupplementary", label: "福利厚生の補足" },
  { key: "socialInsurance", label: "社会保険" },
  { key: "hasProbationTraining", label: "試用・研修期間" },
  { key: "selectionProcess", label: "選考の流れ" },
  { key: "workEnvironment", label: "職場環境" },
  { key: "workStyle", label: "勤務スタイル" },
];

const JOBMEDLEY_FIELDS: FieldDef[] = [
  { key: "jobTitle", label: "職種名" },
  { key: "catchphrase", label: "キャッチコピー" },
  { key: "jobDescription", label: "仕事内容" },
  { key: "appealTitle", label: "訴求文タイトル" },
  { key: "appealText", label: "訴求文" },
  { key: "requirements", label: "求める人材" },
  { key: "welcomeRequirements", label: "歓迎要件" },
  { key: "salary", label: "給与" },
  { key: "salaryNotes", label: "給与の補足" },
  { key: "workingHours", label: "勤務時間" },
  { key: "holidays", label: "休暇・休日" },
  { key: "longTermHolidays", label: "長期休暇" },
  { key: "benefits", label: "待遇・福利厚生" },
  { key: "trainingSystem", label: "教育体制・研修" },
  { key: "selectionProcess", label: "選考の流れ" },
  { key: "location", label: "勤務地" },
];

const HELLOWORK_FIELDS: FieldDef[] = [
  { key: "jobTitle", label: "職種" },
  { key: "jobDescription", label: "仕事の内容" },
  { key: "employmentPeriod", label: "雇用期間" },
  { key: "contractRenewal", label: "契約更新" },
  { key: "wageAmount", label: "賃金額" },
  { key: "allowances", label: "手当" },
  { key: "commutingAllowance", label: "通勤手当" },
  { key: "bonus", label: "賞与" },
  { key: "raise", label: "昇給" },
  { key: "workingHours", label: "就業時間" },
  { key: "overtime", label: "時間外労働" },
  { key: "breakTime", label: "休憩時間" },
  { key: "holidays", label: "休日" },
  { key: "annualLeave", label: "年次有給休暇" },
  { key: "insurance", label: "加入保険" },
  { key: "pension", label: "企業年金" },
  { key: "trialPeriod", label: "試用期間" },
  { key: "specialNotes", label: "特記事項" },
  { key: "requirements", label: "必要な経験・知識・技能等" },
  { key: "requiredLicenses", label: "必要な免許・資格" },
  { key: "ageRestriction", label: "年齢制限" },
  { key: "selectionMethod", label: "選考方法" },
  { key: "applicationDocuments", label: "応募書類" },
  { key: "remarks", label: "求人に関する特記事項" },
];

const PLATFORM_FIELD_MAP: Record<string, FieldDef[]> = {
  indeed: INDEED_FIELDS,
  airwork: AIRWORK_FIELDS,
  jobmedley: JOBMEDLEY_FIELDS,
  hellowork: HELLOWORK_FIELDS,
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 px-2 text-xs">
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {copied ? "コピー済み" : label}
    </Button>
  );
}

interface ImprovedManuscriptProps {
  platform: string;
  originalPosting: ExistingPostingFields;
  improvedPosting: ExistingPostingFields;
  changedFields: Set<string>;
  thumbnailUrls: string[];
  editable?: boolean;
  onFieldChange?: (field: string, value: string) => void;
  onThumbnailsChange?: (urls: string[]) => void;
  jobId?: string;
}

export function ImprovedManuscript({
  platform,
  originalPosting,
  improvedPosting,
  changedFields,
  thumbnailUrls,
  editable,
  onFieldChange,
  onThumbnailsChange,
  jobId,
}: ImprovedManuscriptProps) {
  const [allCopied, setAllCopied] = useState(false);
  const fields = PLATFORM_FIELD_MAP[platform] || INDEED_FIELDS;

  // 元の原稿に改善部分をマージ
  const merged: ExistingPostingFields = { ...originalPosting, ...improvedPosting };

  // 値があるフィールドのみ表示
  const visibleFields = fields.filter((f) => {
    const val = merged[f.key];
    return val && String(val).trim().length > 0;
  });

  const buildFullText = () => {
    return visibleFields
      .map((f) => `【${f.label}】\n${merged[f.key]}`)
      .join("\n\n");
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(buildFullText());
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const platformLabel = platform === "indeed" ? "インディード" : platform === "airwork" ? "エアワーク" : platform === "hellowork" ? "ハローワーク" : "ジョブメドレー";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{platformLabel} 改善後原稿</h2>
        <Button onClick={handleCopyAll} variant="outline" size="sm">
          {allCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {allCopied ? "コピー済み" : "全文コピー"}
        </Button>
      </div>

      {thumbnailUrls.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            サムネイル（{thumbnailUrls.length}枚）
          </h3>
          <ThumbnailPreview urls={thumbnailUrls} filenamePrefix="improved_thumbnail" editable={editable} jobId={jobId} platform={platform} onUrlsChange={onThumbnailsChange} />
        </div>
      )}

      <div className="space-y-4">
        {visibleFields.map((f) => {
          const value = String(merged[f.key] ?? "");
          const isChanged = changedFields.has(f.key);

          return (
            <EditableField
              key={f.key}
              label={f.label}
              fieldKey={f.key}
              value={value}
              isChanged={isChanged}
              editable={editable}
              onFieldChange={onFieldChange}
            />
          );
        })}
      </div>
    </div>
  );
}

function EditableField({
  label,
  fieldKey,
  value,
  isChanged,
  editable,
  onFieldChange,
}: {
  label: string;
  fieldKey: string;
  value: string;
  isChanged: boolean;
  editable?: boolean;
  onFieldChange?: (field: string, value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {isChanged && (
            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">改善済み</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
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
            className={`w-full border rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isChanged ? "border-green-200 bg-green-50/50" : ""
            }`}
            value={value}
            onChange={(e) => {
              if (onFieldChange) {
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
        <div
          className={`border rounded-md p-3 text-sm whitespace-pre-wrap ${
            isChanged ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
          }`}
        >
          {value}
        </div>
      )}
    </div>
  );
}
