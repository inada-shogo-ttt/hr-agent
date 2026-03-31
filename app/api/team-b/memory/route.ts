import { NextRequest, NextResponse } from "next/server";
import {
  searchMemories,
  saveMemories,
  updateEffectiveness,
} from "@/lib/agents/team-b/memory";
import { Platform } from "@/types/platform";

// GET /api/team-b/memory — メモリパターン検索
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") as Platform;
  const categories = searchParams.get("categories")?.split(",") || undefined;
  const industry = searchParams.get("industry") || undefined;
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!platform) {
    return NextResponse.json(
      { error: "platform is required" },
      { status: 400 }
    );
  }

  const memories = await searchMemories({
    platform,
    categories,
    industry,
    limit,
  });

  return NextResponse.json({ memories, count: memories.length });
}

// POST /api/team-b/memory — メモリパターン保存 & 効果フィードバック
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === "save") {
    const { platform, improvements, issues, sourceJobId, industry, jobType } =
      body;
    const savedCount = await saveMemories({
      platform,
      improvements: improvements || [],
      issues: issues || [],
      sourceJobId,
      industry,
      jobType,
    });
    return NextResponse.json({ savedCount });
  }

  if (action === "feedback") {
    const { platform, categories, improved } = body;
    await updateEffectiveness(platform, categories, improved);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
