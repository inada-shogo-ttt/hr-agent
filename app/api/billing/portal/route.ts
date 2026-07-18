import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { getStripe } from "@/lib/billing/stripe";
import { getOrganization } from "@/lib/billing/usage";

export const runtime = "nodejs";

// POST /api/billing/portal — 契約管理(プラン変更・カード変更・解約)用の Portal Session
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const org = await getOrganization(auth.user.orgId);
  if (!org?.stripeCustomerId) {
    return NextResponse.json(
      { error: "契約情報がありません" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${request.nextUrl.origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
