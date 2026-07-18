// Indeed サムネイルのスロット（1〜3枚目）別プロンプト定義
// Team A（新規作成）/ Team B（改善）/ 個別再生成の3フローで共通利用する真実源。
// サーバ・クライアント両方から import されるため、純粋な文字列生成のみを置くこと。

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

export type IndeedThumbnailSlot = 1 | 2 | 3;

// スロットの目的定義（UI 表示と Claude への指示の両方で使う）
export const INDEED_THUMBNAIL_SLOTS: {
  slot: IndeedThumbnailSlot;
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
    description: "事業所写真があればそれをベースに、なければ職場空間が伝わる別カット",
  },
];

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

function styleDefaults(info: ThumbnailSlotInfo, visualStyle?: ThumbnailVisualStyle) {
  const industry = info.industry?.trim();
  return {
    uniform:
      visualStyle?.uniformDescription ||
      (industry ? `${industry}に適した清潔感のある服装` : "職種に適した清潔感のある服装"),
    palette: visualStyle?.colorPalette || "青・白を基調とした清潔感のある配色",
    scene:
      visualStyle?.sceneDescription ||
      (industry ? `${industry}の明るく清潔な職場` : "明るく清潔な職場"),
  };
}

// スロット別ベースプロンプト（再生成ダイアログのデフォルト & サーバ側フォールバック）
export function buildIndeedSlotBasePrompt(
  slot: IndeedThumbnailSlot,
  info: ThumbnailSlotInfo,
  visualStyle?: ThumbnailVisualStyle,
): string {
  const { uniform, palette, scene } = styleDefaults(info, visualStyle);
  const jobLabel = info.industry ? `${info.industry}の「${info.jobTitle}」` : `「${info.jobTitle}」`;

  switch (slot) {
    case 1: {
      const copy = shortenCatchCopy(info.catchphrase, info.jobTitle);
      return `求人検索一覧でクリック率を最大化するメインサムネイル。${jobLabel}の求人バナー画像。
${scene}で働く20〜30代のスタッフ1名を主役として、明るい笑顔のバストアップで画面中央に大きく配置する。${uniform}。背景は軽くぼかして人物を際立たせる。
画像内に「${copy}」というキャッチコピーを、太いゴシック体で大きく読みやすく配置すること。文字は一字一句正確に、誤字なく描画し、背景とのコントラストを強くして可読性を最優先する。
${palette}。自然光ベースの明るい照明。プロフェッショナルで清潔感のある仕上がり。キャッチコピー以外のテキスト・ロゴは入れないこと。`;
    }
    case 2:
      return `事業所の雰囲気を伝える求人サムネイル。${jobLabel}の職場である${scene}で、20〜30代のスタッフ2〜3名が笑顔で楽しそうに協力しながら働く自然なシーン。${uniform}。
会話や連携のある自然な動きを捉えたドキュメンタリー風の構図。${palette}。自然光ベースの明るい照明。リアルで親しみやすい雰囲気。画像内にテキスト・ロゴ・文字は一切入れないこと。`;
    case 3:
      return `事業所の様子を伝える求人サムネイル。${jobLabel}の職場である${scene}の空間全体が伝わる、やや引きの構図。整理整頓された清潔な設備・内装を中心に、働くスタッフが1〜2名自然に写り込む程度。同じ職場の別カットとして統一感のある${palette}・自然光ベースの明るい照明。画像内にテキスト・ロゴ・文字は一切入れないこと。`;
  }
}

// 参考画像（事業所写真）あり用の i2i 編集プロンプト
// 1・2枚目: 写真の内装・色調・服装・照明の雰囲気を引き継ぎつつ、構図はスロットの目的に合わせて作り変える
// 3枚目: 写真の構図・空間を忠実に維持して仕上げる
// （詳細なシーン描写は参考画像と競合して「似ない」原因になるため、短文で指示する）
export function buildIndeedSlotReferencePrompt(
  slot: IndeedThumbnailSlot,
  info: ThumbnailSlotInfo,
): string {
  const jobLabel = info.industry ? `${info.industry}の「${info.jobTitle}」` : `「${info.jobTitle}」`;

  switch (slot) {
    case 1: {
      const copy = shortenCatchCopy(info.catchphrase, info.jobTitle);
      return `添付の事業所写真の内装・色調・服装・照明の雰囲気を引き継ぎながら、${jobLabel}の求人サムネイルとして、その職場で働く20〜30代のスタッフ1名を明るい笑顔のバストアップで画面中央に大きく配置した構図に作り変えてください。背景は軽くぼかして人物を際立たせてください。画像内に「${copy}」というキャッチコピーを太いゴシック体で大きく読みやすく描画してください（文字は一字一句正確に、誤字なく、背景とのコントラストを強くして可読性を最優先）。キャッチコピー以外のテキスト・ロゴは入れないでください。`;
    }
    case 2:
      return `添付の事業所写真の内装・色調・服装・照明の雰囲気を引き継ぎながら、${jobLabel}の求人サムネイルとして、その職場でスタッフ2〜3名が笑顔で楽しそうに協力しながら働く自然なシーンに作り変えてください。会話や連携のある動きを捉えたドキュメンタリー風の構図で、人物の表情は明るく親しみやすくしてください。画像内にテキスト・ロゴ・文字は一切入れないでください。`;
    case 3:
      return `添付の事業所写真をベースに、構図・空間の特徴・雰囲気を維持したまま、${jobLabel}の求人サムネイルとして明るく清潔感のある印象に仕上げてください。彩度と明るさを整え、温かみのある自然光の雰囲気にしてください。画像内にテキスト・ロゴ・文字は一切入れないでください。`;
  }
}

// 参考サムネ（構図参考）を使う場合の役割説明
// 添付順は必ず [参考サムネ, 事業所写真] とすること（プロンプトが「1枚目/2枚目の画像」で参照するため）
const COMPOSITION_ROLE =
  "1枚目の画像は構図の参考です。レイアウト・テキストのフォント・文字の大きさ・人物の配置・画面の使い方を踏襲してください（写っている人物・場所・文言はそのままコピーしないこと）。";
const MATERIAL_ROLE =
  "2枚目の画像は素材の参考です。服装・制服の色・人物の年齢層・施設全体の雰囲気を踏襲してください（施設の写真の場合は、その施設そのものが舞台として写るようにしてください）。";

// 参考サムネ（構図）+ 事業所写真（素材）の2枚を参考にする i2i プロンプト
export function buildIndeedSlotDualReferencePrompt(
  slot: IndeedThumbnailSlot,
  info: ThumbnailSlotInfo,
): string {
  const jobLabel = info.industry ? `${info.industry}の「${info.jobTitle}」` : `「${info.jobTitle}」`;
  const intro = `画像を2枚添付します。${COMPOSITION_ROLE}${MATERIAL_ROLE}`;

  switch (slot) {
    case 1: {
      const copy = shortenCatchCopy(info.catchphrase, info.jobTitle);
      return `${intro}
この2枚を参考に、${jobLabel}の求人サムネイルを生成してください。スタッフ1名を明るい笑顔のバストアップで大きく配置し、画像内に「${copy}」というキャッチコピーを1枚目の画像の文字と同様のフォント・大きさ・配置で描画してください（文字は一字一句正確に、誤字なく、可読性を最優先）。キャッチコピー以外のテキスト・ロゴは入れないでください。`;
    }
    case 2:
      return `${intro}
この2枚を参考に、${jobLabel}の求人サムネイルを生成してください。その職場でスタッフ2〜3名が笑顔で楽しそうに協力しながら働く自然なシーンとして描いてください。画像内にテキスト・ロゴ・文字は一切入れないでください。`;
    case 3:
      return `${intro}
この2枚を参考に、${jobLabel}の求人サムネイルを生成してください。2枚目の画像の施設・職場空間を主体として、明るく清潔感のある印象に仕上げてください（構図・画面の使い方は1枚目の画像を参考に）。画像内にテキスト・ロゴ・文字は一切入れないでください。`;
  }
}

// 参考サムネ（構図）のみを参考にする i2i プロンプト
export function buildIndeedSlotCompositionPrompt(
  slot: IndeedThumbnailSlot,
  info: ThumbnailSlotInfo,
  visualStyle?: ThumbnailVisualStyle,
): string {
  const { uniform, scene } = styleDefaults(info, visualStyle);
  const jobLabel = info.industry ? `${info.industry}の「${info.jobTitle}」` : `「${info.jobTitle}」`;
  const intro = `添付の画像は構図の参考です。レイアウト・テキストのフォント・文字の大きさ・人物の配置・画面の使い方を踏襲してください（写っている人物・場所・文言はそのままコピーしないこと）。`;

  switch (slot) {
    case 1: {
      const copy = shortenCatchCopy(info.catchphrase, info.jobTitle);
      return `${intro}
その構図で、${jobLabel}の求人サムネイルを生成してください。${scene}で働く、${uniform}の20〜30代のスタッフ1名を明るい笑顔のバストアップで大きく配置し、画像内に「${copy}」というキャッチコピーを参考画像の文字と同様のフォント・大きさ・配置で描画してください（文字は一字一句正確に、誤字なく、可読性を最優先）。キャッチコピー以外のテキスト・ロゴは入れないでください。`;
    }
    case 2:
      return `${intro}
その構図で、${jobLabel}の求人サムネイルを生成してください。${scene}で、${uniform}の20〜30代のスタッフ2〜3名が笑顔で楽しそうに協力しながら働く自然なシーンとして描いてください。画像内にテキスト・ロゴ・文字は一切入れないでください。`;
    case 3:
      return `${intro}
その構図で、${jobLabel}の求人サムネイルを生成してください。${scene}の空間全体が伝わる、清潔感のある明るいカットとして描いてください。画像内にテキスト・ロゴ・文字は一切入れないでください。`;
  }
}

// Claude によるスロット別プロンプト生成時の要件ブロック（サーバ側で使用）
export function buildSlotRequirementsForClaude(shortCopy: string): string {
  return `## スロット別の要件（各スロットの目的に厳密に合わせること）
1. **slot1（1枚目・クリック率最重視）**: 検索一覧で最初に目に入るメインビジュアル。スタッフ1名を明るい笑顔のバストアップで画面中央に大きく配置。背景は軽くぼかす。画像内に「${shortCopy}」というキャッチコピーを太いゴシック体で大きく読みやすく描画する指示を必ず含めること（文字列は「」内を一字一句正確に、誤字なく描画・背景とのコントラスト確保・可読性最優先と明記）。キャッチコピー以外のテキスト・ロゴは禁止と明記。
2. **slot2（2枚目・職場の雰囲気）**: スタッフ2〜3名が笑顔で楽しそうに協力しながら働く自然なシーン。会話や連携のある動きを捉えたドキュメンタリー風の構図。画像内にテキスト・ロゴ・文字は一切入れないと明記。
3. **slot3（3枚目・事業所の様子）**: 職場空間の全体が伝わる、やや引きの構図。清潔な設備・内装を中心に、スタッフが1〜2名自然に写り込む程度。2枚目と同じ職場・世界観がつながる別カット。画像内にテキスト・ロゴ・文字は一切入れないと明記。`;
}

// 再生成ダイアログ用のスロット選択肢
export interface ThumbnailSlotOption {
  label: string;
  description: string;
  prompt: string;
  // 参考画像選択時に差し替えるプロンプト
  referencePrompt?: string;
}

export function buildIndeedSlotOptions(info: ThumbnailSlotInfo): ThumbnailSlotOption[] {
  return INDEED_THUMBNAIL_SLOTS.map(({ slot, label, description }) => ({
    label,
    description,
    prompt: buildIndeedSlotBasePrompt(slot, info),
    referencePrompt: buildIndeedSlotReferencePrompt(slot, info),
  }));
}
