import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

// PATCH /api/organizations/[id] — 組織情報の更新(運営者専用)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.billingExempt === "boolean") {
    updates.billingExempt = body.billingExempt;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400 }
    );
  }
  updates.updatedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("Organization")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
