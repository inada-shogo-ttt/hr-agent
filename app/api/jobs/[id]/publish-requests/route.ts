import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin", "editor", "publisher"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("PublishRequest")
    .select(`*, assignedUser:User!assignedTo(id, name)`)
    .eq("jobId", id)
    .order("createdAt", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin", "editor"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { defaultAssignedTo, platforms } = await request.json();

  // Job が confirmed か確認
  const { data: job } = await supabaseAdmin
    .from("Job")
    .select("status, Office(name), JobType(name)")
    .eq("id", id)
    .single();

  if (!job || job.status !== "confirmed") {
    return NextResponse.json(
      { error: "確定済みの求人のみ掲載依頼できます" },
      { status: 400 }
    );
  }

  const requests = platforms.map(
    (p: { platform: string; assignedTo?: string; startDate?: string; endDate?: string }) => ({
      jobId: id,
      platform: p.platform,
      assignedTo: p.assignedTo || defaultAssignedTo,
      requestedBy: auth.user.id,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
    })
  );

  const { data, error } = await supabaseAdmin
    .from("PublishRequest")
    .insert(requests)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 各担当者に通知
  const officeData = job.Office as unknown as { name: string } | null;
  const jobTypeData = job.JobType as unknown as { name: string } | null;
  const jobTitle = `${officeData?.name || ""} - ${jobTypeData?.name || ""}`;

  const PLATFORM_LABELS: Record<string, string> = {
    indeed: "Indeed",
    airwork: "AirWork",
    jobmedley: "JobMedley",
    hellowork: "ハローワーク",
  };

  for (const req of data || []) {
    await createNotification(
      req.assignedTo,
      id,
      "publish_requested",
      `「${jobTitle}」の掲載依頼（${PLATFORM_LABELS[req.platform] || req.platform}）`,
      `${auth.user.name}さんから掲載依頼が届きました`
    );
  }

  return NextResponse.json(data, { status: 201 });
}
