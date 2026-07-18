import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { Organization } from "@/types/organization";

// 未請求の超過分を Stripe InvoiceItem として積む(翌月の請求書に自動合算)
// 失敗しても throw しない — UsageLog に未請求のまま残り、次回実行時に再試行される
export async function settlePendingOverages(org: Organization): Promise<void> {
  if (org.billingExempt || !org.stripeCustomerId || !isStripeConfigured()) {
    return;
  }

  const { data: pending } = await supabaseAdmin
    .from("UsageLog")
    .select("id, kind, overageAmountYen")
    .eq("orgId", org.id)
    .gt("overageAmountYen", 0)
    .is("stripeInvoiceItemId", null);

  if (!pending || pending.length === 0) return;

  const stripe = getStripe();
  for (const log of pending) {
    try {
      const item = await stripe.invoiceItems.create({
        customer: org.stripeCustomerId,
        currency: "jpy",
        amount: log.overageAmountYen,
        description:
          log.kind === "team_a"
            ? "Team A(新規原稿作成)超過利用"
            : "Team B(原稿改善)超過利用",
      });
      await supabaseAdmin
        .from("UsageLog")
        .update({ stripeInvoiceItemId: item.id })
        .eq("id", log.id);
    } catch (e) {
      console.error(
        "InvoiceItem 作成に失敗(次回実行時に再試行):",
        e instanceof Error ? e.message : e
      );
    }
  }
}
