import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ManuscriptWritingInput, ManuscriptWritingOutput } from "./types";
import { extractJSON } from "./utils";

export async function runManuscriptWritingAgent(
  input: ManuscriptWritingInput
): Promise<ManuscriptWritingOutput> {
  const { jobPostingInput, managerOutput, trendAnalysis, referenceSelection } = input;
  const { common, indeed, airwork, jobmedley } = jobPostingInput;

  const basePrompt = `あなたは求人広告の一流コピーライターです。
以下の情報をもとに、3媒体（Indeed / AirWork / JobMedley）の求人原稿を執筆してください。

## 基本情報
会社名: ${common.companyName}
業種: ${common.industry}
職種名: ${common.jobTitle}
雇用形態: ${common.employmentType}
採用予定人数: ${common.numberOfHires || "若干名"}名
勤務地: ${common.prefecture}${common.city}${common.address || ""}
最寄り駅: ${common.nearestStation || ""}${common.accessFromStation ? ` ${common.accessFromStation}` : ""}
給与: ${common.salaryType} ${common.salaryMin}円${common.salaryMax ? `〜${common.salaryMax}円` : ""}
${common.salaryDescription ? `給与補足: ${common.salaryDescription}` : ""}
勤務時間: ${common.workingHours}
${common.workingHoursDescription ? `勤務時間補足: ${common.workingHoursDescription}` : ""}
仕事内容: ${common.jobDescription}
求める人材: ${common.requirements}
${common.welcomeRequirements ? `歓迎要件: ${common.welcomeRequirements}` : ""}
休暇・休日: ${common.holidays}
待遇・福利厚生: ${common.benefits}
社会保険: ${common.socialInsurance.join(", ")}
${common.probationPeriod ? `試用期間: ${common.probationPeriod}` : ""}
${common.selectionProcess ? `選考の流れ: ${common.selectionProcess}` : ""}
${common.appealPoints ? `アピールポイント: ${common.appealPoints}` : ""}
${common.targetAudience ? `ターゲット: ${common.targetAudience}` : ""}
${common.competitiveAdvantage ? `競合優位性: ${common.competitiveAdvantage}` : ""}

## 分析結果
要件サマリー: ${managerOutput.summary}
キーセールスポイント: ${managerOutput.requirements.keySellingPoints.join(", ")}
ターゲット: ${managerOutput.requirements.targetAudience}

## トレンド分析
推奨キーワード: ${trendAnalysis.recommendedKeywords.join(", ")}
差別化ポイント: ${trendAnalysis.differentiationPoints.join(", ")}

## ライティングガイドライン
${referenceSelection.writingGuidelines}
文体・トーン: ${referenceSelection.toneAndStyle}

---`;

  // Indeed原稿
  const indeedPrompt = `${basePrompt}

## Indeed原稿作成
以下のJSON形式でIndeed用の求人原稿を作成してください。
文字数制限を守り、読者が応募したくなる魅力的な原稿にしてください。

{
  "jobTitle": "職種名（30字以内）",
  "catchphrase": "キャッチコピー（50字以内）",
  "jobDescription": "仕事内容（500字以内、改行込み）",
  "appealPoints": "アピールポイント（300字以内、改行込み）",
  "requirements": "求める人材（200字以内）",
  "holidays": "休暇休日（100字以内）",
  "benefits": "待遇・福利厚生（200字以内）",
  "access": "アクセス（100字以内）",
  "socialInsurance": "社会保険の説明（50字以内）",
  "probationPeriod": "試用期間（なければ空文字）"
}

${indeed?.catchphrase ? `参考キャッチコピー（ユーザー指定）: ${indeed.catchphrase}` : ""}`;

  // AirWork原稿
  const airworkPrompt = `${basePrompt}

## AirWork原稿作成
以下のJSON形式でAirWork用の求人原稿を作成してください。
AirWorkは求職者が仕事内容を重視するため、具体的な業務内容を詳しく書いてください。

{
  "jobTitle": "職種名（30字以内）",
  "catchphrase": "キャッチコピー（40字以内）",
  "jobDescription": "仕事内容（600字以内、改行込み、具体的な業務フローを含む）",
  "requirements": "求める人材（200字以内）",
  "selectionProcess": "選考の流れ（200字以内、ステップ形式）"
}

${airwork?.catchphrase ? `参考キャッチコピー（ユーザー指定）: ${airwork.catchphrase}` : ""}`;

  // JobMedley原稿
  const jobmedleyPrompt = `${basePrompt}

## JobMedley原稿作成
以下のJSON形式でJobMedley用の求人原稿を作成してください。
JobMedleyは医療・介護・福祉系の求職者が多いため、教育体制・職場環境を重視して書いてください。

{
  "appealTitle": "訴求文タイトル（30字以内）",
  "appealText": "訴求文（300字以内、この職場で働く魅力を伝える）",
  "jobDescription": "仕事内容（500字以内、一日の流れや具体的な業務を含む）",
  "employmentTypeAndSalary": "雇用形態と給与（200字以内）",
  "trainingSystem": "教育体制・研修（200字以内）",
  "workingHours": "勤務時間・休憩時間（100字以内）",
  "requirements": "応募要件（200字以内）",
  "welcomeRequirements": "歓迎要件（150字以内）",
  "access": "アクセス（100字以内）",
  "selectionProcess": "選考プロセス（150字以内）"
}

${jobmedley?.appealTitle ? `参考訴求文タイトル（ユーザー指定）: ${jobmedley.appealTitle}` : ""}
${jobmedley?.trainingSystem ? `教育体制補足: ${jobmedley.trainingSystem}` : ""}`;

  // 3媒体を並列で生成
  const [indeedResponse, airworkResponse, jobmedleyResponse] = await Promise.all([
    anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: indeedPrompt }],
    }),
    anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: airworkPrompt }],
    }),
    anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: jobmedleyPrompt }],
    }),
  ]);

  const parseResponse = (response: { content: Array<{ type: string; text?: string }> }, agentName: string) => {
    const content = response.content[0];
    if (content.type !== "text" || !content.text) {
      throw new Error(`Unexpected response from ${agentName}`);
    }
    return extractJSON(content.text, agentName);
  };

  const indeedContent = parseResponse(indeedResponse, "manuscript-writing/indeed");
  const airworkContent = parseResponse(airworkResponse, "manuscript-writing/airwork");
  const jobmedleyContent = parseResponse(jobmedleyResponse, "manuscript-writing/jobmedley");

  return {
    indeed: indeedContent,
    airwork: airworkContent,
    jobmedley: jobmedleyContent,
  } as ManuscriptWritingOutput;
}
