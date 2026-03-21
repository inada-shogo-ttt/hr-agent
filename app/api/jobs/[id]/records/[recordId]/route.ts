import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/jobs/[id]/records/[recordId] — 原稿更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { id, recordId } = await params;
  const body = await request.json();
  const { outputData } = body;

  const record = await prisma.jobRecord.update({
    where: { id: recordId, jobId: id },
    data: { outputData: JSON.stringify(outputData) },
  });

  return NextResponse.json(record);
}
