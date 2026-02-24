import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { BudgetOptimizationInput, BudgetOptimizationOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";

export async function runBudgetOptimizationAgent(input: BudgetOptimizationInput): Promise<BudgetOptimizationOutput> {
  const { metrics, existingPosting, metricsAnalysis } = input;

  const prompt = `あなたはIndeed求人広告の予算最適化の専門家です。
以下の数値データと分析結果に基づいて、最適な日額予算を推奨してください。

## 現在の数値
日額予算: ${metrics.dailyBudget ?? "不明"}円
表示回数: ${metrics.impressions ?? "不明"}
クリック数: ${metrics.clicks ?? "不明"}
応募数: ${metrics.applications ?? "不明"}
クリック率: ${metrics.ctr ?? "不明"}%
クリック単価: ${metrics.cpc ?? "不明"}円
合計利用予算: ${metrics.totalBudgetUsed ?? "不明"}円

## 求人情報
職種: ${existingPosting.jobTitle || "不明"}
勤務地: ${existingPosting.location || "不明"}

## 数値分析サマリー
${metricsAnalysis.summary}

## 予算最適化の考え方
- 日額予算500〜2,000円/日が一般的なレンジ
- CTRが低い場合: まず原稿改善を優先し、予算は維持or微増
- CTRが高く応募率も高い場合: 予算増加で表示回数を増やす
- CPCが高すぎる場合: 予算配分の見直しを推奨

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
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from budget-optimization agent");
  }

  return extractJSON<BudgetOptimizationOutput>(content.text, "tb-budget-optimization");
}
