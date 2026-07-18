import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/billing/stripe";
import { PLANS } from "@/lib/billing/plans";
import { PlanId } from "@/types/organization";

export const runtime = "nodejs";

function priceToPlan(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (process.env[plan.stripePriceEnvKey] === priceId) return plan.id;
  }
  return null;
}

function mapStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past_due";
  return "canceled";
}

function toIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

// サブスク状態を Organization に同期(Stripe のオブジェクト ID をキーに upsert する冪等な処理)
async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const orgId = subscription.metadata?.orgId;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const item = subscription.items.data[0];
  const updates = {
    stripeSubscriptionId: subscription.id,
    plan: priceToPlan(item?.price?.id),
    subscriptionStatus: mapStatus(subscription.status),
    currentPeriodStart: toIso(item?.current_period_start),
    currentPeriodEnd: toIso(item?.current_period_end),
    updatedAt: new Date().toISOString(),
  };

  const query = supabaseAdmin.from("Organization").update(updates);
  const { error } = orgId
    ? await query.eq("id", orgId)
    : await query.eq("stripeCustomerId", customerId);

  if (error) {
    console.error("[stripe-webhook] Organization 同期エラー:", error.message);
    throw error;
  }
}

// POST /api/stripe/webhook — Stripe からのイベント通知
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET が設定されていません" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "署名がありません" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "署名検証に失敗しました" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription =
            await getStripe().subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook] 処理エラー:", e);
    // Stripe に再送させる
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
