import { NextRequest, NextResponse } from "next/server";
import { anthropic, FAST_MODEL } from "@/lib/claude";
import { requireAuth } from "@/lib/auth-guard";
import { JobPostingInput } from "@/types/job-posting";
import { ExistingPostingFields } from "@/types/team-b";
import {
  ThumbnailDirection,
  ThumbnailSlotNumber,
  ThumbnailSlotPlan,
} from "@/types/thumbnail-direction";
import { THUMBNAIL_SLOTS, shortenCatchCopy } from "@/lib/thumbnail-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface DirectionsRequestBody {
  source: "team-a" | "team-b";
  jobPostingInput?: JobPostingInput;
  existingPosting?: ExistingPostingFields;
  platforms?: string[];
}

// Claude レスポンスから JSON を抽出（```json ブロック or 裸のJSON）
function extractJson<T>(text: string): T {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : text.trim();
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("方向性提案JSONの解析に失敗しました");
  }
}

// 訴求分析に使うテキストを組み立てる。画像データ（data URL 等）は一切含めない
function buildAnalysisText(body: DirectionsRequestBody): { text: string; jobTitle: string } {
  if (body.source === "team-b") {
    const p = body.existingPosting || {};
    const lines: string[] = [];
    const push = (label: string, value?: string) => {
      if (value && value.trim()) lines.push(`- ${label}: ${value.trim().slice(0, 1500)}`);
    };
    push("職種", p.jobTitle);
    push("会社名", p.companyName);
    push("キャッチコピー", p.catchphrase || p.appealTitle);
    push("仕事内容", p.jobDescription || p.appealText);
    push("給与", p.salary || p.employmentTypeAndSalary || p.wageAmount);
    push("勤務時間", p.workingHours);
    push("休暇・休日", p.holidays);
    push("待遇・福利厚生", p.benefits);
    push("応募要件", p.requirements);
    push("アピールポイント", p.appealPoints);
    push("職場の環境・雰囲気", p.workplaceAtmosphere);
    push("スタッフの声", p.staffVoice || p.seniorStaffMessage);
    return { text: lines.join("\n"), jobTitle: p.jobTitle || "求人募集" };
  }

  const input = body.jobPostingInput;
  const c = input?.common;
  const lines: string[] = [];
  const push = (label: string, value?: string | number | null) => {
    const s = value == null ? "" : String(value);
    if (s && s.trim()) lines.push(`- ${label}: ${s.trim().slice(0, 1500)}`);
  };
  if (c) {
    push("職種", c.jobTitle);
    push("会社名", c.companyName);
    push("業種", c.industry);
    push("会社の説明", c.companyDescription);
    push("雇用形態", c.employmentType);
    push("勤務地", `${c.prefecture || ""}${c.city || ""}`);
    push(
      "給与",
      c.salaryMin
        ? `${c.salaryType || ""} ${c.salaryMin}円${c.salaryMax ? `〜${c.salaryMax}円` : "〜"}`
        : c.salaryDescription
    );
    push("給与補足", c.salaryDescription);
    push("勤務時間", c.workingHours);
    push("仕事内容", c.jobDescription);
    push("応募要件", c.requirements);
    push("休暇・休日", c.holidays);
    push("待遇・福利厚生", c.benefits);
    push("アピールポイント", c.appealPoints);
    push("ターゲット層", c.targetAudience);
    push("競合優位性", c.competitiveAdvantage);
  }
  push("Indeedキャッチコピー案", input?.indeed?.catchphrase);
  return { text: lines.join("\n"), jobTitle: c?.jobTitle || "求人募集" };
}

const SLOT_REQUIREMENTS = THUMBNAIL_SLOTS.map(
  (s) => `${s.slot}枚目【${s.label}】: ${s.description}`
).join("\n");

const SYSTEM_PROMPT = `あなたは求人サムネイルのクリエイティブディレクターです。
求人情報のテキストから訴求ポイントを分析し、サムネイル5枚（1〜5枚目）の生成方向性を、切り口の異なる3案作成してください。
指定されたJSON形式のみを出力し、他のテキストは一切含めないでください。

各スロット（枚数）の目的:
${SLOT_REQUIREMENTS}

ルール:
- 3案は訴求の切り口を明確に変えること（例: 給与・休日など数字で訴求 / 職場の人・雰囲気で訴求 / 教育体制・安心感で訴求）
- copy（画像内コピー）は15文字以内の短いフレーズ。求人情報にある事実・数字のみを使い、誇大表現・根拠のない断定は禁止
- slot1 の copy は必須。slot4 は数字系の copy を推奨。slot2/3/5 は原則 copy なし（入れる場合も15文字以内）
- composition は各スロットの目的に沿った具体的な構図・シーン説明（50〜100文字程度）
- colorTone は配色・トーンの説明（例: 青×白基調＋オレンジのアクセント）
- 最も応募効果が見込める1案に "recommended": true を付けること（必ず1案のみ）`;

function normalizeDirections(raw: unknown, fallbackJobTitle: string): ThumbnailDirection[] {
  const obj = raw as { directions?: unknown[] };
  const list = Array.isArray(obj?.directions) ? obj.directions : [];
  const ids: ThumbnailDirection["id"][] = ["a", "b", "c"];

  const directions: ThumbnailDirection[] = [];
  for (let i = 0; i < 3; i++) {
    const d = (list[i] || {}) as Record<string, unknown>;
    const rawSlots = Array.isArray(d.slots) ? (d.slots as Record<string, unknown>[]) : [];

    const slots: ThumbnailSlotPlan[] = THUMBNAIL_SLOTS.map((def) => {
      const found = rawSlots.find((s) => Number(s.slot) === def.slot);
      const composition =
        typeof found?.composition === "string" && found.composition.trim()
          ? found.composition.trim()
          : def.description;
      let copy = typeof found?.copy === "string" ? found.copy.trim() : "";
      if (def.slot === 1 && !copy) copy = shortenCatchCopy("", fallbackJobTitle);
      copy = copy.slice(0, 20);
      return {
        slot: def.slot as ThumbnailSlotNumber,
        composition,
        ...(copy ? { copy } : {}),
      };
    });

    directions.push({
      id: ids[i],
      name: typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 30) : `案${i + 1}`,
      concept: typeof d.concept === "string" ? d.concept.trim().slice(0, 300) : "",
      colorTone: typeof d.colorTone === "string" ? d.colorTone.trim().slice(0, 100) : "",
      slots,
      recommended: d.recommended === true,
    });
  }

  // recommended は必ず1案のみ（無ければ先頭）
  const recommendedIndex = directions.findIndex((d) => d.recommended);
  directions.forEach((d, i) => {
    d.recommended = i === (recommendedIndex >= 0 ? recommendedIndex : 0);
  });

  return directions;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = (await req.json()) as DirectionsRequestBody;

    const { text, jobTitle } = buildAnalysisText(body);
    if (!text.trim()) {
      return NextResponse.json({ error: "分析対象の求人情報がありません" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `以下の求人情報を分析し、サムネイル5枚の生成方向性を3案作成してください。

## 求人情報
${text}

以下のJSON形式で出力してください:
{
  "directions": [
    {
      "name": "案の名前（例: 数字で訴求）",
      "concept": "訴求コンセプトの説明",
      "colorTone": "配色・トーンの説明",
      "recommended": true または false,
      "slots": [
        { "slot": 1, "composition": "構図・シーンの説明", "copy": "画像内コピー（15文字以内）" },
        { "slot": 2, "composition": "構図・シーンの説明" },
        { "slot": 3, "composition": "構図・シーンの説明" },
        { "slot": 4, "composition": "構図・シーンの説明", "copy": "数字系コピー（15文字以内）" },
        { "slot": 5, "composition": "構図・シーンの説明" }
      ]
    }
  ]
}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text" || !block.text) {
      throw new Error("方向性提案レスポンスが不正です");
    }

    const directions = normalizeDirections(extractJson(block.text), jobTitle);

    console.log(
      `[thumbnail-directions] ${body.source}: 3案生成完了（${directions.map((d) => d.name).join(" / ")}）`
    );

    return NextResponse.json({ directions });
  } catch (error) {
    console.error("[thumbnail-directions] Error:", error);
    return NextResponse.json(
      { error: "方向性の提案に失敗しました。そのまま生成する場合は「このまま生成」を選択してください。" },
      { status: 500 }
    );
  }
}
