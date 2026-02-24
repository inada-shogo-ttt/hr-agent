import Anthropic from "@anthropic-ai/sdk";
import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { TrendResearchInput, TrendResearchOutput, TrendResearchResult } from "./types";
import { extractJSON } from "./utils";

export async function runTrendResearchAgent(
  input: TrendResearchInput
): Promise<TrendResearchOutput> {
  const { industry, jobCategory, prefecture, employmentType } = input;

  const searchQueries = [
    `${prefecture} ${jobCategory} 求人 人気 ${employmentType}`,
    `${industry} ${jobCategory} 採用 トレンド 2025`,
    `${jobCategory} 求人 タイトル 応募数 多い`,
  ];

  const results: TrendResearchResult[] = [];

  // web_search ツールを使用してトレンド調査
  for (const query of searchQueries) {
    try {
      const message = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 2048,
        tools: [
          {
            type: "web_search_20250305" as "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: [
          {
            role: "user",
            content: `以下の求人情報について、最新のトレンドを調査してください。

検索クエリ: "${query}"

調査ポイント:
1. 人気の求人タイトル・キャッチコピーのパターン
2. 応募数が多い求人の特徴
3. 給与レンジの相場
4. よく使われるキーワード
5. 訴求されている福利厚生・待遇

調査結果を以下のJSON形式でまとめてください:
{
  "searchQuery": "${query}",
  "findings": "調査内容の要約（300字以内）",
  "topTitles": ["タイトル例1", "タイトル例2", "タイトル例3"],
  "popularKeywords": ["キーワード1", "キーワード2", "キーワード3"],
  "salaryRange": "給与相場の説明",
  "trendingBenefits": ["福利厚生1", "福利厚生2"]
}`,
          },
        ],
      });

      // レスポンスからJSONを抽出
      let resultText = "";
      for (const block of message.content) {
        if (block.type === "text") {
          resultText += block.text;
        }
      }

      try {
        const result = extractJSON<TrendResearchResult>(resultText, "trend-research/search");
        results.push(result);
      } catch {
        results.push({
          searchQuery: query,
          findings: resultText.slice(0, 300),
          topTitles: [],
          popularKeywords: [],
          salaryRange: "調査中",
          trendingBenefits: [],
        });
      }
    } catch (error) {
      console.error(`[trend-research] Error for query "${query}":`, error);
      // web_searchが使えない場合のフォールバック
      results.push(await getFallbackTrendData(query, industry, jobCategory, prefecture));
    }
  }

  // 結果がない場合はフォールバック
  if (results.length === 0) {
    results.push(await getFallbackTrendData(searchQueries[0], industry, jobCategory, prefecture));
  }

  // サマリーを生成
  const summaryMessage = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `以下のトレンド調査結果を200字以内でサマリーしてください:
${JSON.stringify(results, null, 2)}

サマリーのみを出力してください。`,
      },
    ],
  });

  const summaryContent = summaryMessage.content[0];
  const summary = summaryContent.type === "text" ? summaryContent.text : "トレンド調査完了";

  return { results, summary };
}

async function getFallbackTrendData(
  query: string,
  industry: string,
  jobCategory: string,
  prefecture: string
): Promise<TrendResearchResult> {
  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${prefecture}の${industry}業界における${jobCategory}の求人トレンドについて、あなたの知識に基づいて以下のJSON形式で回答してください:
{
  "searchQuery": "${query}",
  "findings": "業界・職種のトレンドの要約（200字以内）",
  "topTitles": ["人気タイトル例1", "人気タイトル例2", "人気タイトル例3"],
  "popularKeywords": ["キーワード1", "キーワード2", "キーワード3", "キーワード4"],
  "salaryRange": "給与相場の説明",
  "trendingBenefits": ["注目の福利厚生1", "注目の福利厚生2", "注目の福利厚生3"]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return {
      searchQuery: query,
      findings: `${industry}業界の${jobCategory}求人のトレンド情報`,
      topTitles: [],
      popularKeywords: [],
      salaryRange: "要確認",
      trendingBenefits: [],
    };
  }

  try {
    return extractJSON<TrendResearchResult>(content.text, "trend-research/fallback");
  } catch {
    return {
      searchQuery: query,
      findings: content.text.slice(0, 200),
      topTitles: [],
      popularKeywords: [],
      salaryRange: "要確認",
      trendingBenefits: [],
    };
  }
}
