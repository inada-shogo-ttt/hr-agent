import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ManuscriptAnalysisInput, ManuscriptAnalysisOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";

export async function runManuscriptAnalysisAgent(input: ManuscriptAnalysisInput): Promise<ManuscriptAnalysisOutput> {
  const { platform, existingPosting, metricsAnalysis, metricsIssues, historyContext, crossJobMemory } = input;

  const postingFields = Object.entries(existingPosting)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const metricsContext = metricsAnalysis
    ? `\n## 数値分析の結果\n${metricsAnalysis}\n\n## 数値から抽出された課題\n${metricsIssues?.map((i) => `- [${i.severity}] ${i.category}: ${i.description}`).join("\n") || "なし"}`
    : "\n## 数値データ\nなし（原稿の定性分析のみ実施）";

  const prompt = `あなたは求人原稿の分析エキスパートです。
既存の求人原稿を定性的に分析し、応募が伸びない原因を特定してください。

## 媒体
${platform}

## 既存原稿
${postingFields}
${metricsContext}

## 過去の改善履歴
${historyContext?.filter((h: any) => h.type === "team-b").map((h: any) => `- Round ${h.round}（${h.date}）: ${h.improvementCount || 0}箇所改善、課題${h.issuesFound || 0}件検出\n  分析: ${h.manuscriptAnalysis || "なし"}`).join("\n") || "なし（初回分析）"}

## 他の求人から学んだ分析パターン（クロスジョブメモリ）
以下は過去に他の求人で検出された頻出課題と効果的な改善方針です。同様の問題がないか確認してください。
${crossJobMemory || "なし（学習データ未蓄積）"}

## 分析観点
1. **タイトル・キャッチコピー**: 訴求力、差別化、ターゲット適合性
2. **仕事内容**: 具体性、魅力の伝え方、読みやすさ
3. **給与・待遇**: 競争力、表記の工夫
4. **応募ハードル**: 条件の厳しさ、応募しやすさ
5. **全体構成**: 情報の過不足、読みやすさ、CTA

以下のJSON形式のみで回答してください:
{
  "overallAssessment": "原稿の総合評価（300字以内）",
  "issues": [
    {
      "category": "カテゴリ（タイトル、仕事内容、給与・待遇、応募ハードル、構成）",
      "description": "具体的な課題",
      "severity": "high|medium|low",
      "recommendation": "改善の方向性"
    }
  ],
  "improvementPriorities": ["最優先で改善すべき点1", "2", "3"]
}`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from manuscript-analysis agent");
  }

  return extractJSON<ManuscriptAnalysisOutput>(content.text, "tb-manuscript-analysis");
}
