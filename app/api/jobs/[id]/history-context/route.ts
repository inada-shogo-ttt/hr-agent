import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jobs/[id]/history-context — Team Bエージェント向け過去データ要約
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const records = await prisma.jobRecord.findMany({
    where: { jobId: id },
    orderBy: { createdAt: "asc" },
  });

  if (records.length === 0) {
    return NextResponse.json({ history: null, recordCount: 0 });
  }

  // 過去データを要約形式に変換
  const history = records.map((r, i) => {
    const output = r.outputData ? JSON.parse(r.outputData) : null;
    const metrics = r.metricsData ? JSON.parse(r.metricsData) : null;

    return {
      round: i + 1,
      type: r.type,
      platform: r.platform,
      date: r.createdAt.toISOString(),
      // Team A の場合：生成された原稿のサマリー
      ...(r.type === "team-a" && output
        ? {
            generatedTitle: output.indeed?.jobTitle || output.airwork?.jobTitle || output.jobmedley?.appealTitle || "",
            generatedCatchphrase: output.indeed?.catchphrase || output.airwork?.catchphrase || "",
          }
        : {}),
      // Team B の場合：改善内容と数値
      ...(r.type === "team-b" && output
        ? {
            improvementCount: output.improvements?.length || 0,
            issuesFound: output.issuesSummary?.length || 0,
            manuscriptAnalysis: output.manuscriptAnalysis || "",
            metricsAnalysis: output.metricsAnalysis || "",
            budgetRecommendation: output.budgetRecommendation || null,
          }
        : {}),
      // 数値データ
      ...(metrics ? { metrics } : {}),
    };
  });

  // 最新のTeam A出力を取得（Team Bの入力用）
  const latestTeamA = records.filter((r) => r.type === "team-a").pop();
  const latestOutput = latestTeamA?.outputData ? JSON.parse(latestTeamA.outputData) : null;
  const latestInput = latestTeamA?.inputData ? JSON.parse(latestTeamA.inputData) : null;

  return NextResponse.json({
    history,
    recordCount: records.length,
    latestTeamAOutput: latestOutput,
    latestTeamAInput: latestInput,
    latestThumbnailUrls: latestTeamA?.thumbnailUrls
      ? JSON.parse(latestTeamA.thumbnailUrls)
      : [],
  });
}
