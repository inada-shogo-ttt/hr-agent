"use client";

import { useParams } from "next/navigation";
import { JobInputForm } from "@/app/components/forms/JobInputForm";

export default function JobNewPostingPage() {
  const params = useParams();
  const jobId = params.id as string;

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">新規求人原稿を作成</h1>
        <p className="text-muted-foreground mb-8">
          求人情報を入力してください。AIエージェントが自動で4媒体分の原稿を生成します。
        </p>

        <JobInputForm jobId={jobId} />
      </div>
    </main>
  );
}
