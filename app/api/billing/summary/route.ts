import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";
import { getPlan } from "@/lib/billing/plans";
import { getOrganization } from "@/lib/billing/usage";

export const runtime = "nodejs";

// GET /api/billing/summary — 自組織の契約状況と今期の利用状況
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const org = await getOrganization(auth.user.orgId);
  if (!org) {
    return NextResponse.json({ error: "組織が見つかりません" }, { status: 404 });
  }

  let query = supabaseAdmin
    .from("UsageLog")
    .select("kind, baseAmountYen, overageAmountYen")
    .eq("orgId", org.id);
  if (org.currentPeriodStart) {
    query = query.gte("createdAt", org.currentPeriodStart);
  }
  const { data: logs } = await query;

  const rows = logs ?? [];
  const teamACount = rows.filter((r) => r.kind === "team_a").length;
  const teamBCount = rows.filter((r) => r.kind === "team_b").length;
  const usedCreditYen = rows.reduce((s, r) => s + (r.baseAmountYen ?? 0), 0);
  const overageYen = rows.reduce((s, r) => s + (r.overageAmountYen ?? 0), 0);
  const plan = getPlan(org.plan);
  const includedCreditYen = plan?.includedCreditYen ?? 0;

  return NextResponse.json({
    org: {
      name: org.name,
      code: org.code,
      billingExempt: org.billingExempt,
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      currentPeriodEnd: org.currentPeriodEnd,
    },
    usage: {
      teamACount,
      teamBCount,
      usedCreditYen,
      includedCreditYen,
      remainingCreditYen: Math.max(0, includedCreditYen - usedCreditYen),
      overageYen,
    },
  });
}
