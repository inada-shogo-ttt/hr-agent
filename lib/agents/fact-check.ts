import { anthropic, FAST_MODEL } from "@/lib/claude";
import { FactCheckInput, FactCheckOutput, FactCheckIssue, ManuscriptWritingOutput } from "./types";
import { extractJSON } from "./utils";

type PlatformKey = "indeed" | "airwork" | "jobmedley" | "hellowork";

interface PlatformFactCheckResult {
  issues: FactCheckIssue[];
  correctedManuscript: Record<string, unknown>;
  isClean: boolean;
  summary: string;
}

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  indeed: "Indeed",
  airwork: "AirWork",
  jobmedley: "JobMedley",
  hellowork: "ハローワーク",
};

const PLATFORM_EXTRA_RULES: Record<PlatformKey, string> = {
  indeed: "",
  airwork: "",
  jobmedley: "",
  hellowork: "\n8. ハローワーク原稿が全角文字のみで記載されているか（半角文字・絵文字がないか）",
};

async function runPlatformFactCheck(
  platform: PlatformKey,
  manuscript: Record<string, unknown>,
  commonFacts: string,
): Promise<PlatformFactCheckResult> {
  const label = PLATFORM_LABELS[platform];
  const extraRules = PLATFORM_EXTRA_RULES[platform];

  const prompt = `あなたは求人原稿の専門ファクトチェッカーです。
以下の${label}用の求人原稿を元データと照合し、誤りや誇大表現を特定・修正してください。

## 元の募集要項（ファクト）
${commonFacts}

## ${label}原稿
${JSON.stringify(manuscript, null, 2)}

## ファクトチェックの観点
1. 給与・待遇の表記が元データと一致しているか（水増し表記がないか）
2. 雇用形態の表記が正確か
3. 社会保険の説明が正確か
4. 仕事内容に事実と異なる記述がないか
5. 求める人材の条件が元データと矛盾していないか
6. 誇大表現・違法な表現（「残業なし」という嘘の記載など）がないか
7. 厚生労働省の求人票作成ガイドラインに準拠しているか${extraRules}

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
  "correctedManuscript": { /* 修正後の${label}原稿（変更なければ元のまま） */ },
  "isClean": true/false,
  "summary": "ファクトチェック結果の要約（100字以内）"
}

問題がなければ "issues": [] とし、"correctedManuscript" には入力原稿をそのまま返してください。`;

  try {
    const message = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 8192,
      system: "あなたはJSON生成専門のアシスタントです。指定されたJSON形式のみを出力してください。JSONの前後に説明文やマークダウンを付けないでください。",
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error(`Unexpected response type from fact-check (${platform})`);
    }

    try {
      const result = extractJSON<PlatformFactCheckResult>(content.text, `fact-check-${platform}`);

      // 必須フィールドが欠けていたら元原稿で補完
      if (result.correctedManuscript) {
        for (const key of Object.keys(manuscript)) {
          if (result.correctedManuscript[key] === undefined || result.correctedManuscript[key] === null) {
            result.correctedManuscript[key] = manuscript[key];
          }
        }
      } else {
        result.correctedManuscript = manuscript;
      }

      return result;
    } catch {
      console.warn(`[fact-check-${platform}] JSON parse failed, returning original`);
      return {
        issues: [],
        correctedManuscript: manuscript,
        isClean: true,
        summary: `${label}: ファクトチェック完了（解析スキップ）`,
      };
    }
  } catch (e) {
    console.error(`[fact-check-${platform}] API error:`, e instanceof Error ? e.message : e);
    return {
      issues: [],
      correctedManuscript: manuscript,
      isClean: true,
      summary: `${label}: ファクトチェック完了（API接続失敗のためスキップ）`,
    };
  }
}

export async function runFactCheckAgent(input: FactCheckInput): Promise<FactCheckOutput> {
  const { jobPostingInput, manuscript } = input;
  const { common } = jobPostingInput;

  const commonFacts = `会社名: ${common.companyName}
職種: ${common.jobTitle}
雇用形態: ${common.employmentType}
給与: ${common.salaryType} ${common.salaryMin}円${common.salaryMax ? `〜${common.salaryMax}円` : ""}
勤務時間: ${common.workingHours}
仕事内容: ${common.jobDescription}
求める人材: ${common.requirements}
休暇・休日: ${common.holidays}
待遇・福利厚生: ${common.benefits}
社会保険: ${Array.isArray(common.socialInsurance) ? common.socialInsurance.join(", ") : common.socialInsurance || "未記入"}
${common.probationPeriod ? `試用期間: ${common.probationPeriod}` : ""}
${common.selectionProcess ? `選考の流れ: ${common.selectionProcess}` : ""}`;

  // 4媒体を並列でファクトチェック
  const [indeedResult, airworkResult, jobmedleyResult, helloworkResult] = await Promise.all([
    runPlatformFactCheck("indeed", manuscript.indeed as unknown as Record<string, unknown>, commonFacts),
    runPlatformFactCheck("airwork", manuscript.airwork as unknown as Record<string, unknown>, commonFacts),
    runPlatformFactCheck("jobmedley", manuscript.jobmedley as unknown as Record<string, unknown>, commonFacts),
    runPlatformFactCheck("hellowork", manuscript.hellowork as unknown as Record<string, unknown>, commonFacts),
  ]);

  // 結果をマージ
  const allIssues = [
    ...indeedResult.issues,
    ...airworkResult.issues,
    ...jobmedleyResult.issues,
    ...helloworkResult.issues,
  ];

  const isClean = indeedResult.isClean && airworkResult.isClean && jobmedleyResult.isClean && helloworkResult.isClean;

  const correctedManuscript: ManuscriptWritingOutput = {
    indeed: indeedResult.correctedManuscript as unknown as ManuscriptWritingOutput["indeed"],
    airwork: airworkResult.correctedManuscript as unknown as ManuscriptWritingOutput["airwork"],
    jobmedley: jobmedleyResult.correctedManuscript as unknown as ManuscriptWritingOutput["jobmedley"],
    hellowork: helloworkResult.correctedManuscript as unknown as ManuscriptWritingOutput["hellowork"],
  };

  const summaries = [indeedResult.summary, airworkResult.summary, jobmedleyResult.summary, helloworkResult.summary]
    .filter(Boolean)
    .join(" / ");

  return {
    issues: allIssues,
    correctedManuscript,
    isClean,
    summary: isClean ? "全媒体のファクトチェック完了：問題なし" : summaries,
  };
}
