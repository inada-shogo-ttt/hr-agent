import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ManagerInput, ManagerOutput } from "./types";
import { extractJSON } from "./utils";

export async function runManagerAgent(input: ManagerInput): Promise<ManagerOutput> {
  const { jobPostingInput } = input;
  const { common } = jobPostingInput;

  const prompt = `あなたは求人原稿作成の専門マネージャーです。
以下の求人情報を分析し、原稿作成の要件を整理してください。

## 入力された求人情報

### 会社情報
会社名: ${common.companyName}
業種: ${common.industry}
会社説明: ${common.companyDescription || "未記入"}

### 職種情報
職種: ${common.jobTitle}
雇用形態: ${common.employmentType}
募集人数: ${common.numberOfHires ?? "未記入"}

### 勤務地
都道府県: ${common.prefecture}
市区町村: ${common.city}
住所: ${common.address || "未記入"}
最寄り駅: ${common.nearestStation || "未記入"}
駅からのアクセス: ${common.accessFromStation || "未記入"}

### 給与
給与形態: ${common.salaryType}
給与下限: ${common.salaryMin}円
給与上限: ${common.salaryMax ? `${common.salaryMax}円` : "未記入"}
給与補足: ${common.salaryDescription || "未記入"}

### 勤務時間
勤務時間: ${common.workingHours}
勤務時間補足: ${common.workingHoursDescription || "未記入"}

### 仕事内容
${common.jobDescription}

### 応募要件
必須条件: ${common.requirements}
歓迎条件: ${common.welcomeRequirements || "未記入"}

### 待遇・休日
休暇・休日: ${common.holidays}
待遇・福利厚生: ${common.benefits}
社会保険: ${common.socialInsurance?.length > 0 ? common.socialInsurance.join("、") : "未記入"}
試用期間: ${common.probationPeriod || "未記入"}

### 選考情報
選考の流れ: ${common.selectionProcess || "未記入"}

### 採用担当者メモ
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
