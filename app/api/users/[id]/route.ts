import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { AppUser } from "@/types/auth";

export const runtime = "nodejs";

// 操作対象ユーザーの取得と権限確認
// admin は自組織のユーザーのみ操作可。最高管理者は不可視(存在も開示しない)
async function getManageableUser(
  id: string,
  actor: AppUser
): Promise<
  | { target: { id: string; role: string; orgId: string } }
  | { error: NextResponse }
> {
  const { data: target } = await supabaseAdmin
    .from("User")
    .select("*")
    .eq("id", id)
    .single();

  const allowed =
    target &&
    (actor.role === "super_admin" ||
      (target.orgId === actor.orgId && target.role !== "super_admin"));

  if (!allowed) {
    return {
      error: NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      ),
    };
  }
  return { target };
}

// PATCH /api/users/[id] — 名前・ロール変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const found = await getManageableUser(id, auth.user);
  if ("error" in found) return found.error;

  const body = await request.json();
  const { role, name } = body;

  const updates: Record<string, string> = {};
  if (role) {
    const validRoles =
      auth.user.role === "super_admin"
        ? ["super_admin", "admin", "member"]
        : ["admin", "member"];
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
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  // 自分自身は削除不可
  if (id === auth.user.id) {
    return NextResponse.json(
      { error: "自分自身は削除できません" },
      { status: 400 }
    );
  }

  const found = await getManageableUser(id, auth.user);
  if ("error" in found) return found.error;

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
