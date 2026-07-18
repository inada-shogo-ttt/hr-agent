import { PlanId, UsageKind } from "@/types/organization";

// クレジット消化の基準単価(全プラン共通)
export const BASE_UNIT_PRICE_YEN: Record<UsageKind, number> = {
  team_a: 800,
  team_b: 400,
};

export interface PlanDef {
  id: PlanId;
  name: string;
  monthlyFeeYen: number;
  includedCreditYen: number; // 月額に含まれるクレジット(円相当)
  overageUnitYen: Record<UsageKind, number>; // クレジット超過後の単価
  seatLimit: number | null; // null = 無制限
  stripePriceEnvKey: string; // Stripe Price ID を保持する環境変数名
}

export const PLANS: Record<PlanId, PlanDef> = {
  starter: {
    id: "starter",
    name: "スターター",
    monthlyFeeYen: 3000,
    includedCreditYen: 0,
    overageUnitYen: { team_a: 800, team_b: 400 },
    seatLimit: 1,
    stripePriceEnvKey: "STRIPE_PRICE_STARTER",
  },
  standard: {
    id: "standard",
    name: "スタンダード",
    monthlyFeeYen: 9800,
    includedCreditYen: 8000,
    overageUnitYen: { team_a: 700, team_b: 350 },
    seatLimit: 5,
    stripePriceEnvKey: "STRIPE_PRICE_STANDARD",
  },
  pro: {
    id: "pro",
    name: "プロ",
    monthlyFeeYen: 29800,
    includedCreditYen: 32000,
    overageUnitYen: { team_a: 600, team_b: 300 },
    seatLimit: null,
    stripePriceEnvKey: "STRIPE_PRICE_PRO",
  },
};

// プラン未契約の組織に許可するメンバー数(契約前の初期登録用)
export const UNCONTRACTED_SEAT_LIMIT = 1;

export function getPlan(planId: string | null): PlanDef | null {
  if (!planId) return null;
  return PLANS[planId as PlanId] ?? null;
}

export function getStripePriceId(planId: PlanId): string {
  const priceId = process.env[PLANS[planId].stripePriceEnvKey];
  if (!priceId) {
    throw new Error(`${PLANS[planId].stripePriceEnvKey} が設定されていません`);
  }
  return priceId;
}
