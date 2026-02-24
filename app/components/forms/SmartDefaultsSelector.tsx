"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES, JOB_CATEGORIES, getSmartDefaults } from "@/lib/smart-defaults";
import { CommonJobInfo, EmploymentType } from "@/types/job-posting";

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "正社員",
  "パート・アルバイト",
  "契約社員",
  "派遣社員",
  "業務委託",
  "インターン",
];

const PREVIEW_LABELS: { key: keyof CommonJobInfo; label: string }[] = [
  { key: "industry", label: "業種" },
  { key: "jobTitle", label: "職種名" },
  { key: "employmentType", label: "雇用形態" },
  { key: "workingHours", label: "勤務時間" },
  { key: "socialInsurance", label: "社会保険" },
  { key: "holidays", label: "休暇・休日" },
  { key: "benefits", label: "待遇・福利厚生" },
  { key: "selectionProcess", label: "選考の流れ" },
  { key: "probationPeriod", label: "試用期間" },
];

interface SmartDefaultsSelectorProps {
  onApply: (defaults: Partial<CommonJobInfo>) => void;
}

export function SmartDefaultsSelector({ onApply }: SmartDefaultsSelectorProps) {
  const [industry, setIndustry] = useState("");
  const [jobCategory, setJobCategory] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("正社員");
  const [showPreview, setShowPreview] = useState(false);
  const [applied, setApplied] = useState(false);

  const availableJobs = industry ? JOB_CATEGORIES[industry] || [] : [];
  const canApply = !!industry && !!jobCategory;
  const defaults = canApply ? getSmartDefaults(industry, jobCategory, employmentType) : null;

  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    setJobCategory("");
    setApplied(false);
  };

  const handleApply = () => {
    if (!defaults) return;
    onApply(defaults);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const getPreviewValue = (key: keyof CommonJobInfo, value: unknown): string => {
    if (!value) return "";
    if (Array.isArray(value)) return value.join("・");
    return String(value);
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
          <Sparkles className="w-4 h-4 text-blue-500" />
          スマート入力
        </CardTitle>
        <CardDescription>
          業種・職種を選ぶだけで、典型的な項目を自動入力します。あとで個別に編集できます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3つのセレクタ */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">業種</p>
            <Select value={industry} onValueChange={handleIndustryChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="業種を選択" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">職種</p>
            <Select
              value={jobCategory}
              onValueChange={setJobCategory}
              disabled={!industry}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={industry ? "職種を選択" : "先に業種を選択"} />
              </SelectTrigger>
              <SelectContent>
                {availableJobs.map((job) => (
                  <SelectItem key={job} value={job}>
                    {job}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">雇用形態</p>
            <Select
              value={employmentType}
              onValueChange={(v) => {
                setEmploymentType(v as EmploymentType);
                setApplied(false);
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* プレビュー + 適用ボタン */}
        {canApply && defaults ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 transition-colors"
            >
              {showPreview ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              自動入力される内容を{showPreview ? "隠す" : "確認する"}
            </button>

            {showPreview && (
              <div className="bg-white rounded-lg border border-blue-100 p-3 space-y-2 text-sm">
                {PREVIEW_LABELS.map(({ key, label }) => {
                  const value = getPreviewValue(key, defaults[key]);
                  if (!value) return null;
                  return (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0 w-28">{label}</span>
                      <span className="text-foreground leading-snug">{value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleApply}
                size="sm"
                className={
                  applied
                    ? "bg-green-600 hover:bg-green-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }
              >
                {applied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    適用しました
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    デフォルトを適用
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                適用後も各タブで内容を自由に編集できます
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            業種と職種を選択すると、自動入力ボタンが表示されます
          </p>
        )}
      </CardContent>
    </Card>
  );
}
