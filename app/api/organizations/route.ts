import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

// GET /api/organizations — 組織一覧(メンバー込み・運営者専用)
export async function GET() {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("Organization")
    .select(`*, User(id, email, name, role, createdAt)`)
    .order("createdAt", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/organizations — 組織作成(事業所ID発行・運営者専用)
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const billingExempt = body.billingExempt === true;

  if (!code || !name) {
    return NextResponse.json(
      { error: "事業所IDと組織名は必須です" },
      { status: 400 }
    );
  }
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
    return NextResponse.json(
      { error: "事業所IDは3〜20文字の英数字(ハイフン可)で入力してください" },
      { status: 400 }
    );
  }

  const { data: org, error } = await supabaseAdmin
    .from("Organization")
    .insert({ code, name, billingExempt })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "この事業所IDは既に使われています" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 運営者組織の職種・雇用形態マスタを雛形として新組織へコピー
  const { data: jobTypes } = await supabaseAdmin
    .from("JobType")
    .select("name, color")
    .eq("orgId", auth.user.orgId);
  if (jobTypes && jobTypes.length > 0) {
    await supabaseAdmin
      .from("JobType")
      .insert(jobTypes.map((t) => ({ ...t, orgId: org.id })));
  }

  const { data: employmentTypes } = await supabaseAdmin
    .from("EmploymentType")
    .select("name")
    .eq("orgId", auth.user.orgId);
  if (employmentTypes && employmentTypes.length > 0) {
    await supabaseAdmin
      .from("EmploymentType")
      .insert(employmentTypes.map((t) => ({ ...t, orgId: org.id })));
  }

  return NextResponse.json(org, { status: 201 });
}
