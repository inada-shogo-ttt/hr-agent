import { NextRequest, NextResponse } from "next/server";
import { searchSharedKnowledge } from "@/lib/shared-knowledge";
import { KnowledgeType } from "@/types/shared-knowledge";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const knowledgeType = (searchParams.get("knowledgeType") as KnowledgeType) || undefined;
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const entries = await searchSharedKnowledge({
    category,
    platform,
    knowledgeType,
    limit,
  });

  return NextResponse.json(entries);
}
