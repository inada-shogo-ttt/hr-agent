"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExistingIndeedFields } from "./ExistingIndeedFields";
import { ExistingAirWorkFields } from "./ExistingAirWorkFields";
import { ExistingJobMedleyFields } from "./ExistingJobMedleyFields";
import { ExistingHelloWorkFields } from "./ExistingHelloWorkFields";
import { TeamBInput, ExistingPostingFields, IndeedMetrics, AirWorkMetrics } from "@/types/team-b";
import { Platform } from "@/types/platform";

export function RewriteInputForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [platform, setPlatform] = useState<Platform>("indeed");
  const [posting, setPosting] = useState<ExistingPostingFields>({});
  const [indeedMetrics, setIndeedMetrics] = useState<IndeedMetrics>({});
  const [airworkMetrics, setAirworkMetrics] = useState<AirWorkMetrics>({});

  const updatePosting = (data: Partial<ExistingPostingFields>) => {
    setPosting((prev) => ({ ...prev, ...data }));
  };

  const handleTabChange = (value: string) => {
    setPlatform(value as Platform);
    // フォームデータはリセットしない（切り替え時にデータが消えるのを防ぐ）
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const input: TeamBInput = {
      platform,
      existingPosting: posting,
      metrics: platform === "indeed" ? indeedMetrics : platform === "airwork" ? airworkMetrics : undefined,
    };

    sessionStorage.setItem("teamBInput", JSON.stringify(input));
    router.push("/rewrite-posting/progress");
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>既存原稿の入力</CardTitle>
          <CardDescription>
            改善したい媒体を選択し、既存の原稿データと掲載数値を入力してください。AIが課題を分析し、改善案を提案します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="indeed" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="indeed">Indeed</TabsTrigger>
              <TabsTrigger value="airwork">AirWork</TabsTrigger>
              <TabsTrigger value="jobmedley">JobMedley</TabsTrigger>
              <TabsTrigger value="hellowork">ハローワーク</TabsTrigger>
            </TabsList>

            <TabsContent value="indeed" className="mt-6">
              <ExistingIndeedFields
                data={posting}
                metrics={indeedMetrics}
                onChange={updatePosting}
                onMetricsChange={(data) => setIndeedMetrics((prev) => ({ ...prev, ...data }))}
              />
            </TabsContent>

            <TabsContent value="airwork" className="mt-6">
              <ExistingAirWorkFields
                data={posting}
                metrics={airworkMetrics}
                onChange={updatePosting}
                onMetricsChange={(data) => setAirworkMetrics((prev) => ({ ...prev, ...data }))}
              />
            </TabsContent>

            <TabsContent value="jobmedley" className="mt-6">
              <ExistingJobMedleyFields
                data={posting}
                onChange={updatePosting}
              />
            </TabsContent>

            <TabsContent value="hellowork" className="mt-6">
              <ExistingHelloWorkFields
                data={posting}
                onChange={updatePosting}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "処理中..." : "AIで原稿を改善する"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
