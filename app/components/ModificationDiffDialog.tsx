"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send } from "lucide-react";
import { AllPlatformPostings, Platform } from "@/types/platform";

interface DiffEntry {
  label: string;
  before: string;
  after: string;
}

interface PlatformDiff {
  platform: Platform;
  platformLabel: string;
  diffs: DiffEntry[];
}

const PLATFORM_LABELS: Record<Platform, string> = {
  indeed: "インディード",
  airwork: "エアワーク",
  jobmedley: "ジョブメドレー",
  hellowork: "ハローワーク",
};

const FIELD_LABELS: Record<string, string> = {
  jobTitle: "職種名",
  catchphrase: "キャッチコピー",
  numberOfHires: "採用予定人数",
  location: "勤務地",
  employmentType: "雇用形態",
  salary: "給与",
  workingHours: "勤務時間",
  socialInsurance: "社会保険",
  probationPeriod: "試用期間",
  jobDescription: "仕事内容",
  appealPoints: "アピールポイント",
  requirements: "求める人材",
  holidays: "休暇・休日",
  access: "アクセス",
  benefits: "待遇・福利厚生",
  workStyle: "勤務形態",
  selectionProcess: "選考の流れ",
  appealTitle: "訴求文タイトル",
  appealText: "訴求文",
  employmentTypeAndSalary: "雇用形態と給与",
  trainingSystem: "研修制度",
  welcomeRequirements: "歓迎条件",
  companyName: "会社名",
  companyAddress: "会社所在地",
  workLocation: "勤務場所",
  smokingPolicy: "受動喫煙対策",
  employmentPeriod: "雇用期間",
  contractRenewal: "契約更新",
  wageType: "賃金形態",
  wageAmount: "賃金額",
  allowances: "手当",
  commutingAllowance: "通勤手当",
  bonus: "賞与",
  raise: "昇給",
  overtime: "時間外",
  breakTime: "休憩時間",
  annualLeave: "年次有給休暇",
  insurance: "保険",
  pension: "年金",
  trialPeriod: "試用期間",
  specialNotes: "特記事項",
  requiredLicenses: "必要な免許・資格",
  ageRestriction: "年齢制限",
  selectionMethod: "選考方法",
  applicationDocuments: "応募書類",
  selectionNotification: "選考結果通知",
  remarks: "備考",
  recruitmentBudget: "採用予算",
};

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

// 2つのポスティングオブジェクトの差分を取得（テキストフィールドのみ）
function computePlatformDiff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after: any,
): DiffEntry[] {
  if (!before || !after) return [];
  const diffs: DiffEntry[] = [];
  const skipKeys = new Set(["thumbnailUrls", "charCounts", "recruitmentBudget"]);

  for (const key of Object.keys(after)) {
    if (skipKeys.has(key)) continue;
    const bVal = String(before[key] ?? "");
    const aVal = String(after[key] ?? "");
    if (bVal !== aVal) {
      diffs.push({ label: getFieldLabel(key), before: bVal, after: aVal });
    }
  }
  return diffs;
}

function computeAllDiffs(
  saved: AllPlatformPostings,
  current: AllPlatformPostings,
): PlatformDiff[] {
  const platforms: Platform[] = ["indeed", "airwork", "jobmedley", "hellowork"];
  const result: PlatformDiff[] = [];

  for (const p of platforms) {
    const diffs = computePlatformDiff(saved[p], current[p]);
    if (diffs.length > 0) {
      result.push({
        platform: p,
        platformLabel: PLATFORM_LABELS[p],
        diffs,
      });
    }
  }
  return result;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedOutput: AllPlatformPostings;
  currentOutput: AllPlatformPostings;
  onConfirm: () => void;
  loading: boolean;
}

export function ModificationDiffDialog({
  open,
  onOpenChange,
  savedOutput,
  currentOutput,
  onConfirm,
  loading,
}: Props) {
  const allDiffs = computeAllDiffs(savedOutput, currentOutput);
  const totalChanges = allDiffs.reduce((sum, pd) => sum + pd.diffs.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            修正内容の確認
            <Badge variant="secondary" className="text-xs">
              {totalChanges}件の変更
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {totalChanges === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            変更されたフィールドはありません。
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            {allDiffs.length === 1 ? (
              // 1媒体のみ変更 → タブ不要
              <DiffList diffs={allDiffs[0].diffs} platformLabel={allDiffs[0].platformLabel} />
            ) : (
              <Tabs defaultValue={allDiffs[0].platform}>
                <TabsList className={`grid w-full grid-cols-${allDiffs.length}`}>
                  {allDiffs.map((pd) => (
                    <TabsTrigger key={pd.platform} value={pd.platform}>
                      {pd.platformLabel}
                      <span className="ml-1.5 text-[10px] text-muted-foreground">
                        ({pd.diffs.length})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {allDiffs.map((pd) => (
                  <TabsContent key={pd.platform} value={pd.platform} className="mt-4">
                    <DiffList diffs={pd.diffs} platformLabel={pd.platformLabel} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading || totalChanges === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {loading ? "送信中..." : "以下の内容で修正を依頼する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffList({ diffs, platformLabel }: { diffs: DiffEntry[]; platformLabel: string }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {platformLabel}の以下のフィールドが変更されています
      </p>
      {diffs.map((d, i) => (
        <div key={i} className="rounded-lg border overflow-hidden">
          <div className="px-3 py-1.5 bg-gray-50 border-b">
            <span className="text-sm font-medium">{d.label}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
            <div className="p-3">
              <p className="text-[10px] font-medium text-red-500 mb-1">変更前</p>
              <p className="text-sm whitespace-pre-wrap text-gray-600 leading-relaxed">
                {d.before || <span className="italic text-gray-400">（空欄）</span>}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-medium text-green-600 mb-1">変更後</p>
              <p className="text-sm whitespace-pre-wrap text-gray-900 leading-relaxed">
                {d.after || <span className="italic text-gray-400">（空欄）</span>}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
