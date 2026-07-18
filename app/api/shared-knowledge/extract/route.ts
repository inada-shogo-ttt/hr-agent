import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { extractKnowledge } from "@/lib/knowledge-extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/shared-knowledge/extract
 * PublishMetrics から成功パターンを抽出し SharedKnowledge に登録
 */
export async function POST() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const result = await extractKnowledge();

  return NextResponse.json({
    message: `${result.processedCount}件の掲載実績を分析し、${result.extractedCount}件のナレッジを抽出しました`,
    ...result,
  });
}
