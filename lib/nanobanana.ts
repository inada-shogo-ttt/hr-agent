// Nano Banana Pro = Google Gemini 画像生成API
// Nano Banana     → gemini-2.5-flash-image  (高速・大量処理向け)
// Nano Banana Pro → gemini-3-pro-image-preview (高品質・プロ向け)

import { GoogleGenAI } from "@google/genai";

export interface ThumbnailGenerationRequest {
  title: string;
  catchphrase: string;
  companyName: string;
  industry: string;
  colorScheme?: string;
  style?: string;
}

export interface ThumbnailGenerationResponse {
  urls: string[]; // base64 data URLs ("data:image/png;base64,...")
  status: "success" | "placeholder" | "error";
  message?: string;
}

const PLACEHOLDER_THUMBNAILS = [
  "https://placehold.co/1344x768/1e40af/ffffff?text=サムネイル+1",
  "https://placehold.co/1344x768/1d4ed8/ffffff?text=サムネイル+2",
  "https://placehold.co/1344x768/2563eb/ffffff?text=サムネイル+3",
];

// 求人サムネイル用プロンプトを生成
function buildRecruitmentPrompt(
  request: ThumbnailGenerationRequest,
  variant: "corporate" | "warm" | "dynamic"
): string {
  const variantDescriptions = {
    corporate: `Clean corporate professional setting. Modern office environment with professionals collaborating. Blue and white color palette. Conveys reliability and stability.`,
    warm: `Warm, welcoming workplace atmosphere. Friendly team members, natural lighting, inclusive and positive environment. Warm amber and cream tones. Conveys work-life balance.`,
    dynamic: `Dynamic, energetic workplace imagery. Forward-looking, growth-oriented visuals for the ${request.industry} industry. Bold accent colors with modern design. Conveys ambition and opportunity.`,
  };

  return `Create a professional job recruitment banner image for a Japanese job posting platform.

Position: ${request.title}
Company: ${request.companyName}
Industry: ${request.industry}
Tagline concept: ${request.catchphrase}

Visual style: ${variantDescriptions[variant]}

Design requirements:
- 16:9 horizontal banner format (suitable for Indeed, AirWork, JobMedley)
- Professional quality suitable for Japanese recruitment market
- Industry-appropriate imagery representing the ${request.industry} sector
- Clean composition with visual breathing room
- Do NOT include any text, logos, or typography overlays
- Pure visual/photographic imagery only
- High quality, polished professional appearance
- Convey trustworthiness, growth potential, and positive workplace culture`;
}

// 単一サムネイルを生成してbase64 data URLを返す
async function generateSingleThumbnail(
  ai: GoogleGenAI,
  prompt: string,
  model: "gemini-2.5-flash-image" | "gemini-3-pro-image-preview" = "gemini-2.5-flash-image"
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "16:9",
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

  throw new Error("画像データが含まれていませんでした");
}

export async function generateThumbnails(
  request: ThumbnailGenerationRequest
): Promise<ThumbnailGenerationResponse> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NANOBANANA_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.log("[nanobanana] GEMINI_API_KEY未設定。プレースホルダーを使用します。");
    return {
      urls: PLACEHOLDER_THUMBNAILS,
      status: "placeholder",
      message: "GEMINI_API_KEY未設定のためプレースホルダー画像を使用しています",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  // 3バリエーションを並列生成（gemini-2.5-flash-image = Nano Banana）
  const variants: Array<"corporate" | "warm" | "dynamic"> = [
    "corporate",
    "warm",
    "dynamic",
  ];

  const results = await Promise.allSettled(
    variants.map((variant) =>
      generateSingleThumbnail(ai, buildRecruitmentPrompt(request, variant))
    )
  );

  const urls: string[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      urls.push(result.value);
    } else {
      console.error("[nanobanana] Generation failed:", result.reason);
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  if (urls.length === 0) {
    return {
      urls: PLACEHOLDER_THUMBNAILS,
      status: "error",
      message: `全サムネイル生成に失敗: ${errors.join(", ")}`,
    };
  }

  return {
    urls,
    status: "success",
    message: `${urls.length}枚のサムネイルを生成しました（Nano Banana / gemini-2.5-flash-image）`,
  };
}

// Pro版 (gemini-3-pro-image-preview = Nano Banana Pro) で高品質生成
export async function generateThumbnailsPro(
  request: ThumbnailGenerationRequest
): Promise<ThumbnailGenerationResponse> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NANOBANANA_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return {
      urls: PLACEHOLDER_THUMBNAILS,
      status: "placeholder",
      message: "GEMINI_API_KEY未設定",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Pro版は1枚を高品質（2K解像度）で生成
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: buildRecruitmentPrompt(request, "corporate"),
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
