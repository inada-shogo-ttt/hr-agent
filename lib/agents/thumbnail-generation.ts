import { generatePlatformThumbnails, PlatformThumbnails } from "@/lib/nanobanana";
import { ThumbnailGenerationInput, ThumbnailGenerationOutput, VisualStyle } from "./types";

// 業種に基づいてビジュアルスタイル情報を生成
function deriveVisualStyle(industry: string, jobTitle: string): VisualStyle {
  const industryStyles: Record<string, { uniform: string; scene: string }> = {
    "介護": { uniform: "白ポロシャツにエプロン", scene: "明るく清潔な介護施設内" },
    "看護": { uniform: "白を基調としたナース服", scene: "清潔感のある病棟" },
    "医療": { uniform: "白衣またはスクラブ", scene: "清潔感のある医療施設" },
    "福祉": { uniform: "白ポロシャツにエプロン", scene: "温かみのある福祉施設" },
    "IT": { uniform: "ビジネスカジュアル（シャツ・チノパン）", scene: "モダンなオフィス空間" },
    "飲食": { uniform: "制服にエプロン", scene: "清潔感のある飲食店舗内" },
    "建設": { uniform: "作業着にヘルメット", scene: "建設現場または事務所" },
    "製造": { uniform: "作業着または制服", scene: "工場・製造ライン" },
    "教育": { uniform: "ビジネスカジュアル", scene: "明るい教育施設" },
    "小売": { uniform: "店舗制服", scene: "清潔感のある店舗内" },
    "物流": { uniform: "作業着またはポロシャツ", scene: "物流倉庫または配送拠点" },
    "事務": { uniform: "オフィスカジュアル", scene: "明るいオフィス空間" },
  };

  // 業種名にマッチするスタイルを探す
  let matched: { uniform: string; scene: string } | undefined;
  for (const [key, style] of Object.entries(industryStyles)) {
    if (industry.includes(key) || jobTitle.includes(key)) {
      matched = style;
      break;
    }
  }

  return {
    uniformDescription: matched?.uniform || `${industry}業種に適した清潔感のあるユニフォーム`,
    colorPalette: "青・白を基調としたプロフェッショナルな配色",
    sceneDescription: matched?.scene || `${industry}業界の明るく清潔な職場空間`,
  };
}

export async function runThumbnailGenerationAgent(
  input: ThumbnailGenerationInput
): Promise<ThumbnailGenerationOutput> {
  const { jobPostingInput, manuscript } = input;
  const { common } = jobPostingInput;

  const visualStyle = deriveVisualStyle(common.industry, common.jobTitle);

  try {
    const result = await generatePlatformThumbnails({
      title: manuscript.indeed.jobTitle,
      catchphrase: manuscript.indeed.catchphrase,
      companyName: common.companyName,
      industry: common.industry,
      colorScheme: "professional",
      style: "recruitment",
      visualStyle,
    });

    return {
      platformThumbnails: result.thumbnails,
      thumbnailUrls: [
        ...result.thumbnails.indeed,
        ...result.thumbnails.airwork,
        ...result.thumbnails.jobmedley,
      ],
      generationStatus: result.status === "success" ? "success" : "error",
      message: result.message || "サムネイル生成完了",
      visualStyle,
    };
  } catch (error) {
    console.error("[thumbnail-generation] Error:", error);
    const placeholders = [
      "https://placehold.co/800x600/0066cc/ffffff?text=サムネイル1",
      "https://placehold.co/800x600/003399/ffffff?text=サムネイル2",
      "https://placehold.co/800x600/0099ff/ffffff?text=サムネイル3",
    ];
    return {
      platformThumbnails: {
        indeed: placeholders,
        airwork: placeholders,
        jobmedley: [
          "https://placehold.co/1024x576/0066cc/ffffff?text=サムネイル1",
          "https://placehold.co/1024x576/003399/ffffff?text=サムネイル2",
          "https://placehold.co/1024x576/0099ff/ffffff?text=サムネイル3",
        ],
        hellowork: [],
      },
      thumbnailUrls: placeholders,
      generationStatus: "placeholder",
      message: "API未設定のため、プレースホルダー画像を使用しています",
      visualStyle,
    };
  }
}
