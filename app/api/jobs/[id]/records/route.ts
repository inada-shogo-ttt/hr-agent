import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";
import { getOwnedJob } from "@/lib/org-scope";
import { applyTeamBResultToManuscript } from "@/lib/job-records";

// GET /api/jobs/[id]/records — 履歴一覧
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const owned = await getOwnedJob(id, auth.user, "read");
  if ("error" in owned) return owned.error;

  const { data: records, error } = await supabase
    .from("JobRecord")
    .select("*")
    .eq("jobId", id)
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(records);
}

// POST /api/jobs/[id]/records — 履歴追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const owned = await getOwnedJob(id, auth.user, "write");
  if ("error" in owned) return owned.error;

  const body = await request.json();
  const { type, platform, inputData, outputData, metricsData, thumbnailUrls } = body;

  const { data: record, error } = await supabase
    .from("JobRecord")
    .insert({
      id: crypto.randomUUID(),
      jobId: id,
      type,
      platform,
      inputData: inputData ? JSON.stringify(inputData) : null,
      outputData: outputData ? JSON.stringify(outputData) : null,
      metricsData: metricsData ? JSON.stringify(metricsData) : null,
      thumbnailUrls: thumbnailUrls ? JSON.stringify(thumbnailUrls) : null,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Team B の改善結果は最新 team-a レコード(=求人詳細が表示する現在原稿)にも反映する
  if (type === "team-b" && platform && outputData && typeof outputData === "object") {
    await applyTeamBResultToManuscript(id, platform, outputData as Record<string, unknown>);
  }

  return NextResponse.json(record, { status: 201 });
}
