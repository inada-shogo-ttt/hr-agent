export type PlanId = "starter" | "standard" | "pro";

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface Organization {
  id: string;
  code: string; // 事業所ID(ログイン時に入力する値)
  name: string;
  billingExempt: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: PlanId | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UsageKind = "team_a" | "team_b";

export interface UsageLog {
  id: string;
  orgId: string;
  userId: string;
  kind: UsageKind;
  jobId: string | null;
  baseAmountYen: number;
  overageAmountYen: number;
  stripeInvoiceItemId: string | null;
  createdAt: string;
}
