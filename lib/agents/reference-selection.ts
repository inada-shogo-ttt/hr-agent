import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ReferenceSelectionInput, ReferenceSelectionOutput } from "./types";
import { extractJSON } from "./utils";

export async function runReferenceSelectionAgent(
  input: ReferenceSelectionInput
): Promise<ReferenceSelectionOutput> {
  const { trendAnalysis, jobPostingInput, userReferences } = input;
  const { common } = jobPostingInput;

  // ユーザー登録の成功原稿セクションを構築
  let userReferencesSection = "";
  if (userReferences && userReferences.length > 0) {
    const refsText = userReferences.map((ref) => {
      const fields = Object.entries(ref.postingData)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return `【${ref.title}】（${ref.platform} / 実績: ${ref.performance || "不明"}）\n${fields}`;
    }).join("\n\n");

    userReferencesSection = `
## ユーザー登録の成功原稿（実績あり）
以下はユーザーが登録した応募実績のある求人原稿です。
構成・表現・訴求ポイントの出し方を積極的に参考にしてください。

${refsText}
`;
  }

  const prompt = `あなたは求人原稿の専門ライターです。
以下の分析結果をもとに、原稿作成の参考になる優良事例を選定し、執筆ガイドラインを作成してください。
${userReferencesSection}
## 求人基本情報
業種: ${common.industry}
職種: ${common.jobTitle}
雇用形態: ${common.employmentType}
地域: ${common.prefecture} ${common.city}
給与: ${common.salaryType} ${common.salaryMin}円〜

## トレンド分析結果
人気要因: ${trendAnalysis.popularityFactors.join(", ")}
推奨キーワード: ${trendAnalysis.recommendedKeywords.join(", ")}
キャッチコピー案: ${trendAnalysis.recommendedCatchphrases.join(", ")}
差別化ポイント: ${trendAnalysis.differentiationPoints.join(", ")}
ターゲット: ${trendAnalysis.targetAudienceInsights}

## タスク
1. 3つの媒体（Indeed / AirWork / JobMedley）それぞれに適した参考原稿パターンを提示する
2. 効果的な原稿の構成と文体のガイドラインを作成する
3. 各媒体の特性に合わせた表現スタイルを定義する

以下のJSON形式のみで回答してください（説明文不要）:
{
  "selectedReferences": [
    {
      "platform": "Indeed",
      "title": "参考タイトル例",
      "catchphrase": "参考キャッチコピー例",
      "appealPoints": "参考アピールポイント例",
      "structure": "原稿構成の説明",
      "whyEffective": "なぜ効果的か（100字以内）"
    },
    {
      "platform": "AirWork",
      "title": "参考タイトル例",
      "catchphrase": "参考キャッチコピー例",
      "appealPoints": "参考アピールポイント例",
      "structure": "原稿構成の説明",
      "whyEffective": "なぜ効果的か（100字以内）"
    },
    {
      "platform": "JobMedley",
      "title": "参考訴求文タイトル例",
      "catchphrase": "参考訴求文例",
      "appealPoints": "参考アピールポイント例",
      "structure": "原稿構成の説明",
      "whyEffective": "なぜ効果的か（100字以内）"
    }
  ],
  "writingGuidelines": "原稿全体のライティングガイドライン（300字以内）",
  "toneAndStyle": "文体・トーンの定義（200字以内）"
}`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from reference-selection agent");
  }

  return extractJSON<ReferenceSelectionOutput>(content.text, "reference-selection");
}
