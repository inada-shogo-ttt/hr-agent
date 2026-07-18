// 画像生成API
// エンジン: OpenAI gpt-image-2（テキスト生成 = images/generations、参考画像あり = images/edits）
// プロンプト生成: Claude API で求人情報から最適な画像プロンプトを自動生成

import sharp from "sharp";
import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { recordImageUsage } from "@/lib/api-cost";
import {
  buildIndeedSlotBasePrompt,
  buildIndeedSlotCompositionPrompt,
  buildIndeedSlotDualReferencePrompt,
  buildIndeedSlotReferencePrompt,
  buildSlotRequirementsForClaude,
  shortenCatchCopy,
} from "@/lib/thumbnail-prompts";

export interface ThumbnailGenerationRequest {
  title: string;
  catchphrase: string;
  companyName: string;
  industry: string;
  colorScheme?: string;
  style?: string;
  visualStyle?: {  // Team B で Team A のスタイルを引き継ぐ用
    uniformDescription?: string;   // 服装の説明
    colorPalette?: string;         // カラーパレットの説明
    sceneDescription?: string;     // 場面の説明
  };
  referenceImage?: string | null;  // 参考画像 (data URL)。指定時は images/edits で Image-to-Image 生成
  // 参考サムネ（構図参考、スロット別・data URL）。Indeed のスロット式生成でのみ使用
  compositionRefs?: {
    slot1?: string | null;
    slot2?: string | null;
    slot3?: string | null;
  };
}

export interface ThumbnailGenerationResponse {
  urls: string[]; // base64 data URLs ("data:image/png;base64,...")
  status: "success" | "placeholder" | "error";
  message?: string;
}

// 媒体別サムネイル型
export interface PlatformThumbnails {
  indeed: string[];   // 3枚, 800×600
  airwork: string[];  // 3枚, 800×600
  jobmedley: string[]; // 3枚, 1024×576
  hellowork: string[]; // ハローワークはサムネイル不要（常に空配列）
}

export interface PlatformThumbnailsResponse {
  thumbnails: PlatformThumbnails;
  status: "success" | "placeholder" | "error";
  message: string;
}

// 媒体別画像設定
const PLATFORM_IMAGE_CONFIG = {
  indeed:    { width: 800,  height: 600, aspectRatio: "4:3" as const },
  airwork:   { width: 800,  height: 600, aspectRatio: "4:3" as const },
  jobmedley: { width: 1024, height: 576, aspectRatio: "16:9" as const },
};

function makePlaceholders(width: number, height: number): string[] {
  return [
    `https://placehold.co/${width}x${height}/1e40af/ffffff?text=サムネイル+1`,
    `https://placehold.co/${width}x${height}/1d4ed8/ffffff?text=サムネイル+2`,
    `https://placehold.co/${width}x${height}/2563eb/ffffff?text=サムネイル+3`,
  ];
}

// ---------- Claude による画像プロンプト生成 ----------

interface GeneratedPrompts {
  corporate: string;
  warm: string;
  dynamic: string;
}

// Claude レスポンスから JSON を抽出（```json ブロック or 裸のJSON）
function extractJson<T>(text: string): T {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : text.trim();
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // フォールバック: 最初の { から最後の } まで
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("Claude: プロンプトJSONの解析に失敗しました");
  }
}

async function generateImagePromptsWithClaude(
  request: ThumbnailGenerationRequest,
  platform: string,
  aspectRatio: string,
): Promise<GeneratedPrompts> {
  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    system: `あなたは画像生成AI（gpt-image-2）向けのプロンプトエンジニアです。日本語の求人情報をもとに、求人バナー画像を生成するための最適なプロンプトを3パターン作成してください。プロンプトは必ず日本語で書いてください。指定されたJSON形式のみを出力し、他のテキストは一切含めないでください。

重要: 3パターンすべてで以下のビジュアル要素を統一してください:
- 登場人物の服装（業種に応じたユニフォームを統一）
- メインカラーパレット（アクセントカラーのみ変える）
- 撮影環境・背景（同一の職場空間、アングルのみ変える）
- 人物の年代・人数構成（統一する）
- 照明の質感（自然光ベースで統一）`,
    messages: [{
      role: "user",
      content: `以下の求人情報から、${platform}用の求人バナー画像を生成するためのプロンプトを3パターン作成してください。

## 求人情報
- 職種: ${request.title}
- 会社名: ${request.companyName}
- 業種: ${request.industry}
- キャッチコピー: ${request.catchphrase}
- アスペクト比: ${aspectRatio}

## 統一ルール（3パターン共通で守ること）
- 登場人物は同じ人数（2-3名）、同じ年代（20-30代中心）、同じ服装で描写すること
- 服装は「${request.industry}」業種に適したユニフォーム（例: 介護→白ポロシャツ、IT→ビジネスカジュアル、飲食→制服エプロン、建設→作業着ヘルメット）
- 背景は同一の職場空間とし、カメラのアングルや構図のみ変えること
- 照明は全パターン自然光ベースの明るいトーンで統一
${request.visualStyle ? `
## ビジュアルスタイル指定（前回のスタイルを引き継ぎ）
- 服装: ${request.visualStyle.uniformDescription || "業種に適したユニフォーム"}
- カラーパレット: ${request.visualStyle.colorPalette || "プロフェッショナルな配色"}
- シーン: ${request.visualStyle.sceneDescription || "職場空間"}
` : ""}${request.referenceImage ? `
## 参考画像あり
画像生成時に参考画像が添付されます。各プロンプトの冒頭に「添付の参考画像の構図・色調・雰囲気・スタイルを踏襲しつつ」という指示を必ず含めてください。
` : ""}
## 3パターンの違い（上記統一ルールを守りつつ、以下の点のみ変化させる）
1. **corporate**: 正面アングル、メインカラー＋白の配色、落ち着いたプロフェッショナルな表情
2. **warm**: やや斜めアングル、メインカラー＋暖色アクセント、自然な笑顔・会話シーン
3. **dynamic**: ローアングルまたは広角、メインカラー＋ビビッドなアクセント、活動的な動きのあるシーン

## プロンプト作成ルール
- 必ず日本語で記述すること
- 「${request.industry}」業界と「${request.title}」職種に特化した具体的なシーン描写を含めること（例: 看護師なら「病棟で患者に笑顔で対応する看護師」、ITエンジニアなら「モダンなオフィスでペアプログラミングするエンジニア」）
- 画像内にテキストや文字を含めないよう明示的に指示すること
- 高品質・プロフェッショナルな仕上がりを指示すること
- 日本の求人市場に適した、リアルで自然な人物・職場描写であること
- 各プロンプトは200〜400文字程度

以下のJSON形式で出力してください:
{
  "corporate": "corporateパターンのプロンプト",
  "warm": "warmパターンのプロンプト",
  "dynamic": "dynamicパターンのプロンプト"
}`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text" || !content.text) {
    throw new Error("Claude: プロンプト生成レスポンスが不正です");
  }

  return extractJson<GeneratedPrompts>(content.text);
}

// ---------- Indeed スロット式プロンプト生成（1枚目=CTR重視 / 2枚目=雰囲気 / 3枚目=事業所） ----------

interface GeneratedSlotPrompts {
  slot1: string;
  slot2: string;
  slot3: string;
}

async function generateIndeedSlotPromptsWithClaude(
  request: ThumbnailGenerationRequest,
): Promise<GeneratedSlotPrompts> {
  const shortCopy = shortenCatchCopy(request.catchphrase, request.title);
  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    system: `あなたは画像生成AI（gpt-image-2）向けのプロンプトエンジニアです。日本語の求人情報をもとに、Indeed 用の求人サムネイル3枚（それぞれ目的が異なる）を生成するためのプロンプトを作成してください。プロンプトは必ず日本語で書いてください。指定されたJSON形式のみを出力し、他のテキストは一切含めないでください。

重要: 3スロットすべてで以下のビジュアル要素を統一し、同じ職場の連作として見えるようにしてください:
- 登場人物の服装（業種に応じたユニフォームを統一）
- メインカラーパレット
- 撮影環境・背景（同一の職場空間）
- 照明の質感（自然光ベースで統一）
※人数と構図はスロットごとの要件に従って変えること`,
    messages: [{
      role: "user",
      content: `以下の求人情報から、Indeed 用の求人サムネイル3枚を生成するためのプロンプトをスロット別に作成してください。

## 求人情報
- 職種: ${request.title}
- 会社名: ${request.companyName}
- 業種: ${request.industry}
- キャッチコピー: ${request.catchphrase}
- アスペクト比: 4:3

${buildSlotRequirementsForClaude(shortCopy)}

## 統一ルール
- 服装は「${request.industry}」業種に適したユニフォーム（例: 介護→白ポロシャツ、IT→ビジネスカジュアル、飲食→制服エプロン、建設→作業着ヘルメット）
- 登場人物は20-30代中心
- 3枚とも同一の職場空間・同じカラーパレット・自然光ベースの明るいトーンで統一
${request.visualStyle ? `
## ビジュアルスタイル指定（前回のスタイルを引き継ぎ）
- 服装: ${request.visualStyle.uniformDescription || "業種に適したユニフォーム"}
- カラーパレット: ${request.visualStyle.colorPalette || "プロフェッショナルな配色"}
- シーン: ${request.visualStyle.sceneDescription || "職場空間"}
` : ""}
## プロンプト作成ルール
- 必ず日本語で記述すること
- 「${request.industry}」業界と「${request.title}」職種に特化した具体的なシーン描写を含めること
- 高品質・プロフェッショナルな仕上がりを指示すること
- 日本の求人市場に適した、リアルで自然な人物・職場描写であること
- 各プロンプトは200〜400文字程度

以下のJSON形式で出力してください:
{
  "slot1": "1枚目のプロンプト",
  "slot2": "2枚目のプロンプト",
  "slot3": "3枚目のプロンプト"
}`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text" || !content.text) {
    throw new Error("Claude: プロンプト生成レスポンスが不正です");
  }

  return extractJson<GeneratedSlotPrompts>(content.text);
}

// Claudeプロンプト生成のフォールバック（API未設定時 or エラー時）
function buildFallbackPrompt(
  request: ThumbnailGenerationRequest,
  variant: "corporate" | "warm" | "dynamic",
): string {
  const uniformDesc = request.visualStyle?.uniformDescription || `${request.industry}業種に適したユニフォーム`;
  const colorDesc = request.visualStyle?.colorPalette || "プロフェッショナルな配色";
  const sceneDesc = request.visualStyle?.sceneDescription || `${request.industry}業界の職場空間`;

  const variantDescriptions = {
    corporate: `正面アングル。${sceneDesc}。${uniformDesc}を着た20-30代の2-3名のスタッフ。${colorDesc}をベースに白をアクセントとした清潔感のある配色。落ち着いたプロフェッショナルな表情。自然光ベースの明るい照明。`,
    warm: `やや斜めアングル。${sceneDesc}。${uniformDesc}を着た20-30代の2-3名のスタッフが自然に会話するシーン。${colorDesc}をベースに暖色をアクセントとした温かい色調。自然な笑顔。自然光ベースの明るい照明。`,
    dynamic: `ローアングルまたは広角。${sceneDesc}。${uniformDesc}を着た20-30代の2-3名のスタッフが活動的に働くシーン。${colorDesc}をベースにビビッドなアクセントカラー。動きのあるポーズ。自然光ベースの明るい照明。`,
  };

  return `日本の求人サイト用のプロフェッショナルなバナー画像を生成してください。

職種: ${request.title}
会社: ${request.companyName}
業種: ${request.industry}

ビジュアルスタイル: ${variantDescriptions[variant]}

画像の要件:
- ${request.industry}業界の実際の職場をリアルに表現すること
- 日本の求人市場にふさわしいプロフェッショナルな品質
- 清潔感のある構図で視覚的な余白を持たせること
- 画像内にテキスト、ロゴ、文字を一切含めないこと
- 純粋な写真・ビジュアルのみで構成すること
- 信頼感、成長の可能性、前向きな職場文化を伝えること`;
}

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

// ---------- 画像リサイズ・圧縮（PNG維持 + 高品質） ----------

async function compressImage(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
  maxSizeBytes: number = 2 * 1024 * 1024, // 2MB
): Promise<string> {
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return dataUrl;

  const imageBuffer = Buffer.from(matches[2], "base64");

  // まずPNGで高品質リサイズ（lanczos3）
  let result = await sharp(imageBuffer)
    .resize(maxWidth, maxHeight, { fit: "cover", kernel: "lanczos3" })
    .png({ compressionLevel: 6 })
    .toBuffer();

  // PNGで2MB以下ならそのまま返す
  if (result.length <= maxSizeBytes) {
    return `data:image/png;base64,${result.toString("base64")}`;
  }

  // PNGで超過する場合のみ、高品質JPEGにフォールバック
  let quality = 95;
  result = await sharp(imageBuffer)
    .resize(maxWidth, maxHeight, { fit: "cover", kernel: "lanczos3" })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (result.length > maxSizeBytes && quality > 40) {
    quality -= 5;
    result = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, { fit: "cover", kernel: "lanczos3" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  return `data:image/jpeg;base64,${result.toString("base64")}`;
}

// ---------- 画像生成エンジン (OpenAI gpt-image-2) ----------

const GPT_IMAGE_MODEL = "gpt-image-2";

// アスペクト比 → gpt-image-2 の size 指定
// 制約: 両辺16の倍数 かつ 総ピクセル数 655,360 以上（1024x576 は下回るため不可）
const ASPECT_SIZE_MAP: Record<string, string> = {
  "16:9": "1536x864",
  "3:2": "1536x1024", // 参考画像モードのマスター用（4:3と16:9両方へのクロップ耐性が高い）
  "4:3": "1024x768",
  "1:1": "1024x1024",
  "3:4": "768x1024",
  "9:16": "864x1536",
};

// data URL を mimeType と base64 に分解
function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } | null {
  const matches = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!matches) return null;
  return { mimeType: matches[1], data: matches[2] };
}

// 429レスポンスから待機秒数を取り出す（"Please try again in 12s" 形式）
function parseRetryAfterSeconds(errorBody: string): number {
  const match = errorBody.match(/try again in ([\d.]+)s/);
  const seconds = match ? Math.ceil(parseFloat(match[1])) + 1 : 15;
  return Math.min(seconds, 30);
}

// gpt-image-2 呼び出しコア（参考画像あり = images/edits、なし = images/generations）
// n 枚を1リクエストで生成。429 は待機してリトライ（input-images 5枚/分制限対策）
// referenceImages: 複数指定時は images/edits に image[] 配列で添付する
//（プロンプト側で「1枚目の画像」「2枚目の画像」と役割を参照するため、添付順を保つこと）
async function callGptImage(
  prompt: string,
  aspectRatio: string,
  referenceImages: string[] | null,
  n: number,
  maxRetries: number = 2,
): Promise<string[]> {
  const apiKey = getApiKey();
  const size = ASPECT_SIZE_MAP[aspectRatio] || "1024x1024";

  for (let attempt = 0; ; attempt++) {
    let response: Response;
    if (referenceImages && referenceImages.length > 0) {
      const form = new FormData();
      form.append("model", GPT_IMAGE_MODEL);
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("n", String(n));
      const fieldName = referenceImages.length === 1 ? "image" : "image[]";
      for (let i = 0; i < referenceImages.length; i++) {
        const inline = dataUrlToInlineData(referenceImages[i]);
        if (!inline) throw new Error("gpt-image-2: 参考画像の data URL が不正です");
        form.append(
          fieldName,
          new Blob([new Uint8Array(Buffer.from(inline.data, "base64"))], { type: inline.mimeType }),
          `reference-${i + 1}.png`
        );
      }
      response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GPT_IMAGE_MODEL,
          prompt,
          size,
          n,
        }),
      });
    }

    if (response.ok) {
      const data = await response.json();
      const urls = ((data.data ?? []) as Array<{ b64_json?: string }>)
        .filter((d) => d.b64_json)
        .map((d) => `data:image/png;base64,${d.b64_json}`);
      if (urls.length === 0) {
        throw new Error("gpt-image-2: 画像データが含まれていませんでした");
      }
      recordImageUsage(urls.length);
      return urls;
    }

    const errorBody = await response.text();
    if (response.status === 429 && attempt < maxRetries) {
      const waitSec = parseRetryAfterSeconds(errorBody);
      console.warn(`[gpt-image] 429 レート制限。${waitSec}秒待機してリトライ (${attempt + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
      continue;
    }
    throw new Error(`gpt-image-2: ${response.status} ${response.statusText} - ${errorBody}`);
  }
}

// gpt-image-2 で1枚生成
async function generateWithGptImage(
  prompt: string,
  aspectRatio: string = "16:9",
  referenceImage?: string | null,
): Promise<string> {
  const urls = await callGptImage(prompt, aspectRatio, referenceImage ? [referenceImage] : null, 1);
  return urls[0];
}

// ---------- 媒体別生成 ----------

// 参考画像モード用プロンプト: 画像を主役にした短い編集指示
// （詳細なシーン描写プロンプトは参考画像と競合して「似ない」原因になるため使わない）
// 3バリエーションで変化の軸を明示し、同じ絵が複数枚出るのを防ぐ
export type ReferenceVariant = "faithful" | "angle" | "scene";

function buildReferenceEditPrompt(
  request: ThumbnailGenerationRequest,
  variant: ReferenceVariant = "faithful",
): string {
  const base = `「${request.industry}」業界の「${request.title}」の求人バナー用写真として仕上げてください。人物の表情は明るく親しみやすく。画像内にテキスト・ロゴ・文字は一切入れないでください。`;

  switch (variant) {
    case "faithful":
      return `添付の参考画像をベースに、構図・人物の配置・服装・背景・色調・照明・全体の雰囲気を忠実に維持したまま、${base}`;
    case "angle":
      return `添付の参考画像と同じ人物・服装・場所・色調・照明の雰囲気を保ったまま、カメラアングルと人物のポーズを変えた別カットとして描いてください。${base}`;
    case "scene":
      return `添付の参考画像と同じ人物・服装・職場・色調の世界観を保ったまま、実際に業務をしている動きのある別のシーンとして描いてください。${base}`;
  }
}

// Indeed 専用: スロット式（1枚目=クリック率重視 / 2枚目=職場の雰囲気 / 3枚目=事業所）
// スロットごとに参照画像の組み合わせで生成方法を切り替える:
// - 参考サムネ（構図）+ 事業所写真（素材）: 2枚を image[] で添付し、役割をプロンプトで指定
// - 参考サムネのみ: 構図を踏襲し、内容はプロンプト記述から生成
// - 事業所写真のみ: 写真の雰囲気（内装・色調・服装・照明）を引き継ぐ（3枚目のみ構図も忠実に維持）
// - どちらもなし: Claude でスロット別プロンプトを生成してテキスト生成
// 参照画像と競合するため、i2i 時は Claude の詳細シーン描写はスキップし短い編集プロンプトを使う。
// スロット順（=配列順）を維持し、失敗分はスロット位置を保ったまま1回リトライする。
async function generateIndeedSlotThumbnails(
  request: ThumbnailGenerationRequest,
): Promise<{ urls: string[]; allSuccess: boolean }> {
  const config = PLATFORM_IMAGE_CONFIG.indeed;
  const referenceImage = request.referenceImage || null;
  const compositionRefs = [
    request.compositionRefs?.slot1 || null,
    request.compositionRefs?.slot2 || null,
    request.compositionRefs?.slot3 || null,
  ];
  const info = {
    jobTitle: request.title,
    catchphrase: request.catchphrase,
    companyName: request.companyName,
    industry: request.industry,
  };

  // 参照画像が一切ないスロットがある場合のみ Claude で t2i プロンプトを生成
  const needsT2i = compositionRefs.some((comp) => !comp && !referenceImage);
  let t2iPrompts: GeneratedSlotPrompts | null = null;
  if (needsT2i) {
    try {
      t2iPrompts = await generateIndeedSlotPromptsWithClaude(request);
      console.log("[thumbnail] indeed: スロット別プロンプト生成成功");
    } catch (error) {
      console.warn("[thumbnail] indeed: スロット別プロンプト生成失敗、フォールバック使用:", error);
      t2iPrompts = {
        slot1: buildIndeedSlotBasePrompt(1, info, request.visualStyle),
        slot2: buildIndeedSlotBasePrompt(2, info, request.visualStyle),
        slot3: buildIndeedSlotBasePrompt(3, info, request.visualStyle),
      };
    }
  }

  const slotJobs = ([1, 2, 3] as const).map((slot, i) => {
    const comp = compositionRefs[i];
    if (comp && referenceImage) {
      // 添付順は [構図参考, 素材] 固定（プロンプトが「1枚目/2枚目の画像」で参照）
      return {
        mode: "構図+写真",
        prompt: buildIndeedSlotDualReferencePrompt(slot, info),
        references: [comp, referenceImage],
      };
    }
    if (comp) {
      return {
        mode: "構図のみ",
        prompt: buildIndeedSlotCompositionPrompt(slot, info, request.visualStyle),
        references: [comp],
      };
    }
    if (referenceImage) {
      return {
        mode: "写真のみ",
        prompt: buildIndeedSlotReferencePrompt(slot, info),
        references: [referenceImage],
      };
    }
    return {
      mode: "テキスト生成",
      prompt: t2iPrompts![`slot${slot}` as keyof GeneratedSlotPrompts],
      references: null,
    };
  });
  console.log(
    `[thumbnail] indeed: スロット式生成（${slotJobs.map((j, i) => `${i + 1}枚目=${j.mode}`).join(" / ")}）`
  );

  const slotResults: (string | null)[] = [null, null, null];
  const runSlot = async (i: number) => {
    const urls = await callGptImage(slotJobs[i].prompt, config.aspectRatio, slotJobs[i].references, 1);
    slotResults[i] = urls[0];
  };

  const results = await Promise.allSettled(slotJobs.map((_, i) => runSlot(i)));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? i : -1))
    .filter((i) => i >= 0);
  for (const i of failed) {
    console.error(`[gpt-image] indeed/slot${i + 1} failed:`, (results[i] as PromiseRejectedResult).reason);
  }

  // 失敗分を1回だけリトライ（一時的なレート制限・5xx対策）
  if (failed.length > 0) {
    console.log(`[gpt-image] indeed: ${failed.length}スロット失敗。リトライ...`);
    const retryResults = await Promise.allSettled(failed.map((i) => runSlot(i)));
    for (let j = 0; j < retryResults.length; j++) {
      if (retryResults[j].status === "rejected") {
        console.error(
          `[gpt-image] indeed/slot${failed[j] + 1} retry also failed:`,
          (retryResults[j] as PromiseRejectedResult).reason
        );
      }
    }
  }

  const generated = slotResults.filter((url): url is string => url !== null);
  const urls = await Promise.all(
    generated.map((url) => compressImage(url, config.width, config.height))
  );
  return { urls, allSuccess: urls.length === 3 };
}

// 1媒体分（3バリエーション）を生成してリサイズ・圧縮
async function generateForPlatform(
  request: ThumbnailGenerationRequest,
  platform: keyof typeof PLATFORM_IMAGE_CONFIG,
): Promise<{ urls: string[]; allSuccess: boolean }> {
  // Indeed はスロット式で生成（Team A / Team B 共通経路）
  if (platform === "indeed") {
    return generateIndeedSlotThumbnails(request);
  }

  const config = PLATFORM_IMAGE_CONFIG[platform];
  const referenceImage = request.referenceImage || null;
  console.log(
    `[thumbnail] ${platform}: 参考画像=${referenceImage ? `あり(${Math.round(referenceImage.length / 1024)}KB, images/edits使用)` : "なし(images/generations使用)"}`
  );

  let urls: string[] = [];
  let allSuccess = false;

  if (referenceImage) {
    // 参考画像モード: 変化の軸が異なる3プロンプト × 各1枚（input-images 消費は計3枚分）
    // プロンプトは参考画像ファーストの短文（Claudeのシーン描写はスキップ）
    const refVariants: ReferenceVariant[] = ["faithful", "angle", "scene"];
    const refResults = await Promise.allSettled(
      refVariants.map((variant) =>
        callGptImage(buildReferenceEditPrompt(request, variant), config.aspectRatio, [referenceImage], 1)
      )
    );
    for (let i = 0; i < refResults.length; i++) {
      if (refResults[i].status === "fulfilled") {
        urls.push(...(refResults[i] as PromiseFulfilledResult<string[]>).value);
      } else {
        console.error(
          `[gpt-image] ${platform}: 参考画像モード ${refVariants[i]} 生成失敗:`,
          (refResults[i] as PromiseRejectedResult).reason
        );
      }
    }
    allSuccess = urls.length >= 3;
  } else {
    // 通常モード: Claude で3パターンのプロンプトを生成し並列実行
    const variants: Array<"corporate" | "warm" | "dynamic"> = ["corporate", "warm", "dynamic"];
    let prompts: GeneratedPrompts;
    try {
      prompts = await generateImagePromptsWithClaude(request, platform, config.aspectRatio);
      console.log(`[thumbnail] ${platform}: Claude プロンプト生成成功`);
    } catch (error) {
      console.warn(`[thumbnail] ${platform}: Claude プロンプト生成失敗、フォールバック使用:`, error);
      prompts = {
        corporate: buildFallbackPrompt(request, "corporate"),
        warm: buildFallbackPrompt(request, "warm"),
        dynamic: buildFallbackPrompt(request, "dynamic"),
      };
    }

    const variantPrompts = [prompts.corporate, prompts.warm, prompts.dynamic];
    const results = await Promise.allSettled(
      variantPrompts.map((prompt) => generateWithGptImage(prompt, config.aspectRatio))
    );

    const failedIndices: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        urls.push((results[i] as PromiseFulfilledResult<string>).value);
      } else {
        console.error(`[gpt-image] ${platform}/${variants[i]} failed:`, (results[i] as PromiseRejectedResult).reason);
        failedIndices.push(i);
      }
    }

    // 失敗分を1回だけリトライ（一時的なレート制限・5xx対策）
    if (failedIndices.length > 0) {
      console.log(`[gpt-image] ${platform}: ${failedIndices.length}枚失敗。リトライ...`);
      const fallbackResults = await Promise.allSettled(
        failedIndices.map((i) => generateWithGptImage(variantPrompts[i], config.aspectRatio))
      );
      for (const result of fallbackResults) {
        if (result.status === "fulfilled") {
          urls.push(result.value);
        } else {
          console.error(`[gpt-image] ${platform} retry also failed:`, result.reason);
        }
      }
    }
    allSuccess = failedIndices.length === 0;
  }

  // リサイズ・圧縮（PNG維持 + 高品質lanczos3）
  const compressedUrls = await Promise.all(
    urls.map((url) => compressImage(url, config.width, config.height))
  );

  return { urls: compressedUrls, allSuccess };
}

// ---------- パブリックAPI ----------

// 参考画像モード（AirWork / JobMedley 用）: マスター画像を生成し、対象媒体へクロップ配布する
// OpenAI の input-images レート制限（5枚/分）は「n × 入力画像数」で消費されるため、
// 媒体ごとに生成すると1分の枠に収まらない。マスター1回（3枚分）なら確実、かつ高速。
// ※ Indeed はスロット式（generateIndeedSlotThumbnails）で生成するためここでは扱わない。
async function generateReferenceThumbnails(
  request: ThumbnailGenerationRequest,
  referenceImage: string,
  platforms: ("airwork" | "jobmedley")[],
): Promise<{ airwork: string[]; jobmedley: string[]; allSuccess: boolean }> {
  console.log(
    `[thumbnail] 参考画像モード: マスター3種生成(3:2, 忠実/アングル違い/シーン違い) → ${platforms.join("/")}へクロップ配布 (参考画像 ${Math.round(referenceImage.length / 1024)}KB)`
  );

  // 変化の軸が異なる3プロンプト × 各1枚（input-images 消費は計3枚分で n=3 一括と同じ）
  const variants: ReferenceVariant[] = ["faithful", "angle", "scene"];
  const results = await Promise.allSettled(
    variants.map((variant) =>
      callGptImage(buildReferenceEditPrompt(request, variant), "3:2", [referenceImage], 1)
    )
  );

  const masters: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      masters.push(...(results[i] as PromiseFulfilledResult<string[]>).value);
    } else {
      console.error(
        `[gpt-image] 参考画像モード: ${variants[i]} 生成失敗:`,
        (results[i] as PromiseRejectedResult).reason
      );
    }
  }

  if (masters.length === 0) {
    return { airwork: [], jobmedley: [], allSuccess: false };
  }

  const cropTo = (platform: "airwork" | "jobmedley") => {
    if (!platforms.includes(platform)) return Promise.resolve([] as string[]);
    const config = PLATFORM_IMAGE_CONFIG[platform];
    return Promise.all(masters.map((url) => compressImage(url, config.width, config.height)));
  };

  const [airwork, jobmedley] = await Promise.all([cropTo("airwork"), cropTo("jobmedley")]);

  return { airwork, jobmedley, allSuccess: masters.length >= 3 };
}

// メイン: 指定媒体分を並列生成（未指定は indeed / airwork / jobmedley の3媒体）
export async function generatePlatformThumbnails(
  request: ThumbnailGenerationRequest,
  platforms: ("indeed" | "airwork" | "jobmedley")[] = ["indeed", "airwork", "jobmedley"],
): Promise<PlatformThumbnailsResponse> {
  const apiKey = getApiKey();

  const fallbackThumbnails = (): PlatformThumbnails => ({
    indeed: platforms.includes("indeed") ? makePlaceholders(800, 600) : [],
    airwork: platforms.includes("airwork") ? makePlaceholders(800, 600) : [],
    jobmedley: platforms.includes("jobmedley") ? makePlaceholders(1024, 576) : [],
    hellowork: [],
  });

  if (!apiKey) {
    console.log("[gpt-image] OPENAI_API_KEY未設定。プレースホルダーを使用します。");
    return {
      thumbnails: fallbackThumbnails(),
      status: "placeholder",
      message: "OPENAI_API_KEY未設定のためプレースホルダー画像を使用しています",
    };
  }

  // 参考画像あり:
  // - Indeed はスロット式（事業所写真は3枚目のみ i2i、1・2枚目はテキスト生成）
  // - AirWork / JobMedley はマスター生成 → クロップ配布（従来どおり）
  if (request.referenceImage) {
    const masterPlatforms = platforms.filter(
      (p): p is "airwork" | "jobmedley" => p !== "indeed"
    );
    const [indeedResult, masterResult] = await Promise.all([
      platforms.includes("indeed")
        ? generateForPlatform(request, "indeed")
        : Promise.resolve({ urls: [] as string[], allSuccess: true }),
      masterPlatforms.length > 0
        ? generateReferenceThumbnails(request, request.referenceImage, masterPlatforms)
        : Promise.resolve({ airwork: [] as string[], jobmedley: [] as string[], allSuccess: true }),
    ]);

    const selected = {
      indeed: indeedResult.urls,
      airwork: masterResult.airwork,
      jobmedley: masterResult.jobmedley,
    };
    const total = selected.indeed.length + selected.airwork.length + selected.jobmedley.length;

    if (total === 0) {
      return {
        thumbnails: fallbackThumbnails(),
        status: "error",
        message: "参考画像ベースのサムネイル生成に失敗しました",
      };
    }

    return {
      thumbnails: { ...selected, hellowork: [] },
      status: "success",
      message: `参考画像を活用して${total}枚のサムネイルを生成しました（gpt-image-2）`,
    };
  }

  const skipped = { urls: [] as string[], allSuccess: true };
  const [indeedResult, airworkResult, jobmedleyResult] = await Promise.all([
    platforms.includes("indeed") ? generateForPlatform(request, "indeed") : Promise.resolve(skipped),
    platforms.includes("airwork") ? generateForPlatform(request, "airwork") : Promise.resolve(skipped),
    platforms.includes("jobmedley") ? generateForPlatform(request, "jobmedley") : Promise.resolve(skipped),
  ]);

  const totalGenerated =
    indeedResult.urls.length + airworkResult.urls.length + jobmedleyResult.urls.length;

  if (totalGenerated === 0) {
    return {
      thumbnails: fallbackThumbnails(),
      status: "error",
      message: "全サムネイル生成に失敗しました",
    };
  }

  const allSuccess =
    indeedResult.allSuccess && airworkResult.allSuccess && jobmedleyResult.allSuccess;
  const model = allSuccess ? "gpt-image-2" : "gpt-image-2 (一部リトライ)";

  return {
    thumbnails: {
      indeed: indeedResult.urls,
      airwork: airworkResult.urls,
      jobmedley: jobmedleyResult.urls,
      hellowork: [],
    },
    status: "success",
    message: `${totalGenerated}枚のサムネイルを生成しました（${model}）`,
  };
}

// 単一媒体用（Team B用）: 指定媒体のみ3枚生成
export async function generatePlatformThumbnailsSingle(
  request: ThumbnailGenerationRequest,
  platform: keyof typeof PLATFORM_IMAGE_CONFIG,
): Promise<PlatformThumbnailsResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log("[gpt-image] OPENAI_API_KEY未設定。プレースホルダーを使用します。");
    const config = PLATFORM_IMAGE_CONFIG[platform];
    return {
      thumbnails: {
        indeed: platform === "indeed" ? makePlaceholders(config.width, config.height) : [],
        airwork: platform === "airwork" ? makePlaceholders(config.width, config.height) : [],
        jobmedley: platform === "jobmedley" ? makePlaceholders(config.width, config.height) : [],
        hellowork: [],
      },
      status: "placeholder",
      message: "OPENAI_API_KEY未設定のためプレースホルダー画像を使用しています",
    };
  }

  const result = await generateForPlatform(request, platform);

  if (result.urls.length === 0) {
    const config = PLATFORM_IMAGE_CONFIG[platform];
    return {
      thumbnails: {
        indeed: platform === "indeed" ? makePlaceholders(config.width, config.height) : [],
        airwork: platform === "airwork" ? makePlaceholders(config.width, config.height) : [],
        jobmedley: platform === "jobmedley" ? makePlaceholders(config.width, config.height) : [],
        hellowork: [],
      },
      status: "error",
      message: "サムネイル生成に失敗しました",
    };
  }

  return {
    thumbnails: {
      indeed: platform === "indeed" ? result.urls : [],
      airwork: platform === "airwork" ? result.urls : [],
      jobmedley: platform === "jobmedley" ? result.urls : [],
      hellowork: [],
    },
    status: "success",
    message: `${result.urls.length}枚のサムネイルを生成しました（${platform}）`,
  };
}

// レガシー: 旧API互換（deprecated）
export async function generateThumbnails(
  request: ThumbnailGenerationRequest
): Promise<ThumbnailGenerationResponse> {
  const result = await generatePlatformThumbnails(request);
  return {
    urls: [
      ...result.thumbnails.indeed,
      ...result.thumbnails.airwork,
      ...result.thumbnails.jobmedley,
    ],
    status: result.status,
    message: result.message,
  };
}

// ---------- サムネイル単体再生成（サムネイルスタジオ機能） ----------

export type ThumbnailPlatform = keyof typeof PLATFORM_IMAGE_CONFIG;

export interface RegenerateThumbnailsRequest {
  prompt: string;
  platform: ThumbnailPlatform;
  referenceImage?: string | null; // data URL
  count?: number; // 1〜3
}

export interface RegenerateThumbnailsResponse {
  urls: string[]; // base64 data URLs（媒体サイズに圧縮済み）
  status: "success" | "error";
  message: string;
}

// プロンプト＋参考画像から指定媒体のサムネイルを再生成
// 1リクエスト(n=count)でまとめて生成（input-images レート制限の消費を最小化）
export async function regenerateThumbnails(
  request: RegenerateThumbnailsRequest
): Promise<RegenerateThumbnailsResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { urls: [], status: "error", message: "OPENAI_API_KEY未設定のため生成できません" };
  }

  const config = PLATFORM_IMAGE_CONFIG[request.platform];
  const count = Math.min(Math.max(Math.floor(request.count ?? 1), 1), 3);
  const referenceImage = request.referenceImage || null;

  let urls: string[] = [];
  try {
    const generated = await callGptImage(
      request.prompt,
      config.aspectRatio,
      referenceImage ? [referenceImage] : null,
      count
    );
    urls = await Promise.all(
      generated.map((dataUrl) => compressImage(dataUrl, config.width, config.height))
    );
  } catch (error) {
    console.error(`[regenerate] ${request.platform} 生成失敗:`, error);
  }

  if (urls.length === 0) {
    return { urls: [], status: "error", message: "サムネイル生成に失敗しました" };
  }

  return {
    urls,
    status: "success",
    message: `${urls.length}枚のサムネイルを生成しました`,
  };
}

