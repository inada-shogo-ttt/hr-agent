import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin", "editor", "reviewer", "publisher"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("PublishMetrics")
    .select("*")
    .eq("jobId", id)
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin", "publisher"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("PublishMetrics")
    .insert({
      jobId: id,
      platform: body.platform,
      publishedBy: auth.user.id,
      startDate: body.startDate,
      endDate: body.endDate || null,
      impressions: body.impressions || null,
      clicks: body.clicks || null,
      applications: body.applications || null,
      cost: body.cost || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 作成者に通知
  const { data: job } = await supabaseAdmin
    .from("Job")
    .select("createdBy, Office(name), JobType(name)")
    .eq("id", id)
    .single();

  if (job?.createdBy) {
    const officeData = job.Office as unknown as { name: string } | null;
    const jobTypeData = job.JobType as unknown as { name: string } | null;
    const officeName = officeData?.name || "";
    const jobTypeName = jobTypeData?.name || "";
    await createNotification(
      job.createdBy,
      id,
      "metrics_entered",
      `「${officeName} - ${jobTypeName}」の掲載数値が入力されました`,
      `${body.platform} の数値が${auth.user.name}さんによって登録されました`
    );
  }

  return NextResponse.json(data, { status: 201 });
}
