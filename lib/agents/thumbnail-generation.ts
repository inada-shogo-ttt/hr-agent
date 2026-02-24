import { generateThumbnails } from "@/lib/nanobanana";
import { ThumbnailGenerationInput, ThumbnailGenerationOutput } from "./types";

export async function runThumbnailGenerationAgent(
  input: ThumbnailGenerationInput
): Promise<ThumbnailGenerationOutput> {
  const { jobPostingInput, manuscript } = input;
  const { common } = jobPostingInput;

  try {
    const result = await generateThumbnails({
      title: manuscript.indeed.jobTitle,
      catchphrase: manuscript.indeed.catchphrase,
      companyName: common.companyName,
      industry: common.industry,
      colorScheme: "professional",
      style: "recruitment",
    });

    return {
      thumbnailUrls: result.urls,
      generationStatus: result.status === "success" ? "success" : "error",
      message: result.message || "サムネイル生成完了",
    };
  } catch (error) {
    console.error("[thumbnail-generation] Error:", error);
    return {
      thumbnailUrls: [
        "https://placehold.co/1200x628/0066cc/ffffff?text=サムネイル1",
        "https://placehold.co/1200x628/003399/ffffff?text=サムネイル2",
        "https://placehold.co/1200x628/0099ff/ffffff?text=サムネイル3",
      ],
      generationStatus: "placeholder",
      message: "nanobanana pro API未設定のため、プレースホルダー画像を使用しています",
    };
  }
}
