import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("Office")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 各事業所の求人数を取得
  const offices = await Promise.all(
    (data || []).map(async (office) => {
      const { data: jobs } = await supabaseAdmin
        .from("Job")
        .select("id, status")
        .eq("officeId", office.id);

      return { ...office, jobCount: jobs?.length || 0 };
    })
  );

  return NextResponse.json(offices);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { name, assignments } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "事業所名は必須です" }, { status: 400 });
  }

  // 事業所作成
  const { data: office, error: officeError } = await supabaseAdmin
    .from("Office")
    .insert({ name: name.trim(), createdBy: auth.user.id })
    .select()
    .single();

  if (officeError) {
    return NextResponse.json({ error: officeError.message }, { status: 500 });
  }

  // Job一括作成
  if (assignments?.length > 0) {
    const now = new Date().toISOString();
    const jobs: Array<Record<string, unknown>> = [];

    for (const assignment of assignments) {
      for (const employmentTypeId of assignment.employmentTypeIds) {
        jobs.push({
          id: crypto.randomUUID(),
          officeId: office.id,
          jobTypeId: assignment.jobTypeId,
          employmentTypeId,
          status: "draft",
          createdBy: auth.user.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (jobs.length > 0) {
      const { error: jobError } = await supabaseAdmin
        .from("Job")
        .insert(jobs);

      if (jobError) {
        // ロールバック: 事業所削除
        await supabaseAdmin.from("Office").delete().eq("id", office.id);
        return NextResponse.json({ error: jobError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json(office, { status: 201 });
}
