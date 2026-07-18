import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { canWriteOrg } from "@/lib/org-scope";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: office } = await supabaseAdmin
    .from("Office")
    .select("orgId")
    .eq("id", id)
    .single();

  if (!office || !canWriteOrg(auth.user, office.orgId)) {
    return NextResponse.json({ error: "事業所が見つかりません" }, { status: 404 });
  }

  const { name } = await request.json();

  const { data, error } = await supabaseAdmin
    .from("Office")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: office } = await supabaseAdmin
    .from("Office")
    .select("orgId")
    .eq("id", id)
    .single();

  if (!office || !canWriteOrg(auth.user, office.orgId)) {
    return NextResponse.json({ error: "事業所が見つかりません" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("Office").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
