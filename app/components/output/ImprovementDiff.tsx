"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { ImprovementDiff as ImprovementDiffType } from "@/types/team-b";

interface ImprovementDiffProps {
  improvements: ImprovementDiffType[];
}

export function ImprovementDiff({ improvements }: ImprovementDiffProps) {
  if (improvements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">改善箇所はありません。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {improvements.map((diff, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{diff.fieldLabel}</CardTitle>
              <Badge variant="outline" className="text-xs">{diff.field}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
              {/* Before */}
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-medium text-red-600 mb-1">変更前</p>
                <p className="text-sm whitespace-pre-wrap">{diff.before}</p>
              </div>

              <div className="flex items-center pt-6">
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>

              {/* After */}
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-green-600 mb-1">変更後</p>
                <p className="text-sm whitespace-pre-wrap">{diff.after}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              変更理由: {diff.reason}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
