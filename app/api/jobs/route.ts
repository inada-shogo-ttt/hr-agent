import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/jobs — 求人一覧（Office/JobType/EmploymentType JOIN済み）
export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let query = supabase
    .from("Job")
    .select(`
      *,
      Office(id, name),
      JobType(id, name),
      EmploymentType(id, name)
    `)
    .order("updatedAt", { ascending: false });

  if (auth.user.role !== "super_admin") query = query.eq("orgId", auth.user.orgId);

  const { data: jobs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // JOIN結果をフラット化
  const mapped = (jobs || []).map((job) => ({
    ...job,
    officeName: (job.Office as unknown as { name: string } | null)?.name || "",
    jobTypeName: (job.JobType as unknown as { name: string } | null)?.name || "",
    employmentTypeName: (job.EmploymentType as unknown as { name: string } | null)?.name || "",
  }));

  // 各求人の最新レコードを取得
  const jobsWithRecords = await Promise.all(
    mapped.map(async (job) => {
      const { data: records } = await supabase
        .from("JobRecord")
        .select("type, platform, createdAt")
        .eq("jobId", job.id)
        .order("createdAt", { ascending: false })
        .limit(1);

      return { ...job, records: records || [] };
    })
  );

  return NextResponse.json(jobsWithRecords);
}
