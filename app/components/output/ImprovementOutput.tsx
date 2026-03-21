"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImprovementDiff } from "./ImprovementDiff";
import { IssuesSummary } from "./IssuesSummary";
import { BudgetRecommendation } from "./BudgetRecommendation";
import { ImprovedManuscript } from "./ImprovedManuscript";
import { TeamBOutput, ExistingPostingFields } from "@/types/team-b";

interface ImprovementOutputProps {
  output: TeamBOutput;
  originalPosting: ExistingPostingFields;
  editable?: boolean;
  onOutputChange?: (output: TeamBOutput) => void;
}

export function ImprovementOutput({ output, originalPosting, editable, onOutputChange }: ImprovementOutputProps) {
  const hasBudget = output.platform === "indeed" && !!output.budgetRecommendation;
  const changedFields = new Set(Object.keys(output.improvedPosting));

  const handleFieldChange = (field: string, value: string) => {
    if (!onOutputChange) return;
    const updated: TeamBOutput = {
      ...output,
      improvedPosting: {
        ...output.improvedPosting,
        [field]: value,
      },
    };
    onOutputChange(updated);
  };

  return (
    <Tabs defaultValue="manuscript">
      <TabsList className={`grid w-full ${hasBudget ? "grid-cols-4" : "grid-cols-3"}`}>
        <TabsTrigger value="manuscript">改善後原稿</TabsTrigger>
        <TabsTrigger value="diff">変更前/変更後</TabsTrigger>
        <TabsTrigger value="issues">課題サマリー</TabsTrigger>
        {hasBudget && <TabsTrigger value="budget">予算提案</TabsTrigger>}
      </TabsList>

      <TabsContent value="manuscript" className="mt-6">
        <ImprovedManuscript
          platform={output.platform}
          originalPosting={originalPosting}
          improvedPosting={output.improvedPosting}
          changedFields={changedFields}
          thumbnailUrls={output.thumbnailUrls}
          editable={editable}
          onFieldChange={handleFieldChange}
        />
      </TabsContent>

      <TabsContent value="diff" className="mt-6">
        <ImprovementDiff improvements={output.improvements} />
      </TabsContent>

      <TabsContent value="issues" className="mt-6">
        <IssuesSummary
          issues={output.issuesSummary}
          metricsAnalysis={output.metricsAnalysis}
          manuscriptAnalysis={output.manuscriptAnalysis}
        />
      </TabsContent>

      {hasBudget && output.budgetRecommendation && (
        <TabsContent value="budget" className="mt-6">
          <BudgetRecommendation recommendation={output.budgetRecommendation} />
        </TabsContent>
      )}
    </Tabs>
  );
}
