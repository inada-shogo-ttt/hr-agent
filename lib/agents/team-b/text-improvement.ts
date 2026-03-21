import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { TextImprovementInput, TextImprovementOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";

export async function runTextImprovementAgent(input: TextImprovementInput): Promise<TextImprovementOutput> {
  const { platform, existingPosting, manuscriptAnalysis, metricsIssues, userReferences } = input;

  const postingFields = Object.entries(existingPosting)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const fieldLabels: Record<string, string> = {
    jobTitle: "職種名",
    catchphrase: "キャッチコピー",
    jobDescription: "仕事内容",
    appealPoints: "アピールポイント",
    requirements: "求める人材",
    holidays: "休暇休日",
    benefits: "待遇・福利厚生",
    access: "アクセス",
    appealTitle: "訴求文タイトル",
    appealText: "訴求文",
    trainingSystem: "教育体制・研修",
    selectionProcess: "選考の流れ",
    welcomeRequirements: "歓迎要件",
    salaryDescription: "給与の補足",
    // ハローワーク固有
    companyAddress: "所在地",
    workLocation: "就業場所",
    employmentPeriod: "雇用期間",
    contractRenewal: "契約更新",
    wageType: "賃金形態",
    wageAmount: "賃金額",
    allowances: "手当",
    commutingAllowance: "通勤手当",
    bonus: "賞与",
    raise: "昇給",
    overtime: "時間外労働",
    annualLeave: "年次有給休暇",
    insurance: "加入保険",
    pension: "企業年金",
    trialPeriod: "試用期間",
    specialNotes: "特記事項",
    requiredLicenses: "必要な免許・資格",
    ageRestriction: "年齢制限",
    selectionMethod: "選考方法",
    applicationDocuments: "応募書類",
    remarks: "求人に関する特記事項",
  };

  const issuesContext = manuscriptAnalysis.issues
    .map((i) => `- [${i.severity}] ${i.category}: ${i.description} → ${i.recommendation}`)
    .join("\n");

  const metricsContext = metricsIssues?.length
    ? `\n## 数値課題\n${metricsIssues.map((i) => `- [${i.severity}] ${i.category}: ${i.recommendation}`).join("\n")}`
    : "";

  // 改善対象のフィールドのみに絞る（値があるもの）
  const targetFields = Object.entries(existingPosting)
    .filter(([, v]) => v && String(v).trim().length > 0)
    .map(([k]) => k);

  // ユーザー登録の成功原稿セクション
  let userReferencesSection = "";
  if (userReferences && userReferences.length > 0) {
    const refsText = userReferences.map((ref) => {
      const fields = Object.entries(ref.postingData)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      return `【${ref.title}】（${ref.platform} / 実績: ${ref.performance || "不明"}）\n${fields}`;
    }).join("\n\n");

    userReferencesSection = `
## 成功原稿の参考
以下の原稿は応募実績が高い成功事例です。改善時に表現やフォーマットを参考にしてください。

${refsText}
`;
  }

  const prompt = `あなたは求人原稿のリライト専門家です。
以下の原稿分析結果に基づいて、求人原稿をリライト（改善）してください。
${userReferencesSection}
## 媒体
${platform}

## 既存原稿
${postingFields}

## 原稿分析による課題
${issuesContext}

## 改善優先順位
${manuscriptAnalysis.improvementPriorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}
${metricsContext}

## リライト指針
- 元の原稿の事実情報（給与、勤務地、勤務時間など）は変更しない
- 表現・構成・訴求力を改善する
- 読者（求職者）目線で魅力が伝わるよう改善する
- 各フィールドの文字数制限を守る
- 使用を許可する絵文字は ✨✅⭕️ の3つのみ。これ以外の絵文字（📍💰🕐👥🎓🏥🎉など）は絶対に使用禁止（ハローワーク以外）
- 元の原稿に許可外の絵文字がある場合は ✨✅⭕️ のいずれかに置き換えるか削除する
- 1フィールドあたり3〜5個を目安（過剰にならないよう注意）
- ハローワーク（hellowork）の場合は絵文字を一切使用せず、全角文字のみで記載すること

## 重要: 出力形式
- "improvements" 配列には **変更したフィールドのみ** を含めてください
- "improvedPosting" には変更したフィールドのみ含めてください（未変更フィールドは省略）
- JSONのみ出力し、説明文やマークダウンコードブロックは不要です。純粋なJSONオブジェクトのみを返してください。
- 改善箇所は最大5つに絞ってください（優先度の高いものから）
- ⚠ before / after は必ず30文字以内に要約してください（全文をそのまま入れない）。改善後の全文は improvedPosting にのみ入れてください。

以下のJSON形式のみで回答:
{
  "improvedPosting": { "変更フィールド名": "改善後の全文テキスト" },
  "improvements": [
    { "field": "フィールド名", "fieldLabel": "日本語名", "before": "変更前の要約（30字以内）", "after": "変更後の要約（30字以内）", "reason": "理由（30字以内）" }
  ]
}

フィールド名と日本語ラベルの対応:
${Object.entries(fieldLabels).filter(([k]) => targetFields.includes(k)).map(([k, v]) => `${k} → ${v}`).join("\n")}`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 16384,
    system: "あなたはJSON生成専門のアシスタントです。ユーザーの指示に従い、指定されたJSON形式のみを出力してください。JSONの前後に説明文やマークダウンを付けないでください。純粋なJSONオブジェクトのみを返してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from text-improvement agent");
  }

  if (message.stop_reason === "max_tokens") {
    console.warn("[tb-text-improvement] Response was truncated (max_tokens). Attempting repair...");
  }

  return extractJSON<TextImprovementOutput>(content.text, "tb-text-improvement");
}
