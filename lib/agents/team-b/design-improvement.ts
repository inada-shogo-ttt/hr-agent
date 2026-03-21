import { generatePlatformThumbnailsSingle, PlatformThumbnails } from "@/lib/nanobanana";
import { DesignImprovementInput, DesignImprovementOutput } from "./types";

export async function runDesignImprovementAgent(
  input: DesignImprovementInput
): Promise<DesignImprovementOutput> {
  const { improvedPosting, platform, historyContext, visualStyle } = input;

  // ハローワークはサムネイル不要
  if (platform === "hellowork") {
    return {
      platformThumbnails: { indeed: [], airwork: [], jobmedley: [], hellowork: [] },
      thumbnailUrls: [],
      generationStatus: "success",
      message: "ハローワークはサムネイル不要のためスキップしました",
    };
  }

  // historyContext から業種情報を取得（existingPosting に含まれない場合のフォールバック）
  let industry = "";
  if (historyContext && historyContext.length > 0) {
    for (const ctx of historyContext) {
      const ctxObj = ctx as Record<string, unknown>;
      const inputData = ctxObj.inputData as Record<string, unknown> | undefined;
      if (inputData?.common) {
        const common = inputData.common as Record<string, string>;
        if (common.industry) {
          industry = common.industry;
          break;
        }
      }
    }
  }

  try {
    const result = await generatePlatformThumbnailsSingle(
      {
        title: improvedPosting.jobTitle || "求人募集",
        catchphrase: improvedPosting.catchphrase || improvedPosting.appealTitle || "",
        companyName: improvedPosting.companyName || "",
        industry,
        colorScheme: "professional",
        style: "recruitment",
        visualStyle,
      },
      platform,
    );

    return {
      platformThumbnails: result.thumbnails,
      thumbnailUrls: result.thumbnails[platform],
      generationStatus: result.status === "success" ? "success" : "error",
      message: result.message || "改善サムネイル生成完了",
    };
  } catch (error) {
    console.error("[design-improvement] Error:", error);
    const placeholders = [
      "https://placehold.co/800x600/0066cc/ffffff?text=改善サムネイル1",
      "https://placehold.co/800x600/003399/ffffff?text=改善サムネイル2",
      "https://placehold.co/800x600/0099ff/ffffff?text=改善サムネイル3",
    ];
    return {
      platformThumbnails: {
        indeed: platform === "indeed" ? placeholders : [],
        airwork: platform === "airwork" ? placeholders : [],
        hellowork: [],
        jobmedley: platform === "jobmedley" ? [
          "https://placehold.co/1024x576/0066cc/ffffff?text=改善サムネイル1",
          "https://placehold.co/1024x576/003399/ffffff?text=改善サムネイル2",
          "https://placehold.co/1024x576/0099ff/ffffff?text=改善サムネイル3",
        ] : [],
      },
      thumbnailUrls: placeholders,
      generationStatus: "placeholder",
      message: "API未設定のため、プレースホルダー画像を使用しています",
    };
  }
}
