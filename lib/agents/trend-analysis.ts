import { anthropic, FAST_MODEL } from "@/lib/claude";
import { TrendAnalysisInput, TrendAnalysisOutput } from "./types";
import { extractJSON } from "./utils";

export async function runTrendAnalysisAgent(
  input: TrendAnalysisInput
): Promise<TrendAnalysisOutput> {
  const { trendResearch, jobPostingInput } = input;
  const { common } = jobPostingInput;

  const prompt = `あなたは求人広告の専門アナリストです。
以下のトレンド調査結果を分析し、効果的な求人原稿作成のための洞察を提供してください。

## 求人基本情報
業種: ${common.industry}
職種: ${common.jobTitle}
雇用形態: ${common.employmentType}
地域: ${common.prefecture} ${common.city}

## トレンド調査結果
${JSON.stringify(trendResearch, null, 2)}

## 分析タスク
1. 応募数が多い求人の人気要因を特定する
2. 効果的なキーワードを抽出する
3. キャッチコピーのパターンを分析する
4. タイトルの効果的な構成を特定する
5. この求人の差別化ポイントを考える

以下のJSON形式のみで回答してください（説明文不要）:
{
  "popularityFactors": ["人気要因1", "人気要因2", "人気要因3"],
  "recommendedKeywords": ["キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"],
  "recommendedCatchphrases": ["キャッチコピー案1", "キャッチコピー案2", "キャッチコピー案3"],
  "titlePatterns": ["タイトルパターン1", "タイトルパターン2"],
  "differentiationPoints": ["差別化ポイント1", "差別化ポイント2"],
  "targetAudienceInsights": "ターゲット読者への深い洞察（200字以内）"
}`;

  const message = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 4096,
    system: "あなたはJSON生成専門のアシスタントです。指定されたJSON形式のみを出力してください。JSONの前後に説明文やマークダウンコードブロックを付けないでください。純粋なJSONオブジェクトのみを返してください。重要: JSON文字列値の中に \" を使わないでください。引用には「」を使ってください。",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from trend-analysis agent");
  }

  return extractJSON<TrendAnalysisOutput>(content.text, "trend-analysis");
}
