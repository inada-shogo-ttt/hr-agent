import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { extractKnowledge } from "@/lib/knowledge-extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/shared-knowledge/extract
 * PublishMetrics から成功パターンを抽出し SharedKnowledge に登録
 */
export async function POST() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const result = await extractKnowledge();

  return NextResponse.json({
    message: `${result.processedCount}件の掲載実績を分析し、${result.extractedCount}件のナレッジを抽出しました`,
    ...result,
  });
}
