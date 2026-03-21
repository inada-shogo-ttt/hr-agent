import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/references — 一覧取得（?industry=xxx&jobType=xxx でフィルタ可）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get("industry");
  const jobType = searchParams.get("jobType");

  const where: Record<string, unknown> = {};
  if (industry) where.industry = { contains: industry };
  if (jobType) where.jobType = { contains: jobType };

  const references = await prisma.referencePosting.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(references);
}

// POST /api/references — 新規登録
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, platform, industry, jobType, postingData, performance } = body;

  if (!title || !platform || !industry || !jobType || !postingData) {
    return NextResponse.json(
      { error: "タイトル・媒体・業種・職種・原稿データは必須です" },
      { status: 400 }
    );
  }

  const reference = await prisma.referencePosting.create({
    data: {
      title,
      platform,
      industry,
      jobType,
      postingData: typeof postingData === "string" ? postingData : JSON.stringify(postingData),
      performance: performance || null,
    },
  });

  return NextResponse.json(reference, { status: 201 });
}
