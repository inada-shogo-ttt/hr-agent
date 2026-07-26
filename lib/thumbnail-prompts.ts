// サムネイルのスロット（1〜5枚目）別プロンプト定義
// Team A（新規/流用）/ Team B（改善）/ 個別再生成の3フローで共通利用する真実源。
// 2026-07 改定: Indeed 専用スロット式を全媒体（indeed/airwork/jobmedley）共通の5スロットに拡張。
// 参照画像の役割: アップ画像（事業所写真）= 人物・雰囲気のみ / 登録画像（参考サムネ）= 構図・デザイン・文字のみ。
// サーバ・クライアント両方から import されるため、純粋な文字列生成のみを置くこと。

import { ThumbnailDirection, ThumbnailSlotNumber } from "@/types/thumbnail-direction";

export interface ThumbnailSlotInfo {
  jobTitle: string;
  catchphrase?: string;
  companyName?: string;
  industry?: string;
}

// nanobanana の visualStyle と同形（依存を作らないためここで再定義）
export interface ThumbnailVisualStyle {
  uniformDescription?: string;
  colorPalette?: string;
  sceneDescription?: string;
}

export type ThumbnailSlot = ThumbnailSlotNumber;

// 選択された方向性から各スロットのプロンプトへ注入する情報
export interface SlotPlan {
  composition?: string; // このスロットの構図・シーン説明
  copy?: string;        // 画像内コピー
  colorTone?: string;   // 配色・トーン
  concept?: string;     // 訴求コンセプト
}

// 方向性からスロット別の SlotPlan を取り出す
export function resolveSlotPlan(
  direction: ThumbnailDirection | undefined,
  slot: ThumbnailSlot,
): SlotPlan | undefined {
  if (!direction) return undefined;
  const slotPlan = direction.slots.find((s) => s.slot === slot);
  return {
    composition: slotPlan?.composition,
    copy: slotPlan?.copy,
    colorTone: direction.colorTone,
    concept: direction.concept,
  };
}

// スロットの目的定義（UI 表示・提案API・Claude への指示の全てで使う）
export const THUMBNAIL_SLOTS: {
  slot: ThumbnailSlot;
  label: string;
  description: string;
}[] = [
  {
    slot: 1,
    label: "1枚目（クリック率重視）",
    description: "人物1名を大きく配置し、短いキャッチコピーを画像内に載せるメインビジュアル",
  },
  {
    slot: 2,
    label: "2枚目（職場の雰囲気）",
    description: "スタッフ2〜3名が楽しく働くシーンで事業所の雰囲気を伝える",
  },
  {
    slot: 3,
    label: "3枚目（事業所の様子）",
    description: "職場空間の全体が伝わる、やや引きの構図のカット",
  },
  {
    slot: 4,
    label: "4枚目（待遇・数字訴求）",
    description: "給与・休日など待遇の良さ・働きやすさが伝わるシーン。数字コピーを載せられる",
  },
  {
    slot: 5,
    label: "5枚目（働く人・仕事シーン）",
    description: "実際の業務の1コマ。利用者・顧客と向き合う自然な仕事シーン",
  },
];

// 後方互換エイリアス（旧: Indeed 専用スロット定義）
export const INDEED_THUMBNAIL_SLOTS = THUMBNAIL_SLOTS;

// キャッチコピーを画像内テキスト用に15文字程度へ短縮
export function shortenCatchCopy(catchphrase: string | undefined, jobTitle: string): string {
  const source = (catchphrase || "").trim();
  if (source) {
    // 句読点・記号の区切りで最初のフレーズを取り出す
    const first = source.split(/[。！!？?♪★☆\n]/)[0].trim();
    const phrase = first || source;
    return phrase.length <= 15 ? phrase : phrase.slice(0, 15);
  }
  const fallback = `${jobTitle}募集中`;
  return fallback.length <= 15 ? fallback : fallback.slice(0, 15);
}

function styleDefaults(
  info: ThumbnailSlotInfo,
  visualStyle?: ThumbnailVisualStyle,
  plan?: SlotPlan,
) {
  const industry = info.industry?.trim();
  return {
    uniform:
      visualStyle?.uniformDescription ||
      (industry ? `${industry}に適した清潔感のある服装` : "職種に適した清潔感のある服装"),
    palette:
      plan?.colorTone ||
      visualStyle?.colorPalette ||
      "青・白を基調とした清潔感のある配色",
    scene:
      visualStyle?.sceneDescription ||
      (industry ? `${industry}の明るく清潔な職場` : "明るく清潔な職場"),
  };
}

// 画像内コピーの描画指示（コピーがあるスロット共通）
function copyInstruction(copy: string): string {
  return `画像内に「${copy}」というキャッチコピーを、太いゴシック体で大きく読みやすく配置すること。文字は一字一句正確に、誤字なく描画し、背景とのコントラストを強くして可読性を最優先する。キャッチコピー以外のテキスト・ロゴは入れないこと。`;
}

const NO_TEXT_RULE = "画像内にテキスト・ロゴ・文字は一切入れないこと。";

// スロット別のコピー解決: slot1 は必須（フォールバックあり）、他は方向性で指定された場合のみ
function resolveCopy(slot: ThumbnailSlot, info: ThumbnailSlotInfo, plan?: SlotPlan): string | null {
  if (plan?.copy?.trim()) return plan.copy.trim();
  if (slot === 1) return shortenCatchCopy(info.catchphrase, info.jobTitle);
  return null;
}

// スロット別の被写体・シーン説明（方向性の composition があれば最優先）
function slotSceneText(
  slot: ThumbnailSlot,
  info: ThumbnailSlotInfo,
  visualStyle?: ThumbnailVisualStyle,
  plan?: SlotPlan,
): string {
  const { uniform, scene } = styleDefaults(info, visualStyle, plan);
  if (plan?.composition?.trim()) {
    return `${plan.composition.trim()}。登場人物は20〜30代中心、${uniform}。舞台は${scene}。`;
  }
  switch (slot) {
    case 1:
      return `${scene}で働く20〜30代のスタッフ1名を主役として、明るい笑顔のバストアップで画面中央に大きく配置する。${uniform}。背景は軽くぼかして人物を際立たせる。`;
    case 2:
      return `${scene}で、${uniform}の20〜30代のスタッフ2〜3名が笑顔で楽しそうに協力しながら働く自然なシーン。会話や連携のある自然な動きを捉えたドキュメンタリー風の構図。`;
    case 3:
      return `${scene}の空間全体が伝わる、やや引きの構図。整理整頓された清潔な設備・内装を中心に、働くスタッフが1〜2名自然に写り込む程度。`;
    case 4:
      return `待遇の良さ・働きやすさが伝わるシーン。休憩室でくつろぐスタッフや和やかなミーティングなど、${scene}でゆとりを持って働く20〜30代のスタッフの様子。${uniform}。`;
    case 5:
      return `実際の業務の1コマ。${scene}で利用者・顧客と丁寧に向き合う、${uniform}の20〜30代のスタッフの自然な仕事シーン。`;
  }
}

// 方向性の訴求コンセプト行（あれば付与）
function conceptLine(plan?: SlotPlan): string {
  return plan?.concept?.trim() ? `訴求コンセプト: ${plan.concept.trim()}。` : "";
}

function jobLabelOf(info: ThumbnailSlotInfo): string {
  return info.industry ? `${info.industry}の「${info.jobTitle}」` : `「${info.jobTitle}」`;
}

// ---------- t2i（参照画像なし） ----------

// スロット別ベースプロンプト（再生成ダイアログのデフォルト & サーバ側フォールバック & 方向性直接注入）
export function buildSlotBasePrompt(
  slot: ThumbnailSlot,
  info: ThumbnailSlotInfo,
  visualStyle?: ThumbnailVisualStyle,
  plan?: SlotPlan,
): string {
  const { palette } = styleDefaults(info, visualStyle, plan);
  const slotDef = THUMBNAIL_SLOTS.find((s) => s.slot === slot)!;
  const copy = resolveCopy(slot, info, plan);

  return `${jobLabelOf(info)}の求人サムネイル（${slotDef.label}）。${conceptLine(plan)}
${slotSceneText(slot, info, visualStyle, plan)}
${palette}。自然光ベースの明るい照明。プロフェッショナルで清潔感のある仕上がり。日本の求人市場に適した、リアルで自然な人物・職場描写であること。
${copy ? copyInstruction(copy) : NO_TEXT_RULE}`;
}

// ---------- 参照画像の役割定義 ----------

// 登録画像（参考サムネ）= 構図・デザイン参考
// 参考にするもの: 構成・デザイン・色味・テキストのサイズとフォント・画像内コピーの方向性・各素材の配置場所
const COMPOSITION_ROLE =
  "1枚目の画像は構図・デザインの参考です。サムネの構成・デザイン・色味・テキストのサイズとフォント・画像内コピーの方向性・各素材の配置場所を踏襲してください（写っている人物・場所・文言はそのままコピーしないこと）。";
const COMPOSITION_ROLE_SINGLE =
  "添付の画像は構図・デザインの参考です。サムネの構成・デザイン・色味・テキストのサイズとフォント・画像内コピーの方向性・各素材の配置場所を踏襲してください（写っている人物・場所・文言はそのままコピーしないこと）。";

// アップ画像（事業所写真）= 素材参考
// 参考にするもの: 人物（服装・制服の色・年齢層）と、事業所の部屋・内装など周囲の雰囲気のみ
const MATERIAL_ROLE =
  "2枚目の画像は素材の参考です。写っている人物（服装・制服の色・年齢層）と、事業所の部屋・内装など周囲の雰囲気のみを参考にしてください（構図・レイアウト・文字・文言は参考にしないこと。施設の写真の場合は、その施設そのものが舞台として写るようにしてください）。";
const MATERIAL_ROLE_SINGLE =
  "添付の事業所写真は素材の参考です。写っている人物（服装・制服の色・年齢層）と、事業所の部屋・内装など周囲の雰囲気のみを引き継いでください（写真の構図・レイアウト・文字は参考にせず、構図は以下の指示に従って作ること。施設の写真の場合は、その施設そのものが舞台として写るようにしてください）。";

// ---------- i2i（参照画像あり） ----------

// アップ画像（事業所写真）のみ: 人物・雰囲気を引き継ぎ、構図はスロットの目的に合わせて作る
export function buildSlotReferencePrompt(
  slot: ThumbnailSlot,
  info: ThumbnailSlotInfo,
  plan?: SlotPlan,
): string {
  const copy = resolveCopy(slot, info, plan);
  const tone = plan?.colorTone ? `${plan.colorTone}を基調に、` : "";

  return `${MATERIAL_ROLE_SINGLE}
${jobLabelOf(info)}の求人サムネイルとして生成してください。${conceptLine(plan)}
${slotSceneText(slot, info, undefined, plan)}
${tone}人物の表情は明るく親しみやすく、自然光ベースの明るい仕上がりにしてください。
${copy ? copyInstruction(copy) : NO_TEXT_RULE}`;
}

// 登録画像（構図）+ アップ画像（素材）の2枚を参考にする i2i プロンプト
// 添付順は必ず [参考サムネ, 事業所写真] とすること（プロンプトが「1枚目/2枚目の画像」で参照するため）
export function buildSlotDualReferencePrompt(
  slot: ThumbnailSlot,
  info: ThumbnailSlotInfo,
  plan?: SlotPlan,
): string {
  const copy = resolveCopy(slot, info, plan);
  const tone = plan?.colorTone ? `全体の配色は${plan.colorTone}に寄せてください。` : "";

  return `画像を2枚添付します。${COMPOSITION_ROLE}${MATERIAL_ROLE}
この2枚を参考に、${jobLabelOf(info)}の求人サムネイルを生成してください。${conceptLine(plan)}
${slotSceneText(slot, info, undefined, plan)}${tone}
${
  copy
    ? `画像内に「${copy}」というキャッチコピーを、1枚目の画像の文字と同様のフォント・大きさ・配置で描画してください（文字は一字一句正確に、誤字なく、可読性を最優先）。キャッチコピー以外のテキスト・ロゴは入れないでください。`
    : NO_TEXT_RULE
}`;
}

// 登録画像（構図）のみを参考にする i2i プロンプト
export function buildSlotCompositionPrompt(
  slot: ThumbnailSlot,
  info: ThumbnailSlotInfo,
  visualStyle?: ThumbnailVisualStyle,
  plan?: SlotPlan,
): string {
  const copy = resolveCopy(slot, info, plan);
  const tone = plan?.colorTone ? `全体の配色は${plan.colorTone}に寄せてください。` : "";

  return `${COMPOSITION_ROLE_SINGLE}
その構図で、${jobLabelOf(info)}の求人サムネイルを生成してください。${conceptLine(plan)}
${slotSceneText(slot, info, visualStyle, plan)}${tone}
${
  copy
    ? `画像内に「${copy}」というキャッチコピーを、参考画像の文字と同様のフォント・大きさ・配置で描画してください（文字は一字一句正確に、誤字なく、可読性を最優先）。キャッチコピー以外のテキスト・ロゴは入れないでください。`
    : NO_TEXT_RULE
}`;
}

// Claude によるスロット別プロンプト生成時の要件ブロック（サーバ側・方向性なしの t2i フォールバックで使用）
export function buildSlotRequirementsForClaude(shortCopy: string): string {
  return `## スロット別の要件（各スロットの目的に厳密に合わせること）
1. **slot1（1枚目・クリック率最重視）**: 検索一覧で最初に目に入るメインビジュアル。スタッフ1名を明るい笑顔のバストアップで画面中央に大きく配置。背景は軽くぼかす。画像内に「${shortCopy}」というキャッチコピーを太いゴシック体で大きく読みやすく描画する指示を必ず含めること（文字列は「」内を一字一句正確に、誤字なく描画・背景とのコントラスト確保・可読性最優先と明記）。キャッチコピー以外のテキスト・ロゴは禁止と明記。
2. **slot2（2枚目・職場の雰囲気）**: スタッフ2〜3名が笑顔で楽しそうに協力しながら働く自然なシーン。会話や連携のある動きを捉えたドキュメンタリー風の構図。画像内にテキスト・ロゴ・文字は一切入れないと明記。
3. **slot3（3枚目・事業所の様子）**: 職場空間の全体が伝わる、やや引きの構図。清潔な設備・内装を中心に、スタッフが1〜2名自然に写り込む程度。2枚目と同じ職場・世界観がつながる別カット。画像内にテキスト・ロゴ・文字は一切入れないと明記。
4. **slot4（4枚目・待遇・働きやすさ）**: 休憩室でくつろぐスタッフや和やかなミーティングなど、待遇の良さ・働きやすさが伝わるシーン。画像内にテキスト・ロゴ・文字は一切入れないと明記。
5. **slot5（5枚目・働く人・仕事シーン）**: 実際の業務の1コマ。利用者・顧客と丁寧に向き合う自然な仕事シーン。1〜3枚目と同じ職場・世界観がつながる別カット。画像内にテキスト・ロゴ・文字は一切入れないと明記。`;
}

// ---------- 再生成ダイアログ用のスロット選択肢 ----------

export interface ThumbnailSlotOption {
  label: string;
  description: string;
  prompt: string;
  // 参考画像選択時に差し替えるプロンプト
  referencePrompt?: string;
}

export function buildIndeedSlotOptions(info: ThumbnailSlotInfo): ThumbnailSlotOption[] {
  return THUMBNAIL_SLOTS.map(({ slot, label, description }) => ({
    label,
    description,
    prompt: buildSlotBasePrompt(slot, info),
    referencePrompt: buildSlotReferencePrompt(slot, info),
  }));
}
