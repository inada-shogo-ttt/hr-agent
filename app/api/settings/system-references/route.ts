import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

// GET /api/settings/system-references — 一覧取得(最高管理者専用)
export async function GET() {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const { data: references, error } = await supabaseAdmin
    .from("SystemReferencePosting")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(references);
}

// POST /api/settings/system-references — 新規登録(最高管理者専用)
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { title, platform, industry, jobType, postingData, performance } = body;

  if (!title || !platform || !industry || !jobType || !postingData) {
    return NextResponse.json(
      { error: "タイトル・媒体・業種・職種・原稿データは必須です" },
      { status: 400 }
    );
  }

  const { data: reference, error } = await supabaseAdmin
    .from("SystemReferencePosting")
    .insert({
      id: crypto.randomUUID(),
      title,
      platform,
      industry,
      jobType,
      postingData: typeof postingData === "string" ? postingData : JSON.stringify(postingData),
      performance: performance || null,
      createdBy: auth.user.id,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(reference, { status: 201 });
}
