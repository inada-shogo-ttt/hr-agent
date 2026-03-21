"use client";

import { AllPlatformPostings } from "@/types/platform";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndeedOutput } from "./IndeedOutput";
import { AirWorkOutput } from "./AirWorkOutput";
import { JobMedleyOutput } from "./JobMedleyOutput";
import { HelloWorkOutput } from "./HelloWorkOutput";

interface ManuscriptOutputProps {
  output: AllPlatformPostings;
  editable?: boolean;
  onOutputChange?: (output: AllPlatformPostings) => void;
}

export function ManuscriptOutput({ output, editable, onOutputChange }: ManuscriptOutputProps) {
  const handleFieldChange = (platform: "indeed" | "airwork" | "jobmedley" | "hellowork", field: string, value: string) => {
    if (!onOutputChange) return;
    const updated = {
      ...output,
      [platform]: {
        ...output[platform],
        [field]: value,
      },
    };
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
          onFieldChange={(field, value) => handleFieldChange("indeed", field, value)}
        />
      </TabsContent>

      <TabsContent value="airwork" className="mt-6">
        <AirWorkOutput
          posting={output.airwork}
          thumbnailUrls={output.airwork.thumbnailUrls}
          editable={editable}
          onFieldChange={(field, value) => handleFieldChange("airwork", field, value)}
        />
      </TabsContent>

      <TabsContent value="jobmedley" className="mt-6">
        <JobMedleyOutput
          posting={output.jobmedley}
          thumbnailUrls={output.jobmedley.thumbnailUrls}
          editable={editable}
          onFieldChange={(field, value) => handleFieldChange("jobmedley", field, value)}
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
