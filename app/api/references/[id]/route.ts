import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/references/[id] — 詳細取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: reference, error } = await supabase
    .from("ReferencePosting")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !reference) {
    return NextResponse.json({ error: "参考原稿が見つかりません" }, { status: 404 });
  }

  return NextResponse.json(reference);
}

// PATCH /api/references/[id] — 更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, platform, industry, jobType, postingData, performance } = body;

  if (!title || !platform || !industry || !jobType || !postingData) {
    return NextResponse.json(
      { error: "タイトル・媒体・業種・職種・原稿データは必須です" },
      { status: 400 }
    );
  }

  const { data: reference, error } = await supabase
    .from("ReferencePosting")
    .update({
      title,
      platform,
      industry,
      jobType,
      postingData: typeof postingData === "string" ? postingData : JSON.stringify(postingData),
      performance: performance || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !reference) {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 404 });
  }

  return NextResponse.json(reference);
}

// DELETE /api/references/[id] — 削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from("ReferencePosting")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
