"use client";

import { useRef, useEffect } from "react";
import { AllPlatformPostings } from "@/types/platform";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndeedOutput } from "./IndeedOutput";
import { AirWorkOutput } from "./AirWorkOutput";
import { JobMedleyOutput } from "./JobMedleyOutput";
import { HelloWorkOutput } from "./HelloWorkOutput";

interface ManuscriptOutputProps {
  output: AllPlatformPostings;
  editable?: boolean;
  jobId?: string;
  onOutputChange?: (output: AllPlatformPostings) => void;
}

export function ManuscriptOutput({ output, editable, jobId, onOutputChange }: ManuscriptOutputProps) {
  // 常に最新の output を参照するための ref
  const outputRef = useRef(output);
  useEffect(() => {
    outputRef.current = output;
  }, [output]);

  const handleFieldChange = (platform: "indeed" | "airwork" | "jobmedley" | "hellowork", field: string, value: string) => {
    if (!onOutputChange) return;
    const current = outputRef.current;
    const updated = {
      ...current,
      [platform]: {
        ...current[platform],
        [field]: value,
      },
    };
    outputRef.current = updated;
    onOutputChange(updated);
  };

  const handleThumbnailsChange = (platform: "indeed" | "airwork" | "jobmedley", urls: string[]) => {
    if (!onOutputChange) return;
    const current = outputRef.current;
    const updated = {
      ...current,
      [platform]: {
        ...current[platform],
        thumbnailUrls: urls,
      },
      thumbnailUrls: [
        ...(platform === "indeed" ? urls : current.indeed?.thumbnailUrls || []),
        ...(platform === "airwork" ? urls : current.airwork?.thumbnailUrls || []),
        ...(platform === "jobmedley" ? urls : current.jobmedley?.thumbnailUrls || []),
      ],
    };
    outputRef.current = updated;
    onOutputChange(updated);
  };

  return (
    <Tabs defaultValue="indeed">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="indeed">インディード</TabsTrigger>
        <TabsTrigger value="airwork">エアワーク</TabsTrigger>
        <TabsTrigger value="jobmedley">ジョブメドレー</TabsTrigger>
        <TabsTrigger value="hellowork">ハローワーク</TabsTrigger>
      </TabsList>

      <TabsContent value="indeed" className="mt-6">
        <IndeedOutput
          posting={output.indeed}
          thumbnailUrls={output.indeed.thumbnailUrls}
          editable={editable}
          jobId={jobId}
          onFieldChange={(field, value) => handleFieldChange("indeed", field, value)}
          onThumbnailsChange={(urls) => handleThumbnailsChange("indeed", urls)}
        />
      </TabsContent>

      <TabsContent value="airwork" className="mt-6">
        <AirWorkOutput
          posting={output.airwork}
          thumbnailUrls={output.airwork.thumbnailUrls}
          editable={editable}
          jobId={jobId}
          onFieldChange={(field, value) => handleFieldChange("airwork", field, value)}
          onThumbnailsChange={(urls) => handleThumbnailsChange("airwork", urls)}
        />
      </TabsContent>

      <TabsContent value="jobmedley" className="mt-6">
        <JobMedleyOutput
          posting={output.jobmedley}
          thumbnailUrls={output.jobmedley.thumbnailUrls}
          editable={editable}
          jobId={jobId}
          onFieldChange={(field, value) => handleFieldChange("jobmedley", field, value)}
          onThumbnailsChange={(urls) => handleThumbnailsChange("jobmedley", urls)}
        />
      </TabsContent>

      <TabsContent value="hellowork" className="mt-6">
        <HelloWorkOutput
          posting={output.hellowork}
          editable={editable}
          onFieldChange={(field, value) => handleFieldChange("hellowork", field, value)}
        />
      </TabsContent>
    </Tabs>
  );
}
