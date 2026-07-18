// 参考サムネ（ReferenceThumbnail テーブル）のアクセサ
// 全アカウント共通の構図参考画像。サムネイル生成時にスロットごとに AI が1枚を自動選定する。

import { supabaseAdmin } from "@/lib/supabase/admin";
import { anthropic, LIGHT_MODEL } from "@/lib/claude";

export interface ReferenceThumbnailRecord {
  id: string;
  slot: 1 | 2 | 3;
  url: string;
  storagePath: string;
  description: string | null;
  createdAt: string;
}

// スロット別の構図参考画像（data URL に解決済み）
export interface CompositionRefs {
  slot1: string | null;
  slot2: string | null;
  slot3: string | null;
}

const EMPTY_REFS: CompositionRefs = { slot1: null, slot2: null, slot3: null };

// AI 選定に渡す候補数の上限（スロットあたり。コスト・レイテンシ抑制）
const MAX_CANDIDATES_PER_SLOT = 6;

export async function listReferenceThumbnails(): Promise<ReferenceThumbnailRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("ReferenceThumbnail")
    .select("*")
    .order("slot", { ascending: true })
    .order("createdAt", { ascending: false });

  if (error) throw new Error(`参考サムネの取得に失敗しました: ${error.message}`);
  return (data ?? []) as ReferenceThumbnailRecord[];
}

// 公開URL → data URL に解決（gpt-image-2 へのバイナリ添付用）
async function resolveToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (e) {
    console.warn(`[reference-thumbnails] 画像の取得に失敗: ${url}`, e);
    return null;
  }
}

// 候補が複数あるスロットについて、求人内容に合う1枚を Claude(vision) が選定する
async function pickWithClaude(
  candidatesBySlot: Map<number, ReferenceThumbnailRecord[]>,
  job: { jobTitle: string; industry?: string; catchphrase?: string },
): Promise<Map<number, ReferenceThumbnailRecord>> {
  const picked = new Map<number, ReferenceThumbnailRecord>();
  const slotsNeedingAi = [...candidatesBySlot.entries()].filter(([, list]) => list.length >= 2);
  if (slotsNeedingAi.length === 0) return picked;

  const slotLabels: Record<number, string> = {
    1: "1枚目（クリック率重視のメインビジュアル。人物1名+キャッチコピー文字入り）",
    2: "2枚目（スタッフ2〜3名が楽しく働く職場の雰囲気）",
    3: "3枚目（事業所・職場空間の様子）",
  };

  const content: ({ type: "text"; text: string } | { type: "image"; source: { type: "url"; url: string } })[] = [
    {
      type: "text",
      text: `以下の求人のサムネイルを生成します。スロットごとに、構図の参考として最も適した画像を候補から1枚選んでください。

## 求人情報
- 職種: ${job.jobTitle}
- 業種: ${job.industry || "不明"}
- キャッチコピー: ${job.catchphrase || "なし"}

選定基準: 業種・職種との親和性、構図（人物配置・テキスト配置・レイアウト）が求人の雰囲気に合うか。

候補画像を以下に添付します。`,
    },
  ];

  for (const [slot, list] of slotsNeedingAi) {
    for (let i = 0; i < list.length; i++) {
      content.push({
        type: "text",
        text: `--- スロット${slot}${slotLabels[slot]} / 候補${i + 1}${list[i].description ? `（メモ: ${list[i].description}）` : ""} ---`,
      });
      content.push({ type: "image", source: { type: "url", url: list[i].url } });
    }
  }

  content.push({
    type: "text",
    text: `各スロットについて選んだ候補番号を、以下のJSON形式のみで出力してください（他のテキストは含めない）:
{${slotsNeedingAi.map(([slot]) => `"slot${slot}": 候補番号`).join(", ")}}`,
  });

  const message = await anthropic.messages.create({
    model: LIGHT_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("参考サムネ選定レスポンスが不正です");
  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("参考サムネ選定JSONの解析に失敗しました");
  const result = JSON.parse(jsonMatch[0]) as Record<string, number>;

  for (const [slot, list] of slotsNeedingAi) {
    const index = Math.floor(result[`slot${slot}`]) - 1;
    picked.set(slot, list[index >= 0 && index < list.length ? index : 0]);
  }
  return picked;
}

// 求人内容に合う参考サムネをスロットごとに1枚選定し、data URL に解決して返す。
// 失敗しても生成全体を止めない（該当スロットは null = 参考サムネなしとして続行）。
export async function selectCompositionRefsForJob(job: {
  jobTitle: string;
  industry?: string;
  catchphrase?: string;
}): Promise<CompositionRefs> {
  try {
    const all = await listReferenceThumbnails();
    if (all.length === 0) return EMPTY_REFS;

    const candidatesBySlot = new Map<number, ReferenceThumbnailRecord[]>();
    for (const record of all) {
      const list = candidatesBySlot.get(record.slot) ?? [];
      if (list.length < MAX_CANDIDATES_PER_SLOT) list.push(record);
      candidatesBySlot.set(record.slot, list);
    }

    // 候補1枚のスロットはそのまま採用、複数あるスロットは Claude が選定
    const selected = new Map<number, ReferenceThumbnailRecord>();
    for (const [slot, list] of candidatesBySlot) {
      if (list.length === 1) selected.set(slot, list[0]);
    }
    try {
      const aiPicked = await pickWithClaude(candidatesBySlot, job);
      for (const [slot, record] of aiPicked) selected.set(slot, record);
    } catch (e) {
      // 選定失敗時は各スロットの最新1枚にフォールバック
      console.warn("[reference-thumbnails] AI選定に失敗。最新の1枚を使用します:", e);
      for (const [slot, list] of candidatesBySlot) {
        if (!selected.has(slot)) selected.set(slot, list[0]);
      }
    }

    const [slot1, slot2, slot3] = await Promise.all(
      [1, 2, 3].map((slot) => {
        const record = selected.get(slot);
        return record ? resolveToDataUrl(record.url) : Promise.resolve(null);
      })
    );

    const pickedSlots = [slot1, slot2, slot3]
      .map((v, i) => (v ? i + 1 : null))
      .filter(Boolean);
    if (pickedSlots.length > 0) {
      console.log(`[reference-thumbnails] 参考サムネ選定完了: スロット ${pickedSlots.join(", ")}`);
    }
    return { slot1, slot2, slot3 };
  } catch (e) {
    console.warn("[reference-thumbnails] 参考サムネの取得に失敗。参考なしで続行します:", e);
    return EMPTY_REFS;
  }
}
