import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { getStripe } from "@/lib/billing/stripe";
import { getStripePriceId, PLANS } from "@/lib/billing/plans";
import { getOrganization } from "@/lib/billing/usage";
import { PlanId } from "@/types/organization";

export const runtime = "nodejs";

// POST /api/billing/checkout — プラン契約用の Stripe Checkout Session を作成
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const planId = body.plan as PlanId;
  if (!PLANS[planId]) {
    return NextResponse.json({ error: "無効なプランです" }, { status: 400 });
  }

  const org = await getOrganization(auth.user.orgId);
  if (!org) {
    return NextResponse.json({ error: "組織が見つかりません" }, { status: 404 });
  }
  if (org.billingExempt) {
    return NextResponse.json(
      { error: "この組織は課金対象外です" },
      { status: 400 }
    );
  }
  if (org.subscriptionStatus === "active") {
    return NextResponse.json(
      { error: "契約中のプランがあります。プラン変更は「契約内容の管理」から行ってください" },
      { status: 400 }
    );
  }

  const stripe = getStripe();

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: `${org.name} (${org.code})`,
      email: auth.user.email,
      metadata: { orgId: org.id },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("Organization")
      .update({ stripeCustomerId: customerId, updatedAt: new Date().toISOString() })
      .eq("id", org.id);
  }

  const origin = request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripePriceId(planId), quantity: 1 }],
    subscription_data: { metadata: { orgId: org.id } },
    metadata: { orgId: org.id, plan: planId },
    success_url: `${origin}/settings/billing?checkout=success`,
    cancel_url: `${origin}/settings/billing?checkout=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
