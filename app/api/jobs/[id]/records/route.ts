import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/jobs/[id]/records — 履歴一覧
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  const { id } = await params;
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

  return NextResponse.json(record, { status: 201 });
}
