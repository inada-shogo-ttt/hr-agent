import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";
import { getOwnedJob } from "@/lib/org-scope";
import { applyTeamBResultToManuscript } from "@/lib/job-records";

// GET /api/jobs/[id]/records/[recordId] — 履歴1件の全文(一覧展開時の遅延取得用)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id, recordId } = await params;

  const owned = await getOwnedJob(id, auth.user, "read");
  if ("error" in owned) return owned.error;

  const { data: record, error } = await supabaseAdmin
    .from("JobRecord")
    .select("*")
    .eq("id", recordId)
    .eq("jobId", id)
    .single();

  if (error || !record) {
    return NextResponse.json({ error: "履歴が見つかりません" }, { status: 404 });
  }

  return NextResponse.json(record);
}

// PATCH /api/jobs/[id]/records/[recordId] — 原稿更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id, recordId } = await params;

  const owned = await getOwnedJob(id, auth.user, "write");
  if ("error" in owned) return owned.error;

  const body = await request.json();
  const { outputData } = body;

  const updates: Record<string, string> = { outputData: JSON.stringify(outputData) };

  // outputData 内の媒体別サムネイルを thumbnailUrls カラムにも同期する
  // （履歴プレビュー等はカラム側を参照するため、outputData だけ更新すると反映されない）
  if (outputData && typeof outputData === "object") {
    const platforms = ["indeed", "airwork", "jobmedley"] as const;
    const collected = platforms.flatMap((p) => {
      const urls = (outputData as Record<string, { thumbnailUrls?: unknown }>)[p]?.thumbnailUrls;
      return Array.isArray(urls) ? (urls as string[]) : [];
    });
    const hasPlatformThumbnails = platforms.some((p) =>
      Array.isArray((outputData as Record<string, { thumbnailUrls?: unknown }>)[p]?.thumbnailUrls)
    );
    if (hasPlatformThumbnails) {
      updates.thumbnailUrls = JSON.stringify(collected);
    }
  }

  const { data: record, error } = await supabaseAdmin
    .from("JobRecord")
    .update(updates)
    .eq("id", recordId)
    .eq("jobId", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Team B レコードの更新は最新 team-a レコード(=求人詳細が表示する現在原稿)にも反映する
  if (record?.type === "team-b" && record.platform && outputData && typeof outputData === "object") {
    await applyTeamBResultToManuscript(id, record.platform, outputData as Record<string, unknown>);
  }

  return NextResponse.json(record);
}
