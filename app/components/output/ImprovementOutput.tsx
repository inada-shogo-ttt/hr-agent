"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImprovementDiff } from "./ImprovementDiff";
import { IssuesSummary } from "./IssuesSummary";
import { BudgetRecommendation } from "./BudgetRecommendation";
import { TeamBOutput } from "@/types/team-b";

interface ImprovementOutputProps {
  output: TeamBOutput;
}

// 改善後の原稿全文は team-a レコードへ自動反映されるため、
// ここでは差分・課題・予算提案のみを表示する(全文の確認・編集は求人詳細ページ)
export function ImprovementOutput({ output }: ImprovementOutputProps) {
  const hasBudget = output.platform === "indeed" && !!output.budgetRecommendation;

  return (
    <Tabs defaultValue="diff">
      <TabsList className={`grid w-full ${hasBudget ? "grid-cols-3" : "grid-cols-2"}`}>
        <TabsTrigger value="diff">変更前/変更後</TabsTrigger>
        <TabsTrigger value="issues">課題サマリー</TabsTrigger>
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

      {hasBudget && output.budgetRecommendation && (
        <TabsContent value="budget" className="mt-6">
          <BudgetRecommendation recommendation={output.budgetRecommendation} />
        </TabsContent>
      )}
    </Tabs>
  );
}
