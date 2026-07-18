import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { checkSeatAvailable } from "@/lib/billing/seats";

export const runtime = "nodejs";

// GET /api/users — ユーザー一覧
// super_admin: 全組織(?orgId= で絞り込み可) / admin: 自組織のみ(最高管理者は不可視)
export async function GET(request: NextRequest) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const isSuper = auth.user.role === "super_admin";
  const orgId = isSuper
    ? new URL(request.url).searchParams.get("orgId")
    : auth.user.orgId;

  let query = supabaseAdmin
    .from("User")
    .select("*")
    .order("createdAt", { ascending: false });
  if (orgId) query = query.eq("orgId", orgId);
  if (!isSuper) query = query.neq("role", "super_admin");

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/users — メンバー追加
// super_admin: 任意の組織へ / admin: 自組織のみ(付与できるロールは admin / member)
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin", "admin"]);
  if ("error" in auth) return auth.error;

  const isSuper = auth.user.role === "super_admin";
  const body = await request.json();
  const { email, name, password } = body;
  const orgId = isSuper ? body.orgId : auth.user.orgId;
  const role = body.role || "member";

  if (!orgId || !email || !name || !password) {
    return NextResponse.json(
      { error: "orgId, email, name, password は必須です" },
      { status: 400 }
    );
  }

  const allowedRoles = isSuper
    ? ["super_admin", "admin", "member"]
    : ["admin", "member"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "無効なロールです" }, { status: 400 });
  }

  const { data: org } = await supabaseAdmin
    .from("Organization")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "組織が見つかりません" }, { status: 404 });
  }

  const seat = await checkSeatAvailable(org);
  if (!seat.ok) {
    return NextResponse.json({ error: seat.message }, { status: 400 });
  }

  // Supabase Auth でユーザー作成
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // User テーブルにプロフィール作成
  const { error: profileError } = await supabaseAdmin.from("User").insert({
    id: authData.user.id,
    email,
    name,
    role,
    orgId,
  });

  if (profileError) {
    // ロールバック: Auth ユーザーも削除
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { id: authData.user.id, email, name, role, orgId },
    { status: 201 }
  );
}
