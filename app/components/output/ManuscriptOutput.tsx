"use client";

import { AllPlatformPostings } from "@/types/platform";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndeedOutput } from "./IndeedOutput";
import { AirWorkOutput } from "./AirWorkOutput";
import { JobMedleyOutput } from "./JobMedleyOutput";

interface ManuscriptOutputProps {
  output: AllPlatformPostings;
}

export function ManuscriptOutput({ output }: ManuscriptOutputProps) {
  return (
    <Tabs defaultValue="indeed">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="indeed">Indeed</TabsTrigger>
        <TabsTrigger value="airwork">AirWork</TabsTrigger>
        <TabsTrigger value="jobmedley">JobMedley</TabsTrigger>
      </TabsList>

      <TabsContent value="indeed" className="mt-6">
        <IndeedOutput posting={output.indeed} thumbnailUrls={output.thumbnailUrls} />
      </TabsContent>

      <TabsContent value="airwork" className="mt-6">
        <AirWorkOutput posting={output.airwork} thumbnailUrls={output.thumbnailUrls} />
      </TabsContent>

      <TabsContent value="jobmedley" className="mt-6">
        <JobMedleyOutput posting={output.jobmedley} />
      </TabsContent>
    </Tabs>
  );
}
