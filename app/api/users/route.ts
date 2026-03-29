import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

// GET /api/users — ユーザー一覧
export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("User")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/users — ユーザー招待
export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { email, name, role, password } = body;

  if (!email || !name || !role || !password) {
    return NextResponse.json(
      { error: "email, name, role, password は必須です" },
      { status: 400 }
    );
  }

  const validRoles = ["admin", "editor", "reviewer", "publisher"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: "無効なロールです" },
      { status: 400 }
    );
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
    { id: authData.user.id, email, name, role },
    { status: 201 }
  );
}
