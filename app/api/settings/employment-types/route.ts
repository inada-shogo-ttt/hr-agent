import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("EmploymentType")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "勤務形態名は必須です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("EmploymentType")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "この勤務形態名は既に登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
