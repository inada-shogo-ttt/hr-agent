// 画像生成API
// メイン: Imagen 4 (imagen-4.0-generate-001) — Google最新・最高品質
// フォールバック: Nano Banana (gemini-2.5-flash-image)
// プロンプト生成: Claude API で求人情報から最適な画像プロンプトを自動生成

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { anthropic, DEFAULT_MODEL } from "@/lib/claude";

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

const PLACEHOLDER_THUMBNAILS = [
  "https://placehold.co/1344x768/1e40af/ffffff?text=サムネイル+1",
  "https://placehold.co/1344x768/1d4ed8/ffffff?text=サムネイル+2",
  "https://placehold.co/1344x768/2563eb/ffffff?text=サムネイル+3",
];

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

async function generateImagePromptsWithClaude(
  request: ThumbnailGenerationRequest,
  platform: string,
  aspectRatio: string,
): Promise<GeneratedPrompts> {
  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    system: `あなたは画像生成AI（Imagen 4）向けのプロンプトエンジニアです。日本語の求人情報をもとに、求人バナー画像を生成するための最適なプロンプトを3パターン作成してください。プロンプトは必ず日本語で書いてください。指定されたJSON形式のみを出力し、他のテキストは一切含めないでください。

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

  // JSONを抽出（```json ブロック or 裸のJSON）
  const text = content.text;
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as GeneratedPrompts;
  } catch {
    // フォールバック: 最初の { から最後の } まで
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as GeneratedPrompts;
    }
    throw new Error("Claude: プロンプトJSONの解析に失敗しました");
  }
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
  return (
    process.env.GEMINI_API_KEY ||
    process.env.NANOBANANA_API_KEY ||
    process.env.GOOGLE_AI_API_KEY
  );
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

// ---------- 画像生成エンジン ----------

// Imagen 4 で1バリエーションを生成
async function generateWithImagen4(
  ai: GoogleGenAI,
  prompt: string,
  aspectRatio: string = "16:9",
): Promise<string> {
  const response = await ai.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio,
    },
  });

  const images = response.generatedImages ?? [];
  if (images.length === 0 || !images[0].image?.imageBytes) {
    throw new Error("Imagen 4: 画像データが含まれていませんでした");
  }

  return `data:image/png;base64,${images[0].image.imageBytes}`;
}

// Nano Banana (Gemini) フォールバック
async function generateWithNanoBanana(
  ai: GoogleGenAI,
  prompt: string,
  aspectRatio: string = "16:9",
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio,
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Nano Banana: 画像データが含まれていませんでした");
}

// ---------- 媒体別生成 ----------

// 1媒体分（3バリエーション）を生成してリサイズ・圧縮
async function generateForPlatform(
  ai: GoogleGenAI,
  request: ThumbnailGenerationRequest,
  platform: keyof typeof PLATFORM_IMAGE_CONFIG,
): Promise<{ urls: string[]; allSuccess: boolean }> {
  const config = PLATFORM_IMAGE_CONFIG[platform];
  const variants: Array<"corporate" | "warm" | "dynamic"> = ["corporate", "warm", "dynamic"];

  // Claude でプロンプトを生成（失敗時はフォールバック）
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

  // Imagen 4 で試行
  const results = await Promise.allSettled(
    variantPrompts.map((prompt) =>
      generateWithImagen4(ai, prompt, config.aspectRatio)
    )
  );

  const urls: string[] = [];
  const failedIndices: number[] = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      urls.push((results[i] as PromiseFulfilledResult<string>).value);
    } else {
      console.error(`[imagen4] ${platform}/${variants[i]} failed:`, (results[i] as PromiseRejectedResult).reason);
      failedIndices.push(i);
    }
  }

  // 失敗分を Nano Banana でフォールバック
  if (failedIndices.length > 0) {
    console.log(`[imagen4] ${platform}: ${failedIndices.length}枚失敗。Nano Banana でフォールバック...`);
    const fallbackResults = await Promise.allSettled(
      failedIndices.map((i) =>
        generateWithNanoBanana(ai, variantPrompts[i], config.aspectRatio)
      )
    );

    for (const result of fallbackResults) {
      if (result.status === "fulfilled") {
        urls.push(result.value);
      } else {
        console.error(`[fallback] ${platform} Nano Banana also failed:`, result.reason);
      }
    }
  }

  // リサイズ・圧縮（PNG維持 + 高品質lanczos3）
  const compressedUrls = await Promise.all(
    urls.map((url) => compressImage(url, config.width, config.height))
  );

  return { urls: compressedUrls, allSuccess: failedIndices.length === 0 };
}

// ---------- パブリックAPI ----------

// メイン: 3媒体分を並列生成
export async function generatePlatformThumbnails(
  request: ThumbnailGenerationRequest
): Promise<PlatformThumbnailsResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log("[imagen4] GEMINI_API_KEY未設定。プレースホルダーを使用します。");
    return {
      thumbnails: {
        indeed: makePlaceholders(800, 600),
        airwork: makePlaceholders(800, 600),
        jobmedley: makePlaceholders(1024, 576),
        hellowork: [],
      },
      status: "placeholder",
      message: "GEMINI_API_KEY未設定のためプレースホルダー画像を使用しています",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const [indeedResult, airworkResult, jobmedleyResult] = await Promise.all([
    generateForPlatform(ai, request, "indeed"),
    generateForPlatform(ai, request, "airwork"),
    generateForPlatform(ai, request, "jobmedley"),
  ]);

  const totalGenerated =
    indeedResult.urls.length + airworkResult.urls.length + jobmedleyResult.urls.length;

  if (totalGenerated === 0) {
    return {
      thumbnails: {
        indeed: makePlaceholders(800, 600),
        airwork: makePlaceholders(800, 600),
        jobmedley: makePlaceholders(1024, 576),
        hellowork: [],
      },
      status: "error",
      message: "全サムネイル生成に失敗しました",
    };
  }

  const allSuccess =
    indeedResult.allSuccess && airworkResult.allSuccess && jobmedleyResult.allSuccess;
  const model = allSuccess ? "Imagen 4" : "Imagen 4 + Nano Banana fallback";

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
    console.log("[imagen4] GEMINI_API_KEY未設定。プレースホルダーを使用します。");
    const config = PLATFORM_IMAGE_CONFIG[platform];
    return {
      thumbnails: {
        indeed: platform === "indeed" ? makePlaceholders(config.width, config.height) : [],
        airwork: platform === "airwork" ? makePlaceholders(config.width, config.height) : [],
        jobmedley: platform === "jobmedley" ? makePlaceholders(config.width, config.height) : [],
        hellowork: [],
      },
      status: "placeholder",
      message: "GEMINI_API_KEY未設定のためプレースホルダー画像を使用しています",
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const result = await generateForPlatform(ai, request, platform);

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

// Pro版 (gemini-3-pro-image-preview = Nano Banana Pro) で高品質生成
export async function generateThumbnailsPro(
  request: ThumbnailGenerationRequest
): Promise<ThumbnailGenerationResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      urls: PLACEHOLDER_THUMBNAILS,
      status: "placeholder",
      message: "GEMINI_API_KEY未設定",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = buildFallbackPrompt(request, "corporate");
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "2K",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        return {
          urls: [dataUrl],
          status: "success",
          message: "高品質サムネイルを生成しました（Nano Banana Pro / gemini-3-pro-image-preview）",
        };
      }
    }

    throw new Error("画像データが含まれていませんでした");
  } catch (error) {
    console.error("[nanobanana pro] Error:", error);
    return {
      urls: PLACEHOLDER_THUMBNAILS,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
