import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { TextImprovementInput, TextImprovementOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";

export async function runTextImprovementAgent(input: TextImprovementInput): Promise<TextImprovementOutput> {
  const { platform, existingPosting, manuscriptAnalysis, metricsIssues } = input;

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
  };

  const issuesContext = manuscriptAnalysis.issues
    .map((i) => `- [${i.severity}] ${i.category}: ${i.description} → ${i.recommendation}`)
    .join("\n");

  const metricsContext = metricsIssues?.length
    ? `\n## 数値課題\n${metricsIssues.map((i) => `- [${i.severity}] ${i.category}: ${i.recommendation}`).join("\n")}`
    : "";

  const prompt = `あなたは求人原稿のリライト専門家です。
以下の原稿分析結果に基づいて、求人原稿をリライト（改善）してください。

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
- 改善したフィールドのみ improvements に含める

以下のJSON形式のみで回答してください:
{
  "improvedPosting": {
    改善後の各フィールド（変更がないフィールドも元の値をそのまま含める）
  },
  "improvements": [
    {
      "field": "フィールド名（例: jobTitle, catchphrase）",
      "fieldLabel": "フィールドの日本語名",
      "before": "変更前のテキスト",
      "after": "変更後のテキスト",
      "reason": "変更理由（50字以内）"
    }
  ]
}

フィールド名と日本語ラベルの対応:
${Object.entries(fieldLabels).map(([k, v]) => `${k} → ${v}`).join("\n")}`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from text-improvement agent");
  }

  return extractJSON<TextImprovementOutput>(content.text, "tb-text-improvement");
}
