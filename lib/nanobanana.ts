// 画像生成API
// エンジン: OpenAI gpt-image-2（テキスト生成 = images/generations、参考画像あり = images/edits）
// プロンプト生成: Claude API で求人情報から最適な画像プロンプトを自動生成
// 2026-07 改定: 全媒体（indeed/airwork/jobmedley）をスロット式5枚生成に統一。
// 生成前にユーザーが選択した方向性（ThumbnailDirection）をプロンプトへ注入する。

import sharp from "sharp";
import { anthropic, DEFAULT_MODEL } from "@/lib/claude";
import { recordImageUsage } from "@/lib/api-cost";
import { ThumbnailDirection } from "@/types/thumbnail-direction";
import {
  ThumbnailSlot,
  buildSlotBasePrompt,
  buildSlotCompositionPrompt,
  buildSlotDualReferencePrompt,
  buildSlotReferencePrompt,
  buildSlotRequirementsForClaude,
  resolveSlotPlan,
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
  // アップ画像（事業所写真、data URL）。人物・雰囲気のみの素材参考として images/edits に添付する
  referenceImage?: string | null;
  // 登録画像（参考サムネ = 構図・デザイン参考、スロット別・data URL）
  compositionRefs?: {
    slot1?: string | null;
    slot2?: string | null;
    slot3?: string | null;
    slot4?: string | null;
    slot5?: string | null;
  };
  // 生成前にユーザーが選択した方向性。未指定は方向性なしで生成
  direction?: ThumbnailDirection;
}

export interface ThumbnailGenerationResponse {
  urls: string[]; // base64 data URLs ("data:image/png;base64,...")
  status: "success" | "placeholder" | "error";
  message?: string;
}

// 媒体別サムネイル型
export interface PlatformThumbnails {
  indeed: string[];   // 5枚, 800×600
  airwork: string[];  // 5枚, 800×600
  jobmedley: string[]; // 5枚, 1024×576
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

const SLOT_NUMBERS: ThumbnailSlot[] = [1, 2, 3, 4, 5];

function makePlaceholders(width: number, height: number): string[] {
  return SLOT_NUMBERS.map(
    (slot) => `https://placehold.co/${width}x${height}/1e40af/ffffff?text=サムネイル+${slot}`
  );
}

// ---------- Claude によるスロット別プロンプト生成（方向性なしの t2i フォールバック） ----------

type GeneratedSlotPrompts = Record<`slot${ThumbnailSlot}`, string>;

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

async function generateSlotPromptsWithClaude(
  request: ThumbnailGenerationRequest,
  platformLabel: string,
  aspectRatio: string,
): Promise<GeneratedSlotPrompts> {
  const shortCopy = shortenCatchCopy(request.catchphrase, request.title);
  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 3000,
    system: `あなたは画像生成AI（gpt-image-2）向けのプロンプトエンジニアです。日本語の求人情報をもとに、${platformLabel} 用の求人サムネイル5枚（それぞれ目的が異なる）を生成するためのプロンプトを作成してください。プロンプトは必ず日本語で書いてください。指定されたJSON形式のみを出力し、他のテキストは一切含めないでください。

重要: 5スロットすべてで以下のビジュアル要素を統一し、同じ職場の連作として見えるようにしてください:
- 登場人物の服装（業種に応じたユニフォームを統一）
- メインカラーパレット
- 撮影環境・背景（同一の職場空間）
- 照明の質感（自然光ベースで統一）
※人数と構図はスロットごとの要件に従って変えること`,
    messages: [{
      role: "user",
      content: `以下の求人情報から、${platformLabel} 用の求人サムネイル5枚を生成するためのプロンプトをスロット別に作成してください。

## 求人情報
- 職種: ${request.title}
- 会社名: ${request.companyName}
- 業種: ${request.industry}
- キャッチコピー: ${request.catchphrase}
- アスペクト比: ${aspectRatio}

${buildSlotRequirementsForClaude(shortCopy)}

## 統一ルール
- 服装は「${request.industry}」業種に適したユニフォーム（例: 介護→白ポロシャツ、IT→ビジネスカジュアル、飲食→制服エプロン、建設→作業着ヘルメット）
- 登場人物は20-30代中心
- 5枚とも同一の職場空間・同じカラーパレット・自然光ベースの明るいトーンで統一
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
  "slot3": "3枚目のプロンプト",
  "slot4": "4枚目のプロンプト",
  "slot5": "5枚目のプロンプト"
}`,
    }],
  });

  const content = message.content[0];
  if (content.type !== "text" || !content.text) {
    throw new Error("Claude: プロンプト生成レスポンスが不正です");
  }

  return extractJson<GeneratedSlotPrompts>(content.text);
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
  "3:2": "1536x1024",
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

// ---------- スロット式生成（全媒体共通: 1〜5枚目） ----------

// スロットごとに参照画像の組み合わせで生成方法を切り替える:
// - 参考サムネ（構図・デザイン）+ 事業所写真（人物・雰囲気素材）: 2枚を image[] で添付し、役割をプロンプトで指定
// - 参考サムネのみ: 構図・デザインを踏襲し、内容はプロンプト記述から生成
// - 事業所写真のみ: 写真の人物・内装の雰囲気のみを引き継ぐ（構図はスロットの目的に従う）
// - どちらもなし: 方向性があれば直接プロンプト構築、なければ Claude でスロット別プロンプトを生成
// 参照画像と競合するため、i2i 時は Claude の詳細シーン描写はスキップし短い編集プロンプトを使う。
// input-images レート制限（5枚/分）対策として、スロットは 3+2 の2バッチ逐次で実行する。
// スロット順（=配列順）を維持し、失敗分はスロット位置を保ったまま1回リトライする。
async function generateSlotThumbnails(
  request: ThumbnailGenerationRequest,
  platform: keyof typeof PLATFORM_IMAGE_CONFIG,
): Promise<{ urls: string[]; allSuccess: boolean }> {
  const config = PLATFORM_IMAGE_CONFIG[platform];
  const referenceImage = request.referenceImage || null;
  const direction = request.direction;
  const compositionRefs = SLOT_NUMBERS.map(
    (slot) => request.compositionRefs?.[`slot${slot}`] || null
  );
  const info = {
    jobTitle: request.title,
    catchphrase: request.catchphrase,
    companyName: request.companyName,
    industry: request.industry,
  };

  // 参照画像が一切ないスロット用の t2i プロンプトを準備
  // 方向性ありは直接構築（Claude 呼び出し不要）、なしは Claude 生成 → 失敗時ベースプロンプト
  const needsT2i = compositionRefs.some((comp) => !comp && !referenceImage);
  let t2iPrompts: GeneratedSlotPrompts | null = null;
  if (needsT2i) {
    if (direction) {
      t2iPrompts = Object.fromEntries(
        SLOT_NUMBERS.map((slot) => [
          `slot${slot}`,
          buildSlotBasePrompt(slot, info, request.visualStyle, resolveSlotPlan(direction, slot)),
        ])
      ) as GeneratedSlotPrompts;
    } else {
      try {
        t2iPrompts = await generateSlotPromptsWithClaude(request, platform, config.aspectRatio);
        console.log(`[thumbnail] ${platform}: スロット別プロンプト生成成功`);
      } catch (error) {
        console.warn(`[thumbnail] ${platform}: スロット別プロンプト生成失敗、フォールバック使用:`, error);
        t2iPrompts = Object.fromEntries(
          SLOT_NUMBERS.map((slot) => [
            `slot${slot}`,
            buildSlotBasePrompt(slot, info, request.visualStyle),
          ])
        ) as GeneratedSlotPrompts;
      }
    }
  }

  const slotJobs = SLOT_NUMBERS.map((slot, i) => {
    const plan = resolveSlotPlan(direction, slot);
    const comp = compositionRefs[i];
    if (comp && referenceImage) {
      // 添付順は [構図参考, 素材] 固定（プロンプトが「1枚目/2枚目の画像」で参照）
      return {
        mode: "構図+写真",
        prompt: buildSlotDualReferencePrompt(slot, info, plan),
        references: [comp, referenceImage],
      };
    }
    if (comp) {
      return {
        mode: "構図のみ",
        prompt: buildSlotCompositionPrompt(slot, info, request.visualStyle, plan),
        references: [comp],
      };
    }
    if (referenceImage) {
      return {
        mode: "写真のみ",
        prompt: buildSlotReferencePrompt(slot, info, plan),
        references: [referenceImage],
      };
    }
    return {
      mode: "テキスト生成",
      prompt: t2iPrompts![`slot${slot}`],
      references: null,
    };
  });
  console.log(
    `[thumbnail] ${platform}: スロット式生成（${slotJobs.map((j, i) => `${i + 1}枚目=${j.mode}`).join(" / ")}${direction ? ` / 方向性=${direction.name}` : ""}）`
  );

  const slotResults: (string | null)[] = SLOT_NUMBERS.map(() => null);
  const runSlot = async (i: number) => {
    const urls = await callGptImage(slotJobs[i].prompt, config.aspectRatio, slotJobs[i].references, 1);
    slotResults[i] = urls[0];
  };

  // input-images レート制限対策: 3+2 の2バッチ逐次
  const batches = [[0, 1, 2], [3, 4]];
  const failed: number[] = [];
  for (const batch of batches) {
    const results = await Promise.allSettled(batch.map((i) => runSlot(i)));
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "rejected") {
        failed.push(batch[j]);
        console.error(
          `[gpt-image] ${platform}/slot${batch[j] + 1} failed:`,
          (results[j] as PromiseRejectedResult).reason
        );
      }
    }
  }

  // 失敗分を1回だけリトライ（一時的なレート制限・5xx対策）
  if (failed.length > 0) {
    console.log(`[gpt-image] ${platform}: ${failed.length}スロット失敗。リトライ...`);
    const retryResults = await Promise.allSettled(failed.map((i) => runSlot(i)));
    for (let j = 0; j < retryResults.length; j++) {
      if (retryResults[j].status === "rejected") {
        console.error(
          `[gpt-image] ${platform}/slot${failed[j] + 1} retry also failed:`,
          (retryResults[j] as PromiseRejectedResult).reason
        );
      }
    }
  }

  const generated = slotResults.filter((url): url is string => url !== null);
  const urls = await Promise.all(
    generated.map((url) => compressImage(url, config.width, config.height))
  );
  return { urls, allSuccess: urls.length === SLOT_NUMBERS.length };
}

// ---------- パブリックAPI ----------

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

  const skipped = { urls: [] as string[], allSuccess: true };
  const [indeedResult, airworkResult, jobmedleyResult] = await Promise.all([
    platforms.includes("indeed") ? generateSlotThumbnails(request, "indeed") : Promise.resolve(skipped),
    platforms.includes("airwork") ? generateSlotThumbnails(request, "airwork") : Promise.resolve(skipped),
    platforms.includes("jobmedley") ? generateSlotThumbnails(request, "jobmedley") : Promise.resolve(skipped),
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

// 単一媒体用（Team B用）: 指定媒体のみ5枚生成
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

  const result = await generateSlotThumbnails(request, platform);

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
