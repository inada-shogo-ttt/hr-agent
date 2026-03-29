import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

// PATCH /api/users/[id] — ロール変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { role, name } = body;

  const updates: Record<string, string> = {};
  if (role) {
    const validRoles = ["admin", "editor", "reviewer", "publisher"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "無効なロールです" }, { status: 400 });
    }
    updates.role = role;
  }
  if (name) {
    updates.name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("User")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/users/[id] — ユーザー削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  // 自分自身は削除不可
  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "自分自身は削除できません" },
      { status: 400 }
    );
  }

  // User テーブルから削除（auth.users は CASCADE で削除される）
  await supabaseAdmin.auth.admin.deleteUser(id);

  const { error } = await supabaseAdmin
    .from("User")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
