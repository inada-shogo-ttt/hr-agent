import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { FactCheckInput, FactCheckOutput } from "./types";
import { extractJSON } from "./utils";

export async function runFactCheckAgent(input: FactCheckInput): Promise<FactCheckOutput> {
  const { jobPostingInput, manuscript } = input;
  const { common } = jobPostingInput;

  const prompt = `あなたは求人原稿の専門ファクトチェッカーです。
以下の求人原稿を元データと照合し、誤りや誇大表現を特定・修正してください。

## 元の募集要項（ファクト）
会社名: ${common.companyName}
職種: ${common.jobTitle}
雇用形態: ${common.employmentType}
給与: ${common.salaryType} ${common.salaryMin}円${common.salaryMax ? `〜${common.salaryMax}円` : ""}
勤務時間: ${common.workingHours}
仕事内容: ${common.jobDescription}
求める人材: ${common.requirements}
休暇・休日: ${common.holidays}
待遇・福利厚生: ${common.benefits}
社会保険: ${common.socialInsurance.join(", ")}
${common.probationPeriod ? `試用期間: ${common.probationPeriod}` : ""}
${common.selectionProcess ? `選考の流れ: ${common.selectionProcess}` : ""}

## 作成された原稿
### Indeed
${JSON.stringify(manuscript.indeed, null, 2)}

### AirWork
${JSON.stringify(manuscript.airwork, null, 2)}

### JobMedley
${JSON.stringify(manuscript.jobmedley, null, 2)}

## ファクトチェックの観点
1. 給与・待遇の表記が元データと一致しているか（水増し表記がないか）
2. 雇用形態の表記が正確か
3. 社会保険の説明が正確か
4. 仕事内容に事実と異なる記述がないか
5. 求める人材の条件が元データと矛盾していないか
6. 誇大表現・違法な表現（「残業なし」という嘘の記載など）がないか
7. 厚生労働省の求人票作成ガイドラインに準拠しているか

以下のJSON形式のみで回答してください（説明文不要）:
{
  "issues": [
    {
      "field": "問題のあるフィールド名",
      "issue": "問題の説明",
      "originalText": "元のテキスト",
      "correctedText": "修正後のテキスト",
      "severity": "critical/warning/info"
    }
  ],
  "correctedManuscript": {
    "indeed": { /* 修正後のIndeed原稿（変更なければ元のまま） */ },
    "airwork": { /* 修正後のAirWork原稿（変更なければ元のまま） */ },
    "jobmedley": { /* 修正後のJobMedley原稿（変更なければ元のまま） */ }
  },
  "isClean": true/false,
  "summary": "ファクトチェック結果の要約（200字以内）"
}

問題がなければ "issues": [] とし、"correctedManuscript" には入力原稿をそのまま返してください。`;

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
    throw new Error("Unexpected response type from fact-check agent");
  }

  try {
    return extractJSON<FactCheckOutput>(content.text, "fact-check");
  } catch {
    // パースできない場合は問題なしとして元原稿を返す
    return {
      issues: [],
      correctedManuscript: manuscript,
      isClean: true,
      summary: "ファクトチェック完了",
    };
  }
}
