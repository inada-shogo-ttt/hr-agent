import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/references/[id] — 詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reference = await prisma.referencePosting.findUnique({ where: { id } });

  if (!reference) {
    return NextResponse.json({ error: "参考原稿が見つかりません" }, { status: 404 });
  }

  return NextResponse.json(reference);
}

// DELETE /api/references/[id] — 削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.referencePosting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 404 });
  }
}
