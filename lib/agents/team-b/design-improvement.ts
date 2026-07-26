import { generatePlatformThumbnailsSingle, PlatformThumbnails } from "@/lib/nanobanana";
import { selectCompositionRefsForJob } from "@/lib/reference-thumbnails";
import { DesignImprovementInput, DesignImprovementOutput } from "./types";

export async function runDesignImprovementAgent(
  input: DesignImprovementInput
): Promise<DesignImprovementOutput> {
  const { improvedPosting, platform, historyContext, visualStyle, direction } = input;

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
    // 参考サムネ（構図・デザイン参考）: 登録済み事例から AI がスロット別に1枚を自動選定（全媒体共通で使用）
    const compositionRefs = await selectCompositionRefsForJob({
      jobTitle: improvedPosting.jobTitle || "求人募集",
      industry,
      catchphrase: improvedPosting.catchphrase || improvedPosting.appealTitle || "",
    });

    const result = await generatePlatformThumbnailsSingle(
      {
        title: improvedPosting.jobTitle || "求人募集",
        catchphrase: improvedPosting.catchphrase || improvedPosting.appealTitle || "",
        companyName: improvedPosting.companyName || "",
        industry,
        colorScheme: "professional",
        style: "recruitment",
        visualStyle,
        compositionRefs,
        direction,
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
    const slotNumbers = [1, 2, 3, 4, 5];
    const placeholders = slotNumbers.map(
      (n) => `https://placehold.co/800x600/0066cc/ffffff?text=改善サムネイル${n}`
    );
    return {
      platformThumbnails: {
        indeed: platform === "indeed" ? placeholders : [],
        airwork: platform === "airwork" ? placeholders : [],
        hellowork: [],
        jobmedley: platform === "jobmedley"
          ? slotNumbers.map(
              (n) => `https://placehold.co/1024x576/0066cc/ffffff?text=改善サムネイル${n}`
            )
          : [],
      },
      thumbnailUrls: placeholders,
      generationStatus: "placeholder",
      message: "API未設定のため、プレースホルダー画像を使用しています",
    };
  }
}
