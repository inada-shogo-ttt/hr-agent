"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp } from "lucide-react";
import { BudgetRecommendation as BudgetRecommendationType } from "@/types/team-b";

interface BudgetRecommendationProps {
  recommendation: BudgetRecommendationType;
}

export function BudgetRecommendation({ recommendation }: BudgetRecommendationProps) {
  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-base">予算最適化提案（Indeed専用）</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {recommendation.currentDailyBudget && (
            <div className="p-3 rounded-lg bg-gray-50 border">
              <p className="text-xs text-muted-foreground mb-1">現在の日額予算</p>
              <p className="text-lg font-bold">{recommendation.currentDailyBudget.toLocaleString()}円/日</p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-600 mb-1">推奨日額予算レンジ</p>
            <p className="text-lg font-bold text-blue-700">
              {recommendation.recommendedMin.toLocaleString()}〜{recommendation.recommendedMax.toLocaleString()}円/日
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-gray-50 border">
            <p className="text-xs font-medium text-gray-600 mb-1">推奨理由</p>
            <p className="text-sm">{recommendation.reasoning}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <p className="text-xs font-medium text-green-600">期待される効果</p>
            </div>
            <p className="text-sm text-green-800">{recommendation.expectedImpact}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
