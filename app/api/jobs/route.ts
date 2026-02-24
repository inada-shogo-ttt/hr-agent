import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jobs — 求人一覧
export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      records: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { type: true, platform: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(jobs);
}

// POST /api/jobs — 求人新規登録
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { officeName, jobTitle, employmentType } = body;

  if (!officeName || !jobTitle || !employmentType) {
    return NextResponse.json(
      { error: "事業所名・職種・雇用形態は必須です" },
      { status: 400 }
    );
  }

  const job = await prisma.job.create({
    data: { officeName, jobTitle, employmentType },
  });

  return NextResponse.json(job, { status: 201 });
}
