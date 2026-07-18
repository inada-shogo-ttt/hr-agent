import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";
import { canReadOrg, getOwnedJob } from "@/lib/org-scope";

// GET /api/jobs/[id] — 求人詳細 + 全履歴
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: job, error } = await supabase
    .from("Job")
    .select(`
      *,
      Office(id, name),
      JobType(id, name),
      EmploymentType(id, name)
    `)
    .eq("id", id)
    .single();

  if (error || !job || !canReadOrg(auth.user, job.orgId)) {
    return NextResponse.json({ error: "求人が見つかりません" }, { status: 404 });
  }

  const { data: records } = await supabase
    .from("JobRecord")
    .select("*")
    .eq("jobId", id)
    .order("createdAt", { ascending: false });

  return NextResponse.json({
    ...job,
    officeName: (job.Office as unknown as { name: string } | null)?.name || "",
    jobTypeName: (job.JobType as unknown as { name: string } | null)?.name || "",
    employmentTypeName: (job.EmploymentType as unknown as { name: string } | null)?.name || "",
    records: records || [],
  });
}

// DELETE /api/jobs/[id] — 求人削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const owned = await getOwnedJob(id, auth.user, "write");
  if ("error" in owned) return owned.error;

  const { error } = await supabase.from("Job").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
