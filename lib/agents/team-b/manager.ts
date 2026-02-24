import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { TeamBManagerInput, TeamBManagerOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";

export async function runTeamBManagerAgent(input: TeamBManagerInput): Promise<TeamBManagerOutput> {
  const { platform, existingPosting, hasMetrics } = input;

  const postingFields = Object.entries(existingPosting)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `あなたは求人原稿改善の専門マネージャーです。
既存の求人原稿を分析し、改善に向けた初期評価を行ってください。

## 媒体
${platform}

## 数値データの有無
${hasMetrics ? "あり（後続の数値分析エージェントで詳細分析します）" : "なし（原稿の定性分析のみ実施）"}

## 既存原稿
${postingFields}

## タスク
1. 媒体を確認してください
2. 原稿の全体的な品質を評価してください（good/average/poor）
3. 改善が必要な点を初期観察として挙げてください

以下のJSON形式のみで回答してください:
{
  "confirmedPlatform": "${platform}",
  "summary": "原稿の概要と初期評価（200字以内）",
  "postingQuality": "good|average|poor",
  "initialObservations": ["観察1", "観察2", "観察3"]
}`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from team-b manager agent");
  }

  return extractJSON<TeamBManagerOutput>(content.text, "tb-manager");
}
