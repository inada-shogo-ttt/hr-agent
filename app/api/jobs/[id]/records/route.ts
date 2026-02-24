import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jobs/[id]/records — 履歴一覧
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const records = await prisma.jobRecord.findMany({
    where: { jobId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
}

// POST /api/jobs/[id]/records — 履歴追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { type, platform, inputData, outputData, metricsData, thumbnailUrls } = body;

  const record = await prisma.jobRecord.create({
    data: {
      jobId: id,
      type,
      platform,
      inputData: inputData ? JSON.stringify(inputData) : null,
      outputData: outputData ? JSON.stringify(outputData) : null,
      metricsData: metricsData ? JSON.stringify(metricsData) : null,
      thumbnailUrls: thumbnailUrls ? JSON.stringify(thumbnailUrls) : null,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
