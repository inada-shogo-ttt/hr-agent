import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// PATCH /api/jobs/[id]/records/[recordId] — 原稿更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { id, recordId } = await params;
  const body = await request.json();
  const { outputData } = body;

  const { data: record, error } = await supabaseAdmin
    .from("JobRecord")
    .update({ outputData: JSON.stringify(outputData) })
    .eq("id", recordId)
    .eq("jobId", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(record);
}
