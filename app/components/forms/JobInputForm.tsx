"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommonFields } from "./CommonFields";
import { IndeedFields } from "./IndeedFields";
import { AirWorkFields } from "./AirWorkFields";
import { JobMedleyFields } from "./JobMedleyFields";
import { SmartDefaultsSelector } from "./SmartDefaultsSelector";
import { JobPostingInput, CommonJobInfo } from "@/types/job-posting";

const defaultCommonInfo: CommonJobInfo = {
  companyName: "",
  industry: "",
  companyDescription: "",
  jobTitle: "",
  employmentType: "正社員",
  numberOfHires: 1,
  prefecture: "東京都",
  city: "",
  address: "",
  nearestStation: "",
  accessFromStation: "",
  salaryMin: 200000,
  salaryMax: undefined,
  salaryType: "月給",
  salaryDescription: "",
  workingHours: "",
  workingHoursDescription: "",
  jobDescription: "",
  requirements: "",
  welcomeRequirements: "",
  holidays: "",
  benefits: "",
  socialInsurance: [],
  probationPeriod: "",
  selectionProcess: "",
  appealPoints: "",
  targetAudience: "",
  competitiveAdvantage: "",
};

interface JobInputFormProps {
  jobId?: string;
}

export function JobInputForm({ jobId }: JobInputFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<JobPostingInput>({
    common: defaultCommonInfo,
    indeed: {},
    airwork: {},
    jobmedley: {},
  });

  const updateCommon = (data: Partial<CommonJobInfo>) => {
    setFormData((prev) => ({
      ...prev,
      common: { ...prev.common, ...data },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // フォームデータをsessionStorageに保存
    sessionStorage.setItem("jobPostingInput", JSON.stringify(formData));

    // 進捗ページへ遷移
    router.push(jobId ? `/jobs/${jobId}/new-posting/progress` : "/new-posting/progress");
  };

  return (
    <form onSubmit={handleSubmit}>
      <SmartDefaultsSelector onApply={updateCommon} />
      <Card>
        <CardHeader>
          <CardTitle>求人情報の入力</CardTitle>
          <CardDescription>
            共通情報と各媒体向けの情報を入力してください。AIが自動で3媒体分の求人原稿を生成します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="common">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="common">共通情報</TabsTrigger>
              <TabsTrigger value="indeed">Indeed</TabsTrigger>
              <TabsTrigger value="airwork">AirWork</TabsTrigger>
              <TabsTrigger value="jobmedley">JobMedley</TabsTrigger>
            </TabsList>

            <TabsContent value="common" className="mt-6">
              <CommonFields data={formData.common} onChange={updateCommon} />
            </TabsContent>

            <TabsContent value="indeed" className="mt-6">
              <IndeedFields
                data={formData.indeed || {}}
                onChange={(data) =>
                  setFormData((prev) => ({ ...prev, indeed: { ...prev.indeed, ...data } }))
                }
              />
            </TabsContent>

            <TabsContent value="airwork" className="mt-6">
              <AirWorkFields
                data={formData.airwork || {}}
                onChange={(data) =>
                  setFormData((prev) => ({ ...prev, airwork: { ...prev.airwork, ...data } }))
                }
              />
            </TabsContent>

            <TabsContent value="jobmedley" className="mt-6">
              <JobMedleyFields
                data={formData.jobmedley || {}}
                onChange={(data) =>
                  setFormData((prev) => ({
                    ...prev,
                    jobmedley: { ...prev.jobmedley, ...data },
                  }))
                }
              />
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "処理中..." : "AIで求人原稿を自動生成"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
