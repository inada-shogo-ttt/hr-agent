import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const auth = await requireRole(["admin", "publisher"]);
  if ("error" in auth) return auth.error;

  const { requestId } = await params;
  const body = await request.json();

  // PublishRequest を取得
  const { data: req } = await supabaseAdmin
    .from("PublishRequest")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!req) {
    return NextResponse.json({ error: "掲載依頼が見つかりません" }, { status: 404 });
  }

  // PublishMetrics に保存
  const { data: metrics, error } = await supabaseAdmin
    .from("PublishMetrics")
    .insert({
      jobId: req.jobId,
      platform: req.platform,
      publishedBy: auth.user.id,
      publishRequestId: requestId,
      startDate: body.startDate || req.actualStartDate || req.startDate || new Date().toISOString().split("T")[0],
      endDate: body.endDate || req.actualEndDate || req.endDate || null,
      impressions: body.impressions || null,
      clicks: body.clicks || null,
      applications: body.applications || null,
      cost: body.cost || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // PublishRequest を expired に
  await supabaseAdmin
    .from("PublishRequest")
    .update({ status: "expired", updatedAt: new Date().toISOString() })
    .eq("id", requestId);

  // StatusHistory 記録
  await supabaseAdmin.from("StatusHistory").insert({
    jobId: req.jobId,
    publishRequestId: requestId,
    fromStatus: "completed",
    toStatus: "expired",
    changedBy: auth.user.id,
    comment: "数値入力完了",
  });

  // 依頼者に通知
  const { data: job } = await supabaseAdmin
    .from("Job")
    .select("Office(name), JobType(name)")
    .eq("id", req.jobId)
    .single();

  const officeData = job?.Office as unknown as { name: string } | null;
  const jobTypeData = job?.JobType as unknown as { name: string } | null;
  const jobTitle = `${officeData?.name || ""} - ${jobTypeData?.name || ""}`;

  await createNotification(
    req.requestedBy,
    req.jobId,
    "metrics_entered",
    `「${jobTitle}」の掲載数値が入力されました`
  );

  // 全 PublishRequest が expired かチェック → awaiting_republish
  const { data: allRequests } = await supabaseAdmin
    .from("PublishRequest")
    .select("status")
    .eq("jobId", req.jobId);

  const allExpired = (allRequests || []).every((r) => r.status === "expired");

  if (allExpired) {
    await supabaseAdmin
      .from("Job")
      .update({ status: "awaiting_republish", updatedAt: new Date().toISOString() })
      .eq("id", req.jobId);

    await supabaseAdmin.from("StatusHistory").insert({
      jobId: req.jobId,
      fromStatus: "confirmed",
      toStatus: "awaiting_republish",
      changedBy: auth.user.id,
      comment: "全媒体の掲載期間が満了",
    });

    await createNotification(
      req.requestedBy,
      req.jobId,
      "all_expired",
      `「${jobTitle}」の全媒体の掲載が終了しました。再掲載が可能です`
    );
  }

  return NextResponse.json(metrics, { status: 201 });
}
