import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

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

  // 全アクティブな PublishRequest に修正フラグを立てて通知を送信
  const user = await getAuthUser();
  const { data: activeRequests } = await supabaseAdmin
    .from("PublishRequest")
    .select("id, assignedTo, status")
    .eq("jobId", id)
    .in("status", ["pending", "publishing", "completed"]);

  if (activeRequests?.length && user) {
    // 全アクティブリクエストに修正フラグを立てる
    await supabaseAdmin
      .from("PublishRequest")
      .update({
        modificationPending: true,
        modificationRequestedAt: new Date().toISOString(),
      })
      .eq("jobId", id)
      .in("status", ["pending", "publishing", "completed"]);

    const { data: job } = await supabaseAdmin
      .from("Job")
      .select("Office(name), JobType(name)")
      .eq("id", id)
      .single();

    const officeData = job?.Office as unknown as { name: string } | null;
    const jobTypeData = job?.JobType as unknown as { name: string } | null;
    const jobTitle = `${officeData?.name || ""} - ${jobTypeData?.name || ""}`;

    const notified = new Set<string>();
    for (const req of activeRequests) {
      if (!notified.has(req.assignedTo)) {
        await createNotification(
          req.assignedTo,
          id,
          "manuscript_modified",
          `「${jobTitle}」の原稿が修正されました`,
          `${user.name}さんが原稿を修正しました。掲載内容の更新をお願いします`
        );
        notified.add(req.assignedTo);
      }
    }
  }

  return NextResponse.json(record);
}
