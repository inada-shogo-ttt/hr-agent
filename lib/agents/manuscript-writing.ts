import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ManuscriptWritingInput, ManuscriptWritingOutput } from "./types";
import { extractJSON } from "./utils";

export async function runManuscriptWritingAgent(
  input: ManuscriptWritingInput
): Promise<ManuscriptWritingOutput> {
  const { jobPostingInput, managerOutput, trendAnalysis, referenceSelection, userReferences } = input;
  const { common, indeed, airwork, jobmedley, hellowork } = jobPostingInput;

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
## 参考にすべき成功原稿
以下はユーザーが登録した応募実績のある求人原稿です。
文体、構成、訴求ポイントの出し方を参考にしてください。
ただし、内容をコピーせず、今回の求人情報に合わせた独自の原稿を作成してください。

${refsText}
`;
  }

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
社会保険: ${Array.isArray(common.socialInsurance) ? common.socialInsurance.join(", ") : common.socialInsurance || "未記入"}
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
${userReferencesSection}
## 装飾ルール
- 見出し項目や箇条書きの先頭に適切な絵文字を活用してください
- **使用を許可する絵文字は以下の3つのみです。これ以外の絵文字は絶対に使用禁止です:**
  ✨ 魅力・メリット・注目ポイント
  ✅ 条件・チェック項目・対応事項
  ⭕️ 歓迎・OK・可能な項目
- 📍💰🕐👥🎓🏥🎉 などの絵文字は使用禁止です
- 1フィールドあたり3〜5個を目安に使用（使いすぎない）
- 例:
  「✨未経験OK！充実の研修制度あり」
  「✅社会保険完備 ✅交通費支給 ✅制服貸与」
  「⭕️ブランクのある方も歓迎」

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

  // ハローワーク原稿
  const helloworkPrompt = `あなたは求人広告の一流コピーライターです。
以下の情報をもとに、ハローワーク（公共職業安定所）に掲載する求人票の原稿を作成してください。

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
社会保険: ${Array.isArray(common.socialInsurance) ? common.socialInsurance.join("、") : common.socialInsurance || "未記入"}
${common.probationPeriod ? `試用期間: ${common.probationPeriod}` : ""}
${common.selectionProcess ? `選考の流れ: ${common.selectionProcess}` : ""}

## 分析結果
要件サマリー: ${managerOutput.summary}

## ハローワーク求人票の作成ルール（厳守）
1. **全角文字のみ使用**してください。数字・英字・記号も全て全角（例：１２３、ＡＢＣ、〜、（）、：）
2. **絵文字は一切使用禁止**です
3. 簡潔で事実に基づいた記載にしてください（誇大表現禁止）
4. 厚生労働省の求人票記載ガイドラインに準拠してください
5. 箇条書きは「・」（全角中点）を使用してください

${hellowork?.employmentPeriod ? `雇用期間: ${hellowork.employmentPeriod}` : ""}
${hellowork?.contractRenewal ? `契約更新: ${hellowork.contractRenewal}` : ""}
${hellowork?.overtime ? `時間外労働: ${hellowork.overtime}` : ""}
${hellowork?.requiredLicenses ? `必要な免許・資格: ${hellowork.requiredLicenses}` : ""}
${hellowork?.ageRestriction ? `年齢制限: ${hellowork.ageRestriction}` : ""}
${hellowork?.selectionMethod ? `選考方法: ${hellowork.selectionMethod}` : ""}
${hellowork?.applicationDocuments ? `応募書類: ${hellowork.applicationDocuments}` : ""}
${hellowork?.remarks ? `特記事項: ${hellowork.remarks}` : ""}

以下のJSON形式でハローワーク用の求人票原稿を作成してください。
全ての値は全角文字で記載し、絵文字は使用しないこと。

{
  "jobTitle": "職種名（全角、３０字以内）",
  "jobDescription": "仕事の内容（全角、具体的な業務内容、５００字以内）",
  "employmentPeriod": "雇用期間（例：雇用期間の定めあり（４ヶ月以上）／雇用期間の定めなし）",
  "contractRenewal": "契約更新の可能性（例：あり／なし／条件による）",
  "wageAmount": "賃金額（例：時間給　１，１９３円〜１，１９３円）",
  "allowances": "手当（例：なし、または具体的な手当名と金額）",
  "commutingAllowance": "通勤手当（例：実費支給（上限あり）月額　５５，０００円）",
  "bonus": "賞与（例：あり（前年度実績）年２回　計６．００ヶ月分）",
  "raise": "昇給（例：あり／なし）",
  "workingHours": "就業時間（例：０９時００分〜１５時００分）",
  "overtime": "時間外労働（例：なし／あり　月平均　２０時間）",
  "breakTime": "休憩時間（例：６０分）",
  "holidays": "休日（例：土　日　祝日　その他　週休二日制　毎週）",
  "annualLeave": "年次有給休暇（例：６ヶ月経過後の年次有給休暇日数　１０日）",
  "insurance": "加入保険（例：雇用　労災　健康　厚生）",
  "pension": "企業年金（例：厚生年金基金　確定拠出年金　確定給付年金）",
  "trialPeriod": "試用期間（例：試用期間あり　３ヶ月　試用期間中の労働条件　同条件）",
  "specialNotes": "その他の労働条件等の特記事項（１５０字以内）",
  "requirements": "必要な経験・知識・技能等（全角、１５０字以内）",
  "requiredLicenses": "必要な免許・資格（例：普通自動車運転免許　必須）",
  "selectionMethod": "選考方法（例：書類選考　面接（予定１回）　筆記試験）",
  "applicationDocuments": "応募書類（例：ハローワーク紹介状　履歴書（写真貼付））",
  "remarks": "求人に関する特記事項（全角、３００字以内、応募方法や面接の詳細など）"
}`;

  const systemMessage = "あなたはJSON生成専門のアシスタントです。ユーザーの指示に従い、指定されたJSON形式のみを出力してください。JSONの前後に説明文やマークダウンを付けないでください。純粋なJSONオブジェクトのみを返してください。";

  // API呼び出しのヘルパー（リトライ付き）
  const callWithRetry = async (
    prompt: string,
    system: string,
    maxTokens: number,
    agentName: string,
    maxRetries: number = 2,
  ) => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[${agentName}] Retry attempt ${attempt}/${maxRetries}...`);
        }
        const response = await anthropic.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.content[0];
        if (content.type !== "text" || !content.text) {
          throw new Error(`Unexpected response from ${agentName}`);
        }
        if (response.stop_reason === "max_tokens") {
          console.warn(`[${agentName}] Response was truncated (max_tokens reached). Attempting repair...`);
        }
        return extractJSON(content.text, agentName);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.error(`[${agentName}] Attempt ${attempt} failed:`, lastError.message);
        if (attempt < maxRetries) {
          // 少し待ってからリトライ（レートリミット対策）
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error(`${agentName} failed after ${maxRetries} retries`);
  };

  const helloworkSystem = "あなたはJSON生成専門のアシスタントです。ユーザーの指示に従い、指定されたJSON形式のみを出力してください。JSONの前後に説明文やマークダウンを付けないでください。純粋なJSONオブジェクトのみを返してください。全ての値は全角文字で記載し、絵文字は一切使用しないでください。";

  // 4媒体を並列で生成（各媒体にリトライあり）
  const [indeedResult, airworkResult, jobmedleyResult, helloworkResult] = await Promise.allSettled([
    callWithRetry(indeedPrompt, systemMessage, 8192, "manuscript-writing/indeed"),
    callWithRetry(airworkPrompt, systemMessage, 8192, "manuscript-writing/airwork"),
    callWithRetry(jobmedleyPrompt, systemMessage, 8192, "manuscript-writing/jobmedley"),
    callWithRetry(helloworkPrompt, helloworkSystem, 8192, "manuscript-writing/hellowork"),
  ]);

  // 結果を収集（失敗した媒体はエラーを報告）
  const getResult = (result: PromiseSettledResult<unknown>, name: string) => {
    if (result.status === "fulfilled") return result.value;
    console.error(`[manuscript-writing] ${name} failed:`, (result as PromiseRejectedResult).reason);
    throw new Error(`${name}の原稿生成に失敗しました: ${(result as PromiseRejectedResult).reason?.message || "不明なエラー"}`);
  };

  return {
    indeed: getResult(indeedResult, "Indeed"),
    airwork: getResult(airworkResult, "AirWork"),
    jobmedley: getResult(jobmedleyResult, "JobMedley"),
    hellowork: getResult(helloworkResult, "ハローワーク"),
  } as ManuscriptWritingOutput;
}
