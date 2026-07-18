import { supabaseAdmin } from "@/lib/supabase/admin";

// Team B(ブラッシュアップ)の改善結果を、最新 team-a レコードの outputData に反映する。
// 求人詳細ページは team-a レコードを「現在の原稿」として表示するため、
// ここを更新しないと改善が画面に反映されない。
// 失敗しても呼び出し元の保存処理は成功扱いのままにする(ログのみ)。
export async function applyTeamBResultToManuscript(
  jobId: string,
  platform: string,
  teamBOutput: Record<string, unknown>
): Promise<void> {
  try {
    const { data: records } = await supabaseAdmin
      .from("JobRecord")
      .select("id, outputData")
      .eq("jobId", jobId)
      .eq("type", "team-a")
      .order("createdAt", { ascending: false })
      .limit(1);

    const teamARecord = records?.[0];
    if (!teamARecord?.outputData) return;

    let output: Record<string, unknown>;
    try {
      output = JSON.parse(teamARecord.outputData) as Record<string, unknown>;
    } catch {
      return;
    }

    const section = output[platform] as Record<string, unknown> | undefined;
    if (!section) return;

    let changed = false;

    // 改善されたフィールドのみ上書き
    const improvedPosting =
      (teamBOutput.improvedPosting as Record<string, string> | undefined) || {};
    if (Object.keys(improvedPosting).length > 0) {
      Object.assign(section, improvedPosting);
      changed = true;
    }

    // 改善サムネイルがあれば差し替え
    const platformThumbs = (
      teamBOutput.platformThumbnails as Record<string, string[]> | undefined
    )?.[platform];
    const fallbackThumbs = teamBOutput.thumbnailUrls;
    const thumbs =
      Array.isArray(platformThumbs) && platformThumbs.length > 0
        ? platformThumbs
        : Array.isArray(fallbackThumbs) && fallbackThumbs.length > 0
          ? (fallbackThumbs as string[])
          : null;
    if (thumbs) {
      const pt = (output.platformThumbnails as Record<string, string[]> | undefined) || {
        indeed: [],
        airwork: [],
        jobmedley: [],
        hellowork: [],
      };
      pt[platform] = thumbs;
      output.platformThumbnails = pt;
      section.thumbnailUrls = thumbs;
      changed = true;
    }

    if (!changed) return;

    await supabaseAdmin
      .from("JobRecord")
      .update({ outputData: JSON.stringify(output) })
      .eq("id", teamARecord.id);
  } catch (e) {
    console.warn("[job-records] Team B 改善の原稿反映に失敗:", e);
  }
}
