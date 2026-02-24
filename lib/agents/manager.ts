import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ManagerInput, ManagerOutput } from "./types";
import { extractJSON } from "./utils";

export async function runManagerAgent(input: ManagerInput): Promise<ManagerOutput> {
  const { jobPostingInput } = input;
  const { common } = jobPostingInput;

  const prompt = `あなたは求人原稿作成の専門マネージャーです。
以下の求人情報を分析し、原稿作成の要件を整理してください。

## 入力された求人情報
会社名: ${common.companyName}
業種: ${common.industry}
職種: ${common.jobTitle}
雇用形態: ${common.employmentType}
都道府県: ${common.prefecture}
市区町村: ${common.city}
給与: ${common.salaryType} ${common.salaryMin}円${common.salaryMax ? `〜${common.salaryMax}円` : ""}
勤務時間: ${common.workingHours}
仕事内容: ${common.jobDescription}
求める人材: ${common.requirements}
休暇・休日: ${common.holidays}
待遇・福利厚生: ${common.benefits}
アピールポイント: ${common.appealPoints || "未記入"}
ターゲット層: ${common.targetAudience || "未記入"}
競合優位性: ${common.competitiveAdvantage || "未記入"}

## タスク
1. 入力情報のバリデーションを行い、不足・問題点を特定してください
2. 求人原稿作成に向けた要件を整理してください
3. ターゲット読者と主要アピールポイントを明確にしてください

以下のJSON形式のみで回答してください（説明文不要）:
{
  "isValid": true,
  "issues": [],
  "summary": "求人情報の要約（200字以内）",
  "requirements": {
    "industry": "業種カテゴリ",
    "jobCategory": "職種カテゴリ",
    "targetAudience": "ターゲット読者の特徴",
    "keySellingPoints": ["セールスポイント1", "セールスポイント2"],
    "competitiveFactors": ["競合優位性1", "競合優位性2"]
  }
}`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from manager agent");
  }

  return extractJSON<ManagerOutput>(content.text, "manager");
}
