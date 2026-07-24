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

// 2026-07 改定: 全プランにクレジットを含め「月額＋都度課金の二重払い感」を解消。
// スタンダードを推奨プラン、プロは「クレジット額 ≧ 月額」の実質単価引き下げ枠とする。
// ※ 金額変更時は Stripe に新しい Price を作成し、対応する環境変数を差し替えること
export const PLANS: Record<PlanId, PlanDef> = {
  starter: {
    id: "starter",
    name: "ライト",
    monthlyFeeYen: 4980,
    includedCreditYen: 2400, // 新規3回分
    overageUnitYen: { team_a: 800, team_b: 400 },
    seatLimit: 1,
    stripePriceEnvKey: "STRIPE_PRICE_STARTER",
  },
  standard: {
    id: "standard",
    name: "スタンダード",
    monthlyFeeYen: 14800,
    includedCreditYen: 9600, // 新規12回分
    overageUnitYen: { team_a: 700, team_b: 350 },
    seatLimit: 5,
    stripePriceEnvKey: "STRIPE_PRICE_STANDARD",
  },
  pro: {
    id: "pro",
    name: "プロ",
    monthlyFeeYen: 39800,
    includedCreditYen: 40000, // 新規50回分
    overageUnitYen: { team_a: 600, team_b: 300 },
    seatLimit: null,
    stripePriceEnvKey: "STRIPE_PRICE_PRO",
  },
};

// クレジット(円)を生成回数に換算する表示用ヘルパー。
// クレジット消化は BASE_UNIT_PRICE_YEN 基準のため、残回数もこの単価で割る
export function creditToRuns(creditYen: number): { teamA: number; teamB: number } {
  return {
    teamA: Math.floor(creditYen / BASE_UNIT_PRICE_YEN.team_a),
    teamB: Math.floor(creditYen / BASE_UNIT_PRICE_YEN.team_b),
  };
}

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
