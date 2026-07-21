import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ManuscriptWritingInput, ManuscriptWritingOutput } from "./types";
import { extractJSON } from "./utils";
import { PLATFORM_GUIDELINE_DEFAULTS } from "@/lib/platform-guidelines/defaults";

export type ManuscriptPlatform = "indeed" | "airwork" | "jobmedley" | "hellowork";

// 待機画面のライブプレビュー用: 媒体別の原稿が書き上がった時点の抜粋
export interface ManuscriptPreview {
  title: string;
  catchphrase?: string;
  excerpt: string;
}

export async function runManuscriptWritingAgent(
  input: ManuscriptWritingInput,
  onPlatformComplete?: (platform: ManuscriptPlatform, preview: ManuscriptPreview) => void
): Promise<ManuscriptWritingOutput> {
  const { jobPostingInput, managerOutput, trendAnalysis, userReferences, sharedKnowledge, guidelines } = input;
  const { common, indeed, airwork, jobmedley, hellowork } = jobPostingInput;

  // 媒体別ガイドライン（システム設定）。未ロード時はコード内デフォルトで動く
  const guideline = (p: ManuscriptPlatform) =>
    guidelines?.[p] ?? PLATFORM_GUIDELINE_DEFAULTS[p];

  // システム参考原稿セクションを構築
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
以下はシステムに登録された応募実績のある求人原稿です。
文体、構成、訴求ポイントの出し方を参考にしてください。
ただし、内容をコピーせず、今回の求人情報に合わせた独自の原稿を作成してください。
参考求人の給与条件・雇用条件・福利厚生などの条件情報の流用は禁止です。条件は必ず今回の入力情報のみを使用してください。

${refsText}
`;
  }

  // 固定残業代の文字列化
  const fixedOvertimeStr = common.fixedOvertimePay?.hasFixed
    ? `固定残業代: あり 月${common.fixedOvertimePay.hours ?? "?"}時間分 ${(common.fixedOvertimePay.amount ?? 0).toLocaleString()}円${common.fixedOvertimePay.note ? `（${common.fixedOvertimePay.note}）` : "（超過分は別途支給）"}`
    : common.fixedOvertimePay?.hasFixed === false
    ? "固定残業代: なし"
    : "";

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
${fixedOvertimeStr}
勤務時間: ${common.workingHours}
${common.workingHoursDescription ? `勤務時間補足: ${common.workingHoursDescription}` : ""}
${common.monthlyWorkingHours ? `月間平均所定労働時間: ${common.monthlyWorkingHours}時間` : ""}
仕事内容: ${common.jobDescription}
求める人材: ${common.requirements}
${common.welcomeRequirements ? `歓迎要件: ${common.welcomeRequirements}` : ""}
休暇・休日: ${common.holidays}
待遇・福利厚生: ${common.benefits}
社会保険: ${Array.isArray(common.socialInsurance) ? common.socialInsurance.join(", ") : common.socialInsurance || "未記入"}
${common.probationPeriod ? `試用期間: ${common.probationPeriod}` : ""}
${common.smokingPolicy ? `受動喫煙対策: ${common.smokingPolicy}` : ""}
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

${userReferencesSection}${sharedKnowledge ? `
## 過去の成功パターン（実績ベース・必ず反映すること）
以下は過去の掲載実績から抽出された効果的なパターンです。
特に「構成」「セクション」タイプのパターンは原稿構成に直接反映してください。

${sharedKnowledge}
` : ""}
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
  const indeedGuide = guideline("indeed");
  const indeedPrompt = `${basePrompt}

## Indeed原稿作成
あなたはIndeedおよびIndeed PLUS連携媒体（タウンワーク、リクナビNEXT等）に精通した採用コピーライターとして、以下のJSON形式でIndeed用の求人原稿を作成してください。
Indeedのアルゴリズム特性を踏まえ、「検索でヒットし（表示）、クリックされ（CTR）、応募される（CVR）」原稿にすること。

${indeedGuide.algorithm}

## 執筆手順（内部で必ずこの順に実行する）
- Step1 キーワード設計: ターゲットがIndeedの検索窓に入力しそうなキーワードを設計する。①職種キーワード（正式名称・一般的な言い換え）2〜4個、②こだわりキーワード（未経験、日勤のみ、土日休み、駅チカ など）3〜6個
- Step2 設計したキーワードを、後述フォーマットの本文の中に自然な文章として織り込みながら執筆する（タグ的な羅列は5個程度まで）
- Step3 出力前に後述の制約条件で検証し、不合格箇所を修正してからJSONを出力する

## 制約条件（厳守）
${indeedGuide.constraints}

**jobTitle / catchphrase / jobDescription の3つは、後述の「求人フォーマット」に厳密に従って出力してください。**
フォーマット内の { } は今回の求人内容で埋め、見出し・記号・区切り線・改行構成はテンプレートのまま維持すること。
このフォーマットは前述の装飾ルール（絵文字の個数目安）より優先する。テンプレートが要求する数の記号・絵文字はそのまま使用してよい。

{
  "jobTitle": "後述フォーマットの「タイトル」に従う",
  "catchphrase": "後述フォーマットの「キャッチコピー」に従う（文字数制限なし、可能なら入力情報の数字・事実で裏付ける）",
  "jobDescription": "後述フォーマットの「原稿」テンプレート全体を埋めたもの（改行込み。仕事内容＋一日の流れ・カジュアル面談・勤務条件ブロック・会社概要まで全セクションを過不足なく埋める）",
  "appealPoints": "アピールポイント（300字以内、改行込み）",
  "requirements": "求める人材（200字以内）",
  "holidays": "休暇休日（100字以内）",
  "benefits": "待遇・福利厚生（200字以内、固定残業代がある場合は金額・時間を明記）",
  "access": "アクセス（100字以内）",
  "socialInsurance": "社会保険の説明（50字以内）",
  "probationPeriod": "試用期間（なければ空文字）"
}

## 求人フォーマット（厳守）

${indeedGuide.format}

${indeed?.catchphrase ? `参考キャッチコピー（ユーザー指定）: ${indeed.catchphrase}` : ""}
${indeed?.featureTags?.length ? `特長タグ（Indeedの「特長」に表示）: ${indeed.featureTags.join(" / ")}` : ""}`;

  // AirWork原稿
  const trialPeriodStr = airwork?.trialPeriod?.hasProvision
    ? `試用期間: あり（${airwork.trialPeriod.duration || "期間未指定"}、${airwork.trialPeriod.conditions || "労働条件変更なし"}）`
    : airwork?.trialPeriod?.hasProvision === false
    ? "試用期間: なし"
    : "";

  const airworkGuide = guideline("airwork");
  const airworkPrompt = `${basePrompt}

## AirWork原稿作成
以下のJSON形式でAirWork用の求人原稿を作成してください。

${airworkGuide.algorithm}

## 制約条件（厳守）
${airworkGuide.constraints}
${airworkGuide.format ? `\n## 求人フォーマット（厳守）\n\n${airworkGuide.format}\n` : ""}
${airwork?.shiftIncomeExample ? `シフト・収入例: ${airwork.shiftIncomeExample}` : ""}
${airwork?.seniorStaffMessage ? `先輩スタッフからの一言: ${airwork.seniorStaffMessage}` : ""}
${airwork?.workplaceAtmosphere ? `職場の環境・雰囲気: ${airwork.workplaceAtmosphere}` : ""}
${airwork?.applicationFlow ? `応募の流れ（ユーザー指定）: ${airwork.applicationFlow}` : ""}
${airwork?.featureTags?.length ? `特徴タグ: ${airwork.featureTags.join(" / ")}` : ""}
${trialPeriodStr}

{
  "jobTitle": "職種名（30字以内）",
  "catchphrase": "キャッチコピー（40字以内）",
  "jobDescription": "仕事内容（600字以内、改行込み、具体的な業務フロー＋試用期間の明記を含む）",
  "requirements": "求める人材（200字以内）",
  "selectionProcess": "選考の流れ（200字以内、ステップ形式）"
}

${airwork?.catchphrase ? `参考キャッチコピー（ユーザー指定）: ${airwork.catchphrase}` : ""}`;

  // JobMedley原稿
  const jobmedleyGuide = guideline("jobmedley");
  const jobmedleyPrompt = `${basePrompt}

## JobMedley原稿作成
以下のJSON形式でJobMedley用の求人原稿を作成してください。

${jobmedleyGuide.algorithm}

## 制約条件（厳守）
${jobmedleyGuide.constraints}
${jobmedleyGuide.format ? `\n## 求人フォーマット（厳守）\n\n${jobmedleyGuide.format}\n` : ""}
${jobmedley?.staffVoice ? `職員の声: ${jobmedley.staffVoice}` : ""}
${jobmedley?.workplaceAtmosphere ? `職場の環境: ${jobmedley.workplaceAtmosphere}` : ""}

{
  "appealTitle": "訴求文タイトル（30字以内）",
  "appealText": "訴求文（300字以内、この職場で働く魅力を伝える。職員の声・職場環境が入力されていれば反映）",
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
  const helloworkGuide = guideline("hellowork");
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

${helloworkGuide.algorithm}

## 制約条件（厳守）
${helloworkGuide.constraints}
${helloworkGuide.format ? `\n## 求人フォーマット（厳守）\n\n${helloworkGuide.format}\n` : ""}
${hellowork?.representativeName ? `代表者名: ${hellowork.representativeName}` : ""}
${hellowork?.establishmentYear ? `設立年: ${hellowork.establishmentYear}` : ""}
${hellowork?.capital ? `資本金: ${hellowork.capital}` : ""}
${hellowork?.businessContent ? `事業内容: ${hellowork.businessContent}` : ""}
${hellowork?.companyFeatures ? `会社の特徴・PR: ${hellowork.companyFeatures}` : ""}
${hellowork?.employmentPeriod ? `雇用期間: ${hellowork.employmentPeriod}` : ""}
${hellowork?.contractRenewal ? `契約更新: ${hellowork.contractRenewal}` : ""}
${hellowork?.overtime ? `時間外労働: ${hellowork.overtime}` : ""}
${hellowork?.annualLeave ? `年次有給休暇: ${hellowork.annualLeave}` : ""}
${hellowork?.pension ? `企業年金: ${hellowork.pension}` : ""}
${hellowork?.requiredLicenses ? `必要な免許・資格: ${hellowork.requiredLicenses}` : ""}
${hellowork?.ageRestriction ? `年齢制限: ${hellowork.ageRestriction}` : ""}
${hellowork?.selectionMethod ? `選考方法: ${hellowork.selectionMethod}` : ""}
${hellowork?.applicationDocuments ? `応募書類: ${hellowork.applicationDocuments}` : ""}
${hellowork?.remarks ? `特記事項: ${hellowork.remarks}` : ""}
${common.smokingPolicy ? `受動喫煙対策: ${common.smokingPolicy}` : ""}
${fixedOvertimeStr}

以下のJSON形式でハローワーク用の求人票原稿を作成してください。
全ての値は全角文字で記載し、絵文字は使用しないこと。前述の制約条件（文字数制限・必須項目）を厳守すること。

{
  "jobTitle": "職種名（全角、２８字以内、１求人１職種）",
  "jobDescription": "仕事の内容（全角、３６０字以内、冒頭９０字が概要表示される前提で書く。３０字×１２行を目安）",
  "workplaceChange": "就業場所の変更の可能性（例：変更の範囲：なし／変更の範囲：会社の定める事業所）",
  "jobContentChange": "業務内容の変更の可能性（例：変更の範囲：なし／変更の範囲：会社の定める業務）",
  "transferPossibility": "転勤の可能性（例：あり／なし）",
  "employmentPeriod": "雇用期間（例：雇用期間の定めあり（４ヶ月以上）／雇用期間の定めなし）",
  "contractRenewal": "契約更新の可能性（例：あり／なし／条件による）",
  "wageAmount": "賃金額（例：時間給　１，１９３円〜１，１９３円）",
  "allowances": "手当（例：なし、または具体的な手当名と金額）",
  "commutingAllowance": "通勤手当（例：実費支給（上限あり）月額　５５，０００円）",
  "bonus": "賞与（例：あり（前年度実績）年２回　計６．００ヶ月分）",
  "raise": "昇給（例：あり／なし）",
  "salaryClosingDay": "賃金締切日（例：毎月末日）",
  "salaryPayDay": "賃金支払日（例：翌月２５日）",
  "workingHours": "就業時間（例：０９時００分〜１５時００分）",
  "overtime": "時間外労働（例：なし／あり　月平均　２０時間）",
  "breakTime": "休憩時間（例：６０分）",
  "holidays": "休日（例：土　日　祝日　その他　週休二日制　毎週）",
  "annualHolidays": "年間休日数（例：１２０日）",
  "annualLeave": "年次有給休暇（例：６ヶ月経過後の年次有給休暇日数　１０日）",
  "insurance": "加入保険（例：雇用　労災　健康　厚生）",
  "pension": "企業年金（例：厚生年金基金　確定拠出年金　確定給付年金／なし）",
  "trialPeriod": "試用期間（例：試用期間あり　３ヶ月　試用期間中の労働条件　同条件）",
  "retirementAge": "定年制（例：あり　一律　６５歳／なし）",
  "retirementBenefit": "退職金制度（例：あり（勤続　３年以上）／なし）",
  "specialNotes": "その他の労働条件等の特記事項（１５０字以内）",
  "requirements": "必要な経験・知識・技能等（全角、１５０字以内）",
  "requiredLicenses": "必要な免許・資格（例：普通自動車運転免許　必須）",
  "selectionMethod": "選考方法（例：面接　書類選考　適性検査　実技試験の中から該当を記載）",
  "selectionResultDays": "選考結果通知（例：面接後　７日以内）",
  "applicationDocuments": "応募書類（例：ハローワーク紹介状　履歴書（写真貼付）　職務経歴書）",
  "applicationMethodHw": "応募方法（例：ハローワーク紹介状持参の上　電話連絡　面接）",
  "hiringManagerContact": "採用担当者連絡先（例：採用担当　山田　０３－０００－００００）",
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

  // 媒体別の完成をライブプレビューとして通知（失敗しても本体処理には影響させない）
  const withPreview = (
    promise: Promise<unknown>,
    platform: ManuscriptPlatform,
    toPreview: (result: Record<string, unknown>) => ManuscriptPreview,
  ) =>
    promise.then((result) => {
      try {
        onPlatformComplete?.(platform, toPreview(result as Record<string, unknown>));
      } catch (e) {
        console.warn(`[manuscript-writing] ${platform} プレビュー通知に失敗:`, e);
      }
      return result;
    });

  const str = (v: unknown) => (typeof v === "string" ? v : "");

  // 選択された媒体のみ並列で生成（各媒体にリトライあり）。未指定は全媒体
  const selectedPlatforms: ManuscriptPlatform[] =
    jobPostingInput.selectedPlatforms && jobPostingInput.selectedPlatforms.length > 0
      ? jobPostingInput.selectedPlatforms
      : ["indeed", "airwork", "jobmedley", "hellowork"];
  const isSelected = (p: ManuscriptPlatform) => selectedPlatforms.includes(p);

  const [indeedResult, airworkResult, jobmedleyResult, helloworkResult] = await Promise.allSettled([
    isSelected("indeed")
      ? withPreview(
          callWithRetry(indeedPrompt, systemMessage, 8192, "manuscript-writing/indeed"),
          "indeed",
          (r) => ({ title: str(r.jobTitle), catchphrase: str(r.catchphrase) || undefined, excerpt: str(r.jobDescription).slice(0, 200) }),
        )
      : Promise.resolve(undefined),
    isSelected("airwork")
      ? withPreview(
          callWithRetry(airworkPrompt, systemMessage, 8192, "manuscript-writing/airwork"),
          "airwork",
          (r) => ({ title: str(r.jobTitle), catchphrase: str(r.catchphrase) || undefined, excerpt: str(r.jobDescription).slice(0, 200) }),
        )
      : Promise.resolve(undefined),
    isSelected("jobmedley")
      ? withPreview(
          callWithRetry(jobmedleyPrompt, systemMessage, 8192, "manuscript-writing/jobmedley"),
          "jobmedley",
          (r) => ({ title: str(r.appealTitle), excerpt: str(r.appealText).slice(0, 200) }),
        )
      : Promise.resolve(undefined),
    isSelected("hellowork")
      ? withPreview(
          callWithRetry(helloworkPrompt, helloworkSystem, 8192, "manuscript-writing/hellowork"),
          "hellowork",
          (r) => ({ title: str(r.jobTitle), excerpt: str(r.jobDescription).slice(0, 200) }),
        )
      : Promise.resolve(undefined),
  ]);

  // 結果を収集（失敗した媒体はエラーを報告）
  const getResult = (result: PromiseSettledResult<unknown>, name: string) => {
    if (result.status === "fulfilled") return result.value;
    console.error(`[manuscript-writing] ${name} failed:`, (result as PromiseRejectedResult).reason);
    throw new Error(`${name}の原稿生成に失敗しました: ${(result as PromiseRejectedResult).reason?.message || "不明なエラー"}`);
  };

  return {
    ...(isSelected("indeed") ? { indeed: getResult(indeedResult, "Indeed") } : {}),
    ...(isSelected("airwork") ? { airwork: getResult(airworkResult, "AirWork") } : {}),
    ...(isSelected("jobmedley") ? { jobmedley: getResult(jobmedleyResult, "JobMedley") } : {}),
    ...(isSelected("hellowork") ? { hellowork: getResult(helloworkResult, "ハローワーク") } : {}),
  } as ManuscriptWritingOutput;
}
