import { anthropic, FAST_MODEL } from "@/lib/claude";
import { MetricsAnalysisInput, MetricsAnalysisOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";

export async function runMetricsAnalysisAgent(input: MetricsAnalysisInput): Promise<MetricsAnalysisOutput> {
  const { platform, metrics, existingPosting, historyContext, crossJobMemory } = input;

  const metricsStr = Object.entries(metrics)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const indeedBenchmarks = `
## 業界ベンチマーク（Indeed）
- クリック率(CTR): 1.5〜3.0%が平均、3.0%以上が優秀
- 応募開始率: 5〜10%が平均
- 応募完了率: 30〜60%が平均
- クリック単価(CPC): 職種により50〜300円`;

  const airworkBenchmarks = `
## 業界ベンチマーク（AirWork）
- クリック率(CTR): 1.0〜2.5%が平均
- 応募完了率: 3〜8%が平均
- クリック単価(CPC): 職種により100〜500円`;

  const prompt = `あなたは求人広告の数値分析の専門家です。
以下の掲載数値を分析し、定量的な課題を抽出してください。

## 媒体
${platform}

## 掲載数値
${metricsStr}

## 求人タイトル
${existingPosting.jobTitle || "不明"}

${platform === "indeed" ? indeedBenchmarks : airworkBenchmarks}

## 過去の数値データ
${historyContext?.filter((h: any) => h.type === "team-b" && h.metrics).map((h: any) => `- Round ${h.round}（${h.date}）: ${JSON.stringify(h.metrics)}`).join("\n") || "なし（初回分析）"}

## 他の求人から学んだ改善パターン（クロスジョブメモリ）
以下は過去に他の求人で効果があった数値改善パターンです。該当する課題があれば参考にしてください。
${crossJobMemory || "なし（学習データ未蓄積）"}

## タスク
1. 各指標を業界ベンチマークと比較してください
2. パフォーマンスが低い指標を特定し、課題を明確にしてください
3. 数値から推測される問題点（表示→クリック→応募のファネル分析）を記述してください
4. 過去データがある場合、数値の推移（改善傾向 or 悪化傾向）も分析してください

以下のJSON形式のみで回答してください:
{
  "summary": "数値分析の総合所見（300字以内）",
  "issues": [
    {
      "category": "カテゴリ（例: クリック率, 応募率）",
      "description": "課題の説明",
      "severity": "high|medium|low",
      "recommendation": "改善の方向性"
    }
  ],
  "benchmarks": [
    {
      "metric": "指標名",
      "current": "現在値",
      "benchmark": "ベンチマーク値",
      "status": "above|below|average"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from metrics-analysis agent");
  }

  return extractJSON<MetricsAnalysisOutput>(content.text, "tb-metrics-analysis");
}
