import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { TextImprovementInput, TextImprovementOutput } from "./types";
import { extractJSON } from "@/lib/agents/utils";
import { PLATFORM_FIELDS } from "@/app/references/fields";

// 改善対象フィールド → 日本語ラベルを、参考原稿と同じ定義から引く
function buildFieldLabels(platform: string): Record<string, string> {
  const labels: Record<string, string> = {};
  const group = PLATFORM_FIELDS[platform];
  if (group) {
    for (const field of [...group.main, ...group.optional]) {
      labels[field.key] = field.label;
    }
  }
  // ExistingPostingFields にだけ存在する旧キーの補完
  const legacy: Record<string, string> = {
    companyName: "会社名",
    salary: "給与",
    workingHours: "勤務時間",
    socialInsurance: "社会保険",
    location: "勤務地",
    employmentType: "雇用形態",
    numberOfHires: "採用人数",
    access: "アクセス",
    probationPeriod: "試用期間",
    salaryDescription: "給与の補足",
    jobCategory: "職種カテゴリ",
    companyAddress: "所在地",
    workLocation: "就業場所",
    wageType: "賃金形態",
    specialNotes: "特記事項",
    selectionNotification: "選考結果通知",
    recruitmentBudget: "採用予算",
  };
  for (const [k, v] of Object.entries(legacy)) {
    if (!labels[k]) labels[k] = v;
  }
  return labels;
}

const INDEED_BENCHMARKS = `
- クリック率(CTR): 1.5〜3.0%が平均、3.0%以上が優秀
- 応募開始率: 5〜10%が平均
- 応募完了率: 30〜60%が平均
- クリック単価(CPC): 職種により50〜300円`;

const AIRWORK_BENCHMARKS = `
- クリック率(CTR): 1.0〜2.5%が平均
- 応募完了率: 3〜8%が平均
- クリック単価(CPC): 職種により100〜500円`;

export async function runTextImprovementAgent(input: TextImprovementInput): Promise<TextImprovementOutput> {
  const {
    platform,
    existingPosting,
    metrics,
    userReferences,
    historyContext,
    crossJobMemory,
    sharedKnowledge,
    previousMetrics,
  } = input;

  const fieldLabels = buildFieldLabels(platform);

  const postingFields = Object.entries(existingPosting)
    .filter(([, v]) => v && String(v).trim().length > 0)
    .map(([k, v]) => `- ${fieldLabels[k] || k}（${k}）: ${v}`)
    .join("\n");

  const targetFields = Object.entries(existingPosting)
    .filter(([, v]) => v && String(v).trim().length > 0)
    .map(([k]) => k);

  // メトリクス文字列化
  let metricsSection = "";
  if (metrics) {
    const entries = Object.entries(metrics)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n");
    const benchmarks = platform === "indeed" ? INDEED_BENCHMARKS : platform === "airwork" ? AIRWORK_BENCHMARKS : "";
    metricsSection = `
## 掲載数値（${platform}）
${entries}
${benchmarks ? `\n### 業界ベンチマーク${benchmarks}` : ""}
`;
    if (previousMetrics) {
      const diff = Object.entries(previousMetrics)
        .map(([k, v]) => `  前回 ${k}: ${v}`)
        .join("\n");
      metricsSection += `\n### 前回ラウンドのメトリクス（推移判定に使用）\n${diff}\n`;
    }
  } else {
    metricsSection = `\n## 掲載数値\nなし（原稿の定性分析のみ実施）\n`;
  }

  // 履歴
  let historySection = "";
  if (historyContext && historyContext.length > 0) {
    const pastTeamB = historyContext
      .filter((h: any) => h.type === "team-b")
      .slice(-3)
      .map((h: any) => `- Round ${h.round}（${h.date}）: 改善${h.improvementCount || 0}箇所 / 課題${h.issuesFound || 0}件 ${h.manuscriptAnalysis ? `\n  前回所見: ${String(h.manuscriptAnalysis).slice(0, 120)}` : ""}`)
      .join("\n");
    if (pastTeamB) {
      historySection = `\n## 過去の改善履歴（直近3回）\n${pastTeamB}\n`;
    }
  }

  // 参考原稿セクション
  let userReferencesSection = "";
  if (userReferences && userReferences.length > 0) {
    const refsText = userReferences
      .map((ref) => {
        const fields = Object.entries(ref.postingData)
          .map(([k, v]) => `  ${fieldLabels[k] || k}（${k}）: ${v}`)
          .join("\n");
        return `【${ref.title}】（${ref.platform} / 実績: ${ref.performance || "不明"}）\n${fields}`;
      })
      .join("\n\n");
    userReferencesSection = `\n## 成功原稿の参考（応募実績あり・最優先で参照）\n以下の原稿は実際に応募が集まった成功事例です。構成・表現・訴求ポイントの出し方を**積極的に**参考にしてください。\n\n${refsText}\n`;
  }

  const crossJobMemorySection = crossJobMemory
    ? `\n## 過去に効果があった改善パターン（クロスジョブメモリ）\n${crossJobMemory}\n`
    : "";

  const sharedKnowledgeSection = sharedKnowledge
    ? `\n## 全体の成功パターン（実績ベース・全アカウント共通）\n${sharedKnowledge}\n`
    : "";

  const prompt = `あなたは求人原稿の改善専門家です。以下のデータを総合的に分析し、**課題抽出 → リライト** まで一気通貫で実施してください。
${userReferencesSection}${crossJobMemorySection}${sharedKnowledgeSection}
## 媒体
${platform}

## 既存原稿
${postingFields}
${metricsSection}${historySection}
## 分析観点
1. **タイトル・キャッチコピー**: 訴求力、差別化、ターゲット適合性
2. **仕事内容**: 具体性、魅力の伝え方、読みやすさ
3. **給与・待遇**: 競争力、表記の工夫
4. **応募ハードル**: 条件の厳しさ、応募しやすさ
5. **全体構成**: 情報の過不足、読みやすさ、CTA
${metrics ? "6. **数値課題**: ベンチマーク比較、ファネル分析（表示→クリック→応募）" : ""}

## リライト指針
- 元の原稿の事実情報（給与額、勤務地、勤務時間、会社名、雇用形態など）は**変更しない**
- 表現・構成・訴求力を改善する。参考原稿の表現・構成が使える箇所は積極的に採用する
- 読者（求職者）目線で魅力が伝わるよう改善する
- 各フィールドの文字数制限を守る（特にハローワークの jobTitle 28字、jobDescription 360字）
- 使用を許可する絵文字は ✨✅⭕️ の3つのみ。これ以外の絵文字（📍💰🕐👥🎓🏥🎉など）は絶対に使用禁止（ハローワーク以外）
- 元の原稿に許可外の絵文字がある場合は ✨✅⭕️ のいずれかに置き換えるか削除する
- 1フィールドあたり3〜5個を目安（過剰にならないよう注意）
- ハローワーク（hellowork）の場合は絵文字を一切使用せず、全角文字のみで記載

## 出力形式の重要ルール
- "improvements" には **変更したフィールドのみ** を含める
- "improvedPosting" にも **変更したフィールドのみ** を含める（未変更フィールドは省略）
- 改善は最大5つに絞る（優先度順、severity: high を最優先）
- before / after は30字以内の要約（全文ではなく変更ポイントが分かる要約）。改善後の全文は improvedPosting に入れる
- JSON以外の前置き・後置きは一切不要。純粋な JSON のみを返す

## 出力JSON形式
{
  "metricsSummary": "${metrics ? "数値の総合所見（200字以内、ベンチマーク比較含む）" : ""}",
  "overallAssessment": "原稿の総合評価（300字以内、強み・弱みを含めて）",
  "issues": [
    { "category": "カテゴリ名（タイトル/仕事内容/給与・待遇/応募ハードル/構成/クリック率/応募率 など）", "description": "課題の具体内容", "severity": "high|medium|low", "recommendation": "改善の方向性" }
  ],
  "improvedPosting": { "変更したフィールド名": "改善後の全文" },
  "improvements": [
    { "field": "フィールド名", "fieldLabel": "日本語ラベル", "before": "変更前の要約（30字以内）", "after": "変更後の要約（30字以内）", "reason": "理由（30字以内）" }
  ]
}

## フィールド名と日本語ラベルの対応（改善対象の既存フィールドのみ）
${targetFields.map((k) => `- ${k} → ${fieldLabels[k] || k}`).join("\n")}`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 16384,
    system:
      "あなたはJSON生成専門のアシスタントです。ユーザーの指示に従い、指定されたJSON形式のみを出力してください。JSONの前後に説明文やマークダウンを付けないでください。純粋なJSONオブジェクトのみを返してください。",
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from text-improvement agent");
  }

  if (message.stop_reason === "max_tokens") {
    console.warn("[tb-text-improvement] Response was truncated (max_tokens). Attempting repair...");
  }

  const parsed = extractJSON<TextImprovementOutput>(content.text, "tb-text-improvement");
  // 防御: 想定フィールドが欠けている場合のフォールバック
  return {
    metricsSummary: parsed.metricsSummary || undefined,
    overallAssessment: parsed.overallAssessment || "",
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    improvedPosting: parsed.improvedPosting || {},
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
  };
}
