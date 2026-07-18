import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { name } = await request.json();

  const { data, error } = await supabaseAdmin
    .from("EmploymentType")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("orgId", auth.user.orgId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "この勤務形態名は既に登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("EmploymentType")
    .delete()
    .eq("id", id)
    .eq("orgId", auth.user.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
