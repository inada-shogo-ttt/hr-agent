import { supabaseAdmin } from "@/lib/supabase/admin";
import { BASE_UNIT_PRICE_YEN, getPlan } from "@/lib/billing/plans";
import { Organization, UsageKind } from "@/types/organization";

export async function getOrganization(
  orgId: string
): Promise<Organization | null> {
  const { data } = await supabaseAdmin
    .from("Organization")
    .select("*")
    .eq("id", orgId)
    .single();
  return (data as Organization) ?? null;
}

// Team A/B を実行できるか(課金免除 or 契約中)
export function canRunAgents(org: Organization): boolean {
  return org.billingExempt || org.subscriptionStatus === "active";
}

// 今期(currentPeriodStart 以降)のクレジット消化額を集計
export async function getUsedCreditYen(org: Organization): Promise<number> {
  let query = supabaseAdmin
    .from("UsageLog")
    .select("baseAmountYen")
    .eq("orgId", org.id);
  if (org.currentPeriodStart) {
    query = query.gte("createdAt", org.currentPeriodStart);
  }
  const { data } = await query;
  return (data ?? []).reduce((sum, row) => sum + (row.baseAmountYen ?? 0), 0);
}

export async function getRemainingCreditYen(
  org: Organization
): Promise<number> {
  const plan = getPlan(org.plan);
  if (!plan) return 0;
  const used = await getUsedCreditYen(org);
  return Math.max(0, plan.includedCreditYen - used);
}

// 実行成功時の課金記録。超過分の金額を返す(InvoiceItem 作成は呼び出し側)
export async function recordUsage(params: {
  org: Organization;
  userId: string;
  kind: UsageKind;
  jobId: string | null;
}): Promise<{ usageLogId: string | null; overageAmountYen: number }> {
  const { org, userId, kind, jobId } = params;
  const baseAmountYen = BASE_UNIT_PRICE_YEN[kind];

  let overageAmountYen = 0;
  if (!org.billingExempt) {
    const plan = getPlan(org.plan);
    const remaining = await getRemainingCreditYen(org);
    if (plan && remaining < baseAmountYen) {
      overageAmountYen = plan.overageUnitYen[kind];
    }
  }

  const { data, error } = await supabaseAdmin
    .from("UsageLog")
    .insert({
      orgId: org.id,
      userId,
      kind,
      jobId,
      baseAmountYen,
      overageAmountYen,
    })
    .select("id")
    .single();

  if (error) {
    console.error("UsageLog の記録に失敗:", error.message);
    return { usageLogId: null, overageAmountYen };
  }
  return { usageLogId: data.id, overageAmountYen };
}
