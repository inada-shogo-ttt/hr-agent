"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { IssueSummary } from "@/types/team-b";

interface IssuesSummaryProps {
  issues: IssueSummary[];
  metricsAnalysis?: string;
  manuscriptAnalysis: string;
}

const severityConfig = {
  high: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700" },
  medium: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-100 text-yellow-700" },
  low: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700" },
};

export function IssuesSummary({ issues, metricsAnalysis, manuscriptAnalysis }: IssuesSummaryProps) {
  return (
    <div className="space-y-6">
      {/* 分析サマリー */}
      {metricsAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">数値分析サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{metricsAnalysis}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">原稿分析サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{manuscriptAnalysis}</p>
        </CardContent>
      </Card>

      {/* 課題一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            検出された課題（{issues.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {issues.map((issue, index) => {
              const config = severityConfig[issue.severity];
              const Icon = config.icon;

              return (
                <div key={index} className={`p-3 rounded-lg border ${config.bg}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{issue.category}</span>
                        <Badge variant="secondary" className={`text-xs ${config.badge}`}>
                          {issue.severity === "high" ? "重要" : issue.severity === "medium" ? "注意" : "参考"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{issue.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        推奨: {issue.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
