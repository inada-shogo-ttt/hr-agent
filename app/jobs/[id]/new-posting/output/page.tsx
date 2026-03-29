"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AllPlatformPostings } from "@/types/platform";
import { ManuscriptOutput } from "@/app/components/output/ManuscriptOutput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Clock, Save, CheckCircle } from "lucide-react";

export default function JobOutputPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const [output, setOutput] = useState<AllPlatformPostings | null>(null);
  const [editedOutput, setEditedOutput] = useState<AllPlatformPostings | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestOutputRef = useRef<AllPlatformPostings | null>(null);

  // DB から最新レコードを取得するフォールバック
  async function loadFromDB(): Promise<{ output: AllPlatformPostings; recordId: string } | null> {
    try {
      const res = await fetch(`/api/jobs/${jobId}/records`);
      if (!res.ok) return null;
      const records = await res.json();
      const teamARecord = records.find((r: { type: string }) => r.type === "team-a");
      if (!teamARecord?.outputData) return null;
      const parsed = typeof teamARecord.outputData === "string"
        ? JSON.parse(teamARecord.outputData)
        : teamARecord.outputData;
      return { output: parsed as AllPlatformPostings, recordId: teamARecord.id };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    async function loadData() {
      // まず sessionStorage を試す
      let parsed: AllPlatformPostings | null = null;
      let rid: string | null = null;

      const stored = sessionStorage.getItem("finalOutput");
      const storedRecordId = sessionStorage.getItem("teamARecordId");

      if (stored) {
        try {
          parsed = JSON.parse(stored) as AllPlatformPostings;
          rid = storedRecordId;
        } catch {
          parsed = null;
        }
      }

      // sessionStorage がない or パース失敗 → DB から取得
      if (!parsed) {
        const dbData = await loadFromDB();
        if (dbData) {
          parsed = dbData.output;
          rid = dbData.recordId;
        }
      }

      if (!parsed) {
        router.replace(`/jobs/${jobId}/new-posting`);
        return;
      }

      if (rid) setRecordId(rid);

      // サムネイルURLはSupabase StorageのURLとして出力データ内に含まれている
      setOutput({ ...parsed });
      setEditedOutput({ ...parsed });
    }

    loadData();
  }, [router, jobId]);

  // 自動保存（2秒デバウンス）
  const autoSave = useCallback(async (data: AllPlatformPostings) => {
    if (!recordId) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/jobs/${jobId}/records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputData: data }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
      }
    } catch {
      setSaveStatus("idle");
    }
  }, [jobId, recordId]);

  function handleOutputChange(newOutput: AllPlatformPostings) {
    setEditedOutput(newOutput);
    latestOutputRef.current = newOutput;

    // デバウンス自動保存
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (latestOutputRef.current) {
        autoSave(latestOutputRef.current);
      }
    }, 2000);
  }

  // 手動保存
  const handleManualSave = async () => {
    if (!editedOutput || !recordId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await autoSave(editedOutput);
  };

  if (!output || !editedOutput) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          読み込み中...
        </div>
      </main>
    );
  }

  const generatedAt = new Date(output.generatedAt).toLocaleString("ja-JP");

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">求人原稿 完成</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                4媒体対応
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              生成日時: {generatedAt}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
              {saveStatus === "saving" && (
                <>
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  保存中...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  保存済み
                </>
              )}
            </div>
            {recordId && (
              <Button
                onClick={handleManualSave}
                variant="default"
                disabled={saveStatus === "saving"}
                size="sm"
              >
                <Save className="w-4 h-4 mr-1.5" />
                保存
              </Button>
            )}
            <Link href={`/jobs/${jobId}`}>
              <Button variant="outline" size="sm">
                求人詳細へ
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">
                サムネイル画像: インディード {editedOutput.indeed?.thumbnailUrls?.length ?? 0}枚 / エアワーク {editedOutput.airwork?.thumbnailUrls?.length ?? 0}枚 / ジョブメドレー {editedOutput.jobmedley?.thumbnailUrls?.length ?? 0}枚
              </span>
            </div>
          </CardContent>
        </Card>

        <ManuscriptOutput
          output={editedOutput}
          editable={true}
          jobId={jobId}
          onOutputChange={handleOutputChange}
        />
      </div>
    </main>
  );
}
