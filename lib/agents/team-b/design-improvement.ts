import { generateThumbnails } from "@/lib/nanobanana";
import { DesignImprovementInput, DesignImprovementOutput } from "./types";

export async function runDesignImprovementAgent(
  input: DesignImprovementInput
): Promise<DesignImprovementOutput> {
  const { improvedPosting } = input;

  try {
    const result = await generateThumbnails({
      title: improvedPosting.jobTitle || "求人募集",
      catchphrase: improvedPosting.catchphrase || improvedPosting.appealTitle || "",
      companyName: improvedPosting.companyName || "",
      industry: "",
      colorScheme: "professional",
      style: "recruitment",
    });

    return {
      thumbnailUrls: result.urls,
      generationStatus: result.status === "success" ? "success" : "error",
      message: result.message || "改善サムネイル生成完了",
    };
  } catch (error) {
    console.error("[design-improvement] Error:", error);
    return {
      thumbnailUrls: [
        "https://placehold.co/1200x628/0066cc/ffffff?text=改善サムネイル1",
        "https://placehold.co/1200x628/003399/ffffff?text=改善サムネイル2",
        "https://placehold.co/1200x628/0099ff/ffffff?text=改善サムネイル3",
      ],
      generationStatus: "placeholder",
      message: "nanobanana pro API未設定のため、プレースホルダー画像を使用しています",
    };
  }
}
