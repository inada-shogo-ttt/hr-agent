import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin", "editor"]);
  if ("error" in auth) return auth.error;

  const { id: officeId } = await params;
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
