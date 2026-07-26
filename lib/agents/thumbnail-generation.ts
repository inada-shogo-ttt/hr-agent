import { generatePlatformThumbnails, PlatformThumbnails } from "@/lib/nanobanana";
import { selectCompositionRefsForJob } from "@/lib/reference-thumbnails";
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
  const targets = input.platforms ?? ["indeed", "airwork", "jobmedley"];

  const visualStyle = deriveVisualStyle(common.industry, common.jobTitle);

  // サムネイル対象媒体が選択されていない場合は生成をスキップ
  if (targets.length === 0) {
    return {
      platformThumbnails: { indeed: [], airwork: [], jobmedley: [], hellowork: [] },
      thumbnailUrls: [],
      generationStatus: "success",
      message: "サムネイル対象の媒体が選択されていないため、生成をスキップしました",
      visualStyle,
    };
  }

  try {
    // 参考サムネ（構図・デザイン参考）: 登録済み事例から AI がスロット別に1枚を自動選定（全媒体共通で使用）
    const compositionRefs = await selectCompositionRefsForJob({
      jobTitle: manuscript.indeed?.jobTitle || common.jobTitle,
      industry: common.industry,
      catchphrase: manuscript.indeed?.catchphrase || common.appealPoints || "",
    });

    const result = await generatePlatformThumbnails({
      title: manuscript.indeed?.jobTitle || common.jobTitle,
      catchphrase: manuscript.indeed?.catchphrase || common.appealPoints || "",
      companyName: common.companyName,
      industry: common.industry,
      colorScheme: "professional",
      style: "recruitment",
      visualStyle,
      referenceImage: jobPostingInput.thumbnailReference || null,
      compositionRefs,
      direction: jobPostingInput.thumbnailDirection,
    }, targets);

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
    const makePlaceholders = (w: number, h: number) =>
      [1, 2, 3, 4, 5].map(
        (n) => `https://placehold.co/${w}x${h}/0066cc/ffffff?text=サムネイル${n}`
      );
    const placeholders = makePlaceholders(800, 600);
    return {
      platformThumbnails: {
        indeed: targets.includes("indeed") ? placeholders : [],
        airwork: targets.includes("airwork") ? placeholders : [],
        jobmedley: targets.includes("jobmedley") ? makePlaceholders(1024, 576) : [],
        hellowork: [],
      },
      thumbnailUrls: targets.includes("indeed") || targets.includes("airwork") ? placeholders : [],
      generationStatus: "placeholder",
      message: "API未設定のため、プレースホルダー画像を使用しています",
      visualStyle,
    };
  }
}
