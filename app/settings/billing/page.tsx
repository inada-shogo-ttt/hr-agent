"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PLANS } from "@/lib/billing/plans";
import { PlanId } from "@/types/organization";

interface BillingSummary {
  org: {
    name: string;
    code: string;
    billingExempt: boolean;
    plan: PlanId | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
  };
  usage: {
    teamACount: number;
    teamBCount: number;
    usedCreditYen: number;
    includedCreditYen: number;
    remainingCreditYen: number;
    overageYen: number;
  };
}

const yen = (n: number) => `¥${n.toLocaleString()}`;

export default function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/billing/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(plan: PlanId) {
    setSubmitting(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    toast.error(data.error || "手続きを開始できませんでした");
    setSubmitting(false);
  }

  async function handlePortal() {
    setSubmitting(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    toast.error(data.error || "契約管理画面を開けませんでした");
    setSubmitting(false);
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-8">読み込み中...</p>;
  }
  if (!summary) {
    return (
      <p className="text-gray-500 text-center py-8">
        契約情報を取得できませんでした
      </p>
    );
  }

  const { org, usage } = summary;
  const isActive = org.subscriptionStatus === "active" && org.plan;
  const currentPlan = org.plan ? PLANS[org.plan] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">プラン</h2>
        <p className="text-sm text-gray-500 mt-1">
          契約状況と今月の利用状況
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            現在の契約
            {org.billingExempt ? (
              <Badge className="bg-amber-100 text-amber-800">課金対象外</Badge>
            ) : isActive && currentPlan ? (
              <Badge className="bg-green-100 text-green-800">
                {currentPlan.name}
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600">未契約</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {org.billingExempt ? (
            <p className="text-sm text-gray-600">
              この組織は課金対象外です。すべての機能を無料でご利用いただけます。
            </p>
          ) : isActive && currentPlan ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">月額基本料金</p>
                  <p className="font-medium">{yen(currentPlan.monthlyFeeYen)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">今月の利用</p>
                  <p className="font-medium">
                    新規{usage.teamACount}回 / 改善{usage.teamBCount}回
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">残クレジット</p>
                  <p className="font-medium">
                    {yen(usage.remainingCreditYen)}
                    <span className="text-gray-400 text-xs">
                      {" "}/ {yen(usage.includedCreditYen)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">超過額(翌月請求)</p>
                  <p className="font-medium">{yen(usage.overageYen)}</p>
                </div>
              </div>
              {org.currentPeriodEnd && (
                <p className="text-xs text-gray-500">
                  次回更新日:{" "}
                  {new Date(org.currentPeriodEnd).toLocaleDateString("ja-JP")}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={submitting}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                契約内容の管理（プラン変更・解約・カード変更）
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              プラン未契約のため、原稿の新規作成・改善（Team A/B）はご利用いただけません。下記からプランをご契約ください。
            </p>
          )}
        </CardContent>
      </Card>

      {!org.billingExempt && !isActive && (
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.values(PLANS).map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-semibold">
                  {yen(plan.monthlyFeeYen)}
                  <span className="text-sm font-normal text-gray-500">
                    /月
                  </span>
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>
                    込みクレジット:{" "}
                    {plan.includedCreditYen > 0
                      ? `${yen(plan.includedCreditYen)}相当`
                      : "なし"}
                  </li>
                  <li>
                    超過単価: 新規{yen(plan.overageUnitYen.team_a)} / 改善
                    {yen(plan.overageUnitYen.team_b)}
                  </li>
                  <li>
                    ユーザー数:{" "}
                    {plan.seatLimit === null ? "無制限" : `${plan.seatLimit}名まで`}
                  </li>
                </ul>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={submitting}
                  onClick={() => handleCheckout(plan.id)}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                  このプランを契約
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
