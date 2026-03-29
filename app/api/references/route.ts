import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/references — 一覧取得（?industry=xxx&jobType=xxx でフィルタ可）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get("industry");
  const jobType = searchParams.get("jobType");

  let query = supabase
    .from("ReferencePosting")
    .select("*")
    .order("createdAt", { ascending: false });

  if (industry) query = query.ilike("industry", `%${industry}%`);
  if (jobType) query = query.ilike("jobType", `%${jobType}%`);

  const { data: references, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

  const { data: reference, error } = await supabase
    .from("ReferencePosting")
    .insert({
      id: crypto.randomUUID(),
      title,
      platform,
      industry,
      jobType,
      postingData: typeof postingData === "string" ? postingData : JSON.stringify(postingData),
      performance: performance || null,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(reference, { status: 201 });
}
