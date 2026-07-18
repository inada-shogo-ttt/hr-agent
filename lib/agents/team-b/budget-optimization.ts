import { anthropic, FAST_MODEL } from "@/lib/claude";
import { BudgetOptimizationInput, BudgetOptimizationOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";

export async function runBudgetOptimizationAgent(input: BudgetOptimizationInput): Promise<BudgetOptimizationOutput> {
  const { metrics, existingPosting, metricsSummary } = input;

  const prompt = `あなたはIndeed求人広告の予算最適化の専門家です。
  応募数最大化を目的とし予算を選定してください。
以下の数値データに基づいて、最適な日額予算を推奨してください。

## 現在の数値
日額予算: ${metrics.dailyBudget ?? "不明"}円
表示回数: ${metrics.impressions ?? "不明"}
クリック数: ${metrics.clicks ?? "不明"}
応募数: ${metrics.applications ?? "不明"}
クリック率: ${metrics.ctr ?? "不明"}%
クリック単価: ${metrics.cpc ?? "不明"}円
合計利用予算: ${metrics.totalBudgetUsed ?? "不明"}円
掲載期間: ${metrics.postingStartDate ?? "不明"} 〜 ${metrics.postingEndDate ?? "不明"}${metrics.postingDays ? `（${metrics.postingDays}日間）` : ""}
日額費用（実績 = 合計費用÷掲載日数）: ${metrics.dailyCost ?? "不明"}円/日
応募単価（CPA）: ${metrics.cpa ?? "不明"}円

## 求人情報
職種: ${existingPosting.jobTitle || "不明"}
勤務地: ${existingPosting.location || "不明"}
${metricsSummary ? `\n## 数値分析サマリー（テキスト改善エージェント所見）\n${metricsSummary}` : ""}

## 予算最適化の考え方
- 日額予算1000〜2,000円/日が一般的なレンジ
- CTRが低い場合: まず原稿改善を優先し、予算は維持or微増
- CTRが高く応募率も高い場合: 予算増加で表示回数を増やす
- CPCが高すぎる場合: 予算配分の見直しを推奨
- 日額費用（実績）が日額予算を大きく下回る場合: 予算増額より先に表示・クリックの課題（原稿・キーワード）を疑う
- 応募単価（CPA）が高い場合: 予算を増やす前に応募率（CVR）の改善を優先する

以下のJSON形式のみで回答してください:
{
  "recommendation": {
    "currentDailyBudget": 現在の日額予算（数値）,
    "recommendedMin": 推奨日額予算下限（数値）,
    "recommendedMax": 推奨日額予算上限（数値）,
    "reasoning": "推奨理由（200字以内）",
    "expectedImpact": "期待される効果（100字以内）"
  }
}`;

  const message = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from budget-optimization agent");
  }

  return extractJSON<BudgetOptimizationOutput>(content.text, "tb-budget-optimization");
}
