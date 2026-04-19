import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AllPlatformPostings } from "@/types/platform";

type PlatformKey = "indeed" | "airwork" | "jobmedley" | "hellowork";
const PLATFORMS: PlatformKey[] = ["indeed", "airwork", "jobmedley", "hellowork"];

function safeParse<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// 最新サムネイルを決める優先順位:
//   1. team-b レコードの platformThumbnails[platform]
//   2. team-b レコードの thumbnailUrls（deprecated 後方互換）
//   3. team-b レコードの thumbnailUrls カラム
//   4. team-a outputData の platformThumbnails[platform]
//   5. team-a outputData の per-platform thumbnailUrls
//   6. team-a outputData のトップレベル thumbnailUrls（deprecated）
//   7. team-a レコードの thumbnailUrls カラム
function pickThumbnails(
  platform: PlatformKey,
  teamAOutput: AllPlatformPostings | null,
  teamARecord: { thumbnailUrls: string | null } | null,
  teamBOutput: Record<string, unknown> | null,
  teamBRecord: { thumbnailUrls: string | null } | null,
): string[] {
  const isNonEmpty = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0;

  if (teamBOutput) {
    const pt = (teamBOutput as { platformThumbnails?: Record<string, string[]> }).platformThumbnails?.[platform];
    if (isNonEmpty(pt)) return pt;
    const tb = (teamBOutput as { thumbnailUrls?: string[] }).thumbnailUrls;
    if (isNonEmpty(tb)) return tb;
  }
  if (teamBRecord) {
    const col = safeParse<string[]>(teamBRecord.thumbnailUrls);
    if (isNonEmpty(col)) return col;
  }
  if (teamAOutput) {
    const pt = teamAOutput.platformThumbnails?.[platform];
    if (isNonEmpty(pt)) return pt;
    const perPlatform = (teamAOutput[platform] as { thumbnailUrls?: string[] } | undefined)?.thumbnailUrls;
    if (isNonEmpty(perPlatform)) return perPlatform;
    if (isNonEmpty(teamAOutput.thumbnailUrls)) return teamAOutput.thumbnailUrls;
  }
  if (teamARecord) {
    const col = safeParse<string[]>(teamARecord.thumbnailUrls);
    if (isNonEmpty(col)) return col;
  }
  return [];
}

// GET /api/jobs/[id]/history-context — Team B エージェント向け過去データ要約 + 最新状態
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: records, error } = await supabase
    .from("JobRecord")
    .select("*")
    .eq("jobId", id)
    .order("createdAt", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!records || records.length === 0) {
    return NextResponse.json({ history: null, recordCount: 0, mergedOutput: null });
  }

  // 過去データを要約形式に変換
  const history = records.map((r, i) => {
    const output = safeParse<Record<string, unknown>>(r.outputData);
    const metrics = safeParse<Record<string, unknown>>(r.metricsData);

    const teamAOutput = output as unknown as AllPlatformPostings | null;

    return {
      round: i + 1,
      type: r.type,
      platform: r.platform,
      date: r.createdAt,
      ...(r.type === "team-a" && teamAOutput
        ? {
            generatedTitle: teamAOutput.indeed?.jobTitle || teamAOutput.airwork?.jobTitle || teamAOutput.jobmedley?.appealTitle || "",
            generatedCatchphrase: teamAOutput.indeed?.catchphrase || teamAOutput.airwork?.hpCatchphrase || "",
          }
        : {}),
      ...(r.type === "team-b" && output
        ? {
            improvementCount: (output.improvements as unknown[] | undefined)?.length || 0,
            issuesFound: (output.issuesSummary as unknown[] | undefined)?.length || 0,
            manuscriptAnalysis: output.manuscriptAnalysis || "",
            metricsAnalysis: output.metricsAnalysis || "",
            budgetRecommendation: output.budgetRecommendation || null,
          }
        : {}),
      ...(metrics ? { metrics } : {}),
    };
  });

  // ---- 最新状態の組み立て (mergedOutput) ----
  // ベース: 最新 team-a レコードの outputData（ユーザ編集の autosave 先）
  const latestTeamARecord = [...records].reverse().find((r) => r.type === "team-a");
  const latestTeamAOutput = safeParse<AllPlatformPostings>(latestTeamARecord?.outputData);
  const latestTeamAInput = safeParse<unknown>(latestTeamARecord?.inputData);

  let mergedOutput: AllPlatformPostings | null = null;
  if (latestTeamAOutput) {
    // deep clone
    mergedOutput = JSON.parse(JSON.stringify(latestTeamAOutput)) as AllPlatformPostings;
    if (!mergedOutput.platformThumbnails) {
      mergedOutput.platformThumbnails = { indeed: [], airwork: [], jobmedley: [], hellowork: [] };
    }

    // 媒体ごとに最新 team-b レコードの improvedPosting を上書き
    for (const platform of PLATFORMS) {
      const latestTeamBForPlatform = [...records]
        .reverse()
        .find((r) => r.type === "team-b" && r.platform === platform);

      let teamBOutput: Record<string, unknown> | null = null;
      if (latestTeamBForPlatform) {
        teamBOutput = safeParse<Record<string, unknown>>(latestTeamBForPlatform.outputData);
        const improvedPosting = (teamBOutput?.improvedPosting as Record<string, string> | undefined) || {};

        // team-a 側 platform セクションに、team-b が改善したフィールドのみを上書き
        const section = mergedOutput[platform] as unknown as Record<string, unknown> | undefined;
        if (section && Object.keys(improvedPosting).length > 0) {
          Object.assign(section, improvedPosting);
        }
      }

      // サムネイルを優先順位で選択
      const thumbs = pickThumbnails(
        platform,
        latestTeamAOutput,
        latestTeamARecord || null,
        teamBOutput,
        latestTeamBForPlatform || null,
      );
      if (mergedOutput.platformThumbnails) {
        mergedOutput.platformThumbnails[platform] = thumbs;
      }
      // per-platform の thumbnailUrls も揃える（UI が参照するため）
      const sectionForThumbs = mergedOutput[platform] as unknown as Record<string, unknown> | undefined;
      if (sectionForThumbs) {
        sectionForThumbs.thumbnailUrls = thumbs;
      }
    }

    // トップレベル thumbnailUrls（deprecated）は Indeed を代表として入れておく
    const indeedThumbs = mergedOutput.platformThumbnails?.indeed || [];
    mergedOutput.thumbnailUrls = indeedThumbs.length > 0 ? indeedThumbs : mergedOutput.thumbnailUrls || [];
  }

  // PublishMetrics を取得
  const { data: publishMetrics } = await supabase
    .from("PublishMetrics")
    .select("*")
    .eq("jobId", id)
    .order("createdAt", { ascending: false });

  return NextResponse.json({
    history,
    recordCount: records.length,
    // 最新状態（Team A outputData に Team B improvedPosting とサムネイルをマージしたもの）
    mergedOutput,
    // 後方互換用
    latestTeamAOutput,
    latestTeamAInput,
    latestThumbnailUrls: mergedOutput
      ? mergedOutput.platformThumbnails?.indeed || mergedOutput.thumbnailUrls || []
      : [],
    publishMetrics: publishMetrics || [],
  });
}
