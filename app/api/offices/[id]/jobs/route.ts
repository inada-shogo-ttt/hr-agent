import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";
import { canWriteOrg } from "@/lib/org-scope";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id: officeId } = await params;

  const { data: office } = await supabaseAdmin
    .from("Office")
    .select("orgId")
    .eq("id", officeId)
    .single();

  if (!office || !canWriteOrg(auth.user, office.orgId)) {
    return NextResponse.json({ error: "事業所が見つかりません" }, { status: 404 });
  }

  const { jobTypeId, employmentTypeIds } = await request.json();

  if (!jobTypeId || !employmentTypeIds?.length) {
    return NextResponse.json(
      { error: "職種と勤務形態は必須です" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const jobs = employmentTypeIds.map((employmentTypeId: string) => ({
    id: crypto.randomUUID(),
    officeId,
    jobTypeId,
    employmentTypeId,
    // super_admin が他組織の事業所に求人を追加しても事業所の組織に帰属させる
    orgId: office.orgId,
    status: "draft",
    createdBy: auth.user.id,
    createdAt: now,
    updatedAt: now,
  }));

  const { data, error } = await supabaseAdmin
    .from("Job")
    .insert(jobs)
    .select();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "同じ組み合わせの求人が既に存在します" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
