import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

type Action = "confirm" | "start_rewrite";

const TRANSITIONS: Record<
  string,
  { to: string; roles: string[]; action: Action }[]
> = {
  draft: [
    { to: "confirmed", roles: ["editor", "admin"], action: "confirm" },
  ],
  awaiting_republish: [
    { to: "draft", roles: ["editor", "admin"], action: "start_rewrite" },
  ],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { action } = (await request.json()) as { action: Action };

  const { data: job, error: jobError } = await supabaseAdmin
    .from("Job")
    .select("*")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "求人が見つかりません" }, { status: 404 });
  }

  const allowedTransitions = TRANSITIONS[job.status] || [];
  const transition = allowedTransitions.find(
    (t) => t.action === action && t.roles.includes(auth.user.role)
  );

  if (!transition) {
    return NextResponse.json(
      { error: "この操作は許可されていません" },
      { status: 403 }
    );
  }

  // 確定時はTeam A実行済みか確認
  if (action === "confirm") {
    const { data: records } = await supabaseAdmin
      .from("JobRecord")
      .select("id")
      .eq("jobId", id)
      .eq("type", "team-a")
      .limit(1);

    if (!records?.length) {
      return NextResponse.json(
        { error: "Team Aを実行してから確定してください" },
        { status: 400 }
      );
    }
  }

  await supabaseAdmin
    .from("Job")
    .update({ status: transition.to, updatedAt: new Date().toISOString() })
    .eq("id", id);

  await supabaseAdmin.from("StatusHistory").insert({
    jobId: id,
    fromStatus: job.status,
    toStatus: transition.to,
    changedBy: auth.user.id,
  });

  return NextResponse.json({ status: transition.to });
}
