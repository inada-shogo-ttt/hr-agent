import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let query = supabaseAdmin.from("JobType").select("*").order("name");
  query = query.eq("orgId", auth.user.orgId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "職種名は必須です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("JobType")
    .insert({ name: name.trim(), orgId: auth.user.orgId, ...(color ? { color } : {}) })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "この職種名は既に登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
