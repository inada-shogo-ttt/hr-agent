import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const PLATFORM_LABELS: Record<string, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { requestId } = await params;

  const { data: req, error } = await supabaseAdmin
    .from("PublishRequest")
    .select(`
      *,
      assignedUser:User!assignedTo(id, name),
      requestedUser:User!requestedBy(id, name)
    `)
    .eq("id", requestId)
    .single();

  if (error || !req) {
    return NextResponse.json({ error: "掲載依頼が見つかりません" }, { status: 404 });
  }

  // Job の原稿データを取得
  const { data: job } = await supabaseAdmin
    .from("Job")
    .select("*, Office(name), JobType(name, color), EmploymentType(name)")
    .eq("id", req.jobId)
    .single();

  const { data: records } = await supabaseAdmin
    .from("JobRecord")
    .select("*")
    .eq("jobId", req.jobId)
    .order("createdAt", { ascending: false });

  // Team A レコードからプラットフォーム別の最新原稿を抽出（サーバー側で確実にパース）
  let manuscriptData: Record<string, unknown> | null = null;
  let manuscriptThumbnails: string[] = [];
  const teamARecord = (records || []).find((r) => r.type === "team-a");
  if (teamARecord?.outputData) {
    try {
      const parsed = typeof teamARecord.outputData === "string"
        ? JSON.parse(teamARecord.outputData)
        : teamARecord.outputData;
      if (parsed[req.platform]) {
        const { thumbnailUrls, ...rest } = parsed[req.platform];
        manuscriptData = rest;
        manuscriptThumbnails = thumbnailUrls || [];
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    ...req,
    job: job
      ? {
          ...job,
          officeName: (job.Office as unknown as { name: string } | null)?.name || "",
          jobTypeName: (job.JobType as unknown as { name: string } | null)?.name || "",
          employmentTypeName: (job.EmploymentType as unknown as { name: string } | null)?.name || "",
        }
      : null,
    records: records || [],
    manuscriptData,
    manuscriptThumbnails,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { requestId } = await params;
  const { action } = await request.json();

  const { data: req } = await supabaseAdmin
    .from("PublishRequest")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!req) {
    return NextResponse.json({ error: "掲載依頼が見つかりません" }, { status: 404 });
  }

  // ステータス遷移
  const transitions: Record<string, { to: string; updates: Record<string, unknown> }> = {
    "pending:start_publishing": {
      to: "publishing",
      updates: { actualStartDate: new Date().toISOString().split("T")[0] },
    },
    "publishing:complete": {
      to: "completed",
      updates: { actualEndDate: new Date().toISOString().split("T")[0] },
    },
    "completed:expire": {
      to: "expired",
      updates: {},
    },
  };

  // 修正完了アクション（ステータス遷移とは別）
  if (action === "complete_modification") {
    await supabaseAdmin
      .from("PublishRequest")
      .update({ modificationPending: false, updatedAt: new Date().toISOString() })
      .eq("id", requestId);

    // 依頼者に通知
    const { data: job } = await supabaseAdmin
      .from("Job")
      .select("Office(name), JobType(name)")
      .eq("id", req.jobId)
      .single();

    const officeN = (job?.Office as unknown as { name: string } | null)?.name || "";
    const jobTypeN = (job?.JobType as unknown as { name: string } | null)?.name || "";
    const platformLabel = PLATFORM_LABELS[req.platform] || req.platform;

    await createNotification(
      req.requestedBy,
      req.jobId,
      "publish_completed",
      `「${officeN} - ${jobTypeN}」の${platformLabel}の修正が完了しました`,
      `${auth.user.name}さんが修正を反映しました`
    );

    return NextResponse.json({ success: true });
  }

  const key = `${req.status}:${action}`;
  const transition = transitions[key];

  if (!transition) {
    return NextResponse.json({ error: "この操作は許可されていません" }, { status: 400 });
  }

  await supabaseAdmin
    .from("PublishRequest")
    .update({
      status: transition.to,
      ...transition.updates,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", requestId);

  // StatusHistory 記録
  await supabaseAdmin.from("StatusHistory").insert({
    jobId: req.jobId,
    publishRequestId: requestId,
    fromStatus: req.status,
    toStatus: transition.to,
    changedBy: auth.user.id,
  });

  // Job タイトルを取得して通知
  const { data: job } = await supabaseAdmin
    .from("Job")
    .select("Office(name), JobType(name)")
    .eq("id", req.jobId)
    .single();

  const officeData = job?.Office as unknown as { name: string } | null;
  const jobTypeData = job?.JobType as unknown as { name: string } | null;
  const jobTitle = `${officeData?.name || ""} - ${jobTypeData?.name || ""}`;
  const platformLabel = PLATFORM_LABELS[req.platform] || req.platform;

  // 依頼者に通知
  if (action === "start_publishing") {
    await createNotification(
      req.requestedBy,
      req.jobId,
      "publish_started",
      `「${jobTitle}」の${platformLabel}掲載が開始されました`
    );
  } else if (action === "complete") {
    await createNotification(
      req.requestedBy,
      req.jobId,
      "publish_completed",
      `「${jobTitle}」の${platformLabel}掲載が完了しました`
    );
  } else if (action === "expire") {
    // 全 PublishRequest が expired かチェック
    const { data: allRequests } = await supabaseAdmin
      .from("PublishRequest")
      .select("status")
      .eq("jobId", req.jobId)
      .neq("status", "expired");

    // このリクエスト自身はまだ更新前の状態で返る可能性があるので、
    // 現在のリクエストを除外して確認
    const remaining = (allRequests || []).filter(
      (r) => r.status !== "expired"
    );

    if (remaining.length === 0) {
      // 全て expired → Job を awaiting_republish に
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
  }

  return NextResponse.json({ status: transition.to });
}
