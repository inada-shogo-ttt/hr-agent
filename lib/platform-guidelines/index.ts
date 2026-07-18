import { supabaseAdmin } from "@/lib/supabase/admin";
import { Platform } from "@/types/platform";
import { PlatformGuideline, PlatformGuidelineMap } from "@/types/platform-guideline";
import { PLATFORM_GUIDELINE_DEFAULTS } from "./defaults";

// DB(PlatformGuideline)の保存値とコード内デフォルトをマージして返す。
// 行が無い・カラムが空欄の項目はデフォルトで補完するため、
// 返り値は常に完成形（生成フローはこの値をそのままプロンプトへ注入してよい）。
// DB エラー時もデフォルトで動かし、生成フローを止めない。
export async function getPlatformGuidelines(
  platforms: Platform[]
): Promise<PlatformGuidelineMap> {
  const rows = new Map<string, Record<string, unknown>>();
  try {
    const { data, error } = await supabaseAdmin
      .from("PlatformGuideline")
      .select("*")
      .in("platform", platforms);
    if (error) throw error;
    for (const row of data || []) {
      rows.set(String(row.platform), row);
    }
  } catch (e) {
    console.warn("[platform-guidelines] 設定の取得に失敗（デフォルトで続行）:", e);
  }

  const result: PlatformGuidelineMap = {};
  for (const platform of platforms) {
    const defaults = PLATFORM_GUIDELINE_DEFAULTS[platform];
    const row = rows.get(platform);
    const pick = (key: "format" | "algorithm" | "constraints"): string => {
      const value = row?.[key];
      return typeof value === "string" && value.trim() ? value : defaults[key];
    };
    const guideline: PlatformGuideline = {
      platform,
      format: pick("format"),
      algorithm: pick("algorithm"),
      constraints: pick("constraints"),
    };
    result[platform] = guideline;
  }
  return result;
}
