"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImprovementDiff } from "./ImprovementDiff";
import { IssuesSummary } from "./IssuesSummary";
import { BudgetRecommendation } from "./BudgetRecommendation";
import { ThumbnailPreview } from "./ThumbnailPreview";
import { TeamBOutput } from "@/types/team-b";

interface ImprovementOutputProps {
  output: TeamBOutput;
}

export function ImprovementOutput({ output }: ImprovementOutputProps) {
  const hasBudget = output.platform === "indeed" && !!output.budgetRecommendation;

  return (
    <Tabs defaultValue="diff">
      <TabsList className={`grid w-full ${hasBudget ? "grid-cols-4" : "grid-cols-3"}`}>
        <TabsTrigger value="diff">Before/After</TabsTrigger>
        <TabsTrigger value="issues">課題サマリー</TabsTrigger>
        <TabsTrigger value="thumbnails">サムネイル</TabsTrigger>
        {hasBudget && <TabsTrigger value="budget">予算提案</TabsTrigger>}
      </TabsList>

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

      <TabsContent value="thumbnails" className="mt-6">
        <ThumbnailPreview urls={output.thumbnailUrls} />
      </TabsContent>

      {hasBudget && output.budgetRecommendation && (
        <TabsContent value="budget" className="mt-6">
          <BudgetRecommendation recommendation={output.budgetRecommendation} />
        </TabsContent>
      )}
    </Tabs>
  );
}
