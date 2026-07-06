import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { ManuscriptWritingInput, ManuscriptWritingOutput } from "./types";
import { extractJSON } from "./utils";

export async function runManuscriptWritingAgent(
  input: ManuscriptWritingInput
): Promise<ManuscriptWritingOutput> {
  const { jobPostingInput, managerOutput, trendAnalysis, referenceSelection, userReferences, sharedKnowledge } = input;
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

## ライティングガイドライン
${referenceSelection.writingGuidelines}
文体・トーン: ${referenceSelection.toneAndStyle}
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
  const indeedPrompt = `${basePrompt}

## Indeed原稿作成
以下のJSON形式でIndeed用の求人原稿を作成してください。

**jobTitle / catchphrase / jobDescription の3つは、後述の「Indeed求人フォーマット」に厳密に従って出力してください。**
フォーマット内の { } は今回の求人内容で埋め、見出し・記号（⭕ ✅ ✨ ⇩ ↓ ＼／）・区切り線・改行構成はテンプレートのまま維持すること。
このフォーマットは前述の装飾ルール（絵文字の個数目安）より優先する。テンプレートが要求する数の ⭕ ✅ ✨ はそのまま使用してよい。

**Indeed必須要件（厚労省ガイドライン準拠）**:
- 「受動喫煙防止措置」と「転勤の可能性」（該当なければ「転勤なし」と明記）は jobDescription 末尾の【会社概要】内に必ず記載する
- 固定残業代がある場合は「金額・みなし時間・超過分の扱い」を benefits に明示する

{
  "jobTitle": "後述フォーマットの「タイトル」に従う",
  "catchphrase": "後述フォーマットの「キャッチコピー」に従う（15〜20文字程度＋✨）",
  "jobDescription": "後述フォーマットの「原稿」テンプレート全体を埋めたもの（改行込み、1000〜1500字程度）",
  "appealPoints": "アピールポイント（300字以内、改行込み）",
  "requirements": "求める人材（200字以内）",
  "holidays": "休暇休日（100字以内）",
  "benefits": "待遇・福利厚生（200字以内、固定残業代がある場合は金額・時間を明記）",
  "access": "アクセス（100字以内）",
  "socialInsurance": "社会保険の説明（50字以内）",
  "probationPeriod": "試用期間（なければ空文字）"
}

## Indeed求人フォーマット（厳守）

### タイトル（jobTitle）
⭕{募集職種を一言でキャッチーに記載}⭕【{職種}・{雇用形態}】{勤務地}
※{勤務地}は市区町村レベルで簡潔に記載

### キャッチコピー（catchphrase）
{求人をクリックして原稿を読みたくなるようなキャッチコピーを15〜20文字程度で記載}✨

### 原稿（jobDescription）
【あなたはいくつ当てはまりますか？】
✅ { 潜在意識に訴求する一言① }
✅ { 潜在意識に訴求する一言② }
✅ { 潜在意識に訴求する一言③ }
✅ { 潜在意識に訴求する一言④ }

「一つでも当てはまる…！」と感じたら、
もう読み進めずに応募ボタンを押してもOK。

⇩詳しい内容が知りたい方は続きをチェック⇩

✨{会社名}の{職種名}が"選ばれるワケ"✨

⭕{アピールポイントタイトル①}⭕
{3〜4行程度のアピールポイント訴求文}

⭕{アピールポイントタイトル②}⭕
{3〜4行程度のアピールポイント訴求文}

⭕{アピールポイントタイトル③}⭕
{3〜4行程度のアピールポイント訴求文}

⭕{新人へのフォロー体制を一言で記載}⭕
{フォローアップ訴求文を4行程度で記載}

【求める人材】
✅ { 求める人材一言① }
✅ { 求める人材一言② }
✅ { 求める人材一言③ }

＜必須条件＞
{箇条書きで必須条件を記載}

＼あると嬉しい！／
{箇条書きであると嬉しい条件を記載}

＜大切にしている人物像＞
{箇条書きで大切にしている人物像を記載}

ーーーーーーーーーーーーーーーーーーーーーーー

【選考フロー】
{選考フローを✅を活用しながら記載
例）
✅「応募画面へ進む」よりご応募ください
↓
✅一次面談（採用担当）
↓
✅最終面接（各部門長）
↓
✅内定

《お問い合わせ先》
TEL：xxx-xxx-xxxx
「求人を見た」とお問い合わせください。
※電話番号は採用担当者の電話番号が入力されている場合のみ記載}

ーーーーーーーーーーーーーーーーーーーーーーー

【会社概要】
・企業名：{会社名}
・所在地：{勤務地住所}
・アクセス：{最寄り駅・アクセス}
・事業内容：{業種・事業内容}
・受動喫煙対策：{受動喫煙防止措置}
・転勤：{転勤の可能性（なければ「なし」）}

${indeed?.catchphrase ? `参考キャッチコピー（ユーザー指定）: ${indeed.catchphrase}` : ""}
${indeed?.featureTags?.length ? `特長タグ（Indeedの「特長」に表示）: ${indeed.featureTags.join(" / ")}` : ""}`;

  // AirWork原稿
  const trialPeriodStr = airwork?.trialPeriod?.hasProvision
    ? `試用期間: あり（${airwork.trialPeriod.duration || "期間未指定"}、${airwork.trialPeriod.conditions || "労働条件変更なし"}）`
    : airwork?.trialPeriod?.hasProvision === false
    ? "試用期間: なし"
    : "";

  const airworkPrompt = `${basePrompt}

## AirWork原稿作成
以下のJSON形式でAirWork用の求人原稿を作成してください。
AirWorkは求職者が仕事内容を重視するため、具体的な業務内容を詳しく書いてください。

**AirWork必須要件**:
- 試用・研修の有無は仕事内容末尾に明記する（AirWorkの必須項目）

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
  const jobmedleyPrompt = `${basePrompt}

## JobMedley原稿作成
以下のJSON形式でJobMedley用の求人原稿を作成してください。
JobMedleyは医療・介護・福祉系の求職者が多いため、教育体制・職場環境を重視して書いてください。

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
全ての値は全角文字で記載し、絵文字は使用しないこと。

**【重要】ハローワーク公式制限:**
- 職種名: 全角28字以内（1求人1職種）
- 仕事の内容: 全角360字以内（30字×12行、冒頭90字が概要表示）
- 2024年法改正により「就業場所の変更の可能性」「業務内容の変更の可能性」「転勤の可能性」は必須項目

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
