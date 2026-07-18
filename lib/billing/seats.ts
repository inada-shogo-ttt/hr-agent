import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPlan, UNCONTRACTED_SEAT_LIMIT } from "@/lib/billing/plans";
import { Organization } from "@/types/organization";

export function getSeatLimit(org: Organization): number | null {
  if (org.billingExempt) return null;
  const plan = getPlan(org.plan);
  if (!plan) return UNCONTRACTED_SEAT_LIMIT;
  return plan.seatLimit;
}

// メンバー追加前の人数上限チェック
export async function checkSeatAvailable(
  org: Organization
): Promise<{ ok: true } | { ok: false; message: string }> {
  const limit = getSeatLimit(org);
  if (limit === null) return { ok: true };

  const { count } = await supabaseAdmin
    .from("User")
    .select("id", { count: "exact", head: true })
    .eq("orgId", org.id);

  if ((count ?? 0) >= limit) {
    return {
      ok: false,
      message: `この組織のユーザー数上限(${limit}名)に達しています。プランのアップグレードが必要です`,
    };
  }
  return { ok: true };
}
