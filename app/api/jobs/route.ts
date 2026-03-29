import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth-guard";

// GET /api/jobs — 求人一覧（Office/JobType/EmploymentType JOIN済み）
export async function GET() {
  const user = await getAuthUser();

  const { data: jobs, error } = await supabase
    .from("Job")
    .select(`
      *,
      Office(id, name),
      JobType(id, name),
      EmploymentType(id, name)
    `)
    .order("updatedAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // publisher は approved / published のみ
  let filteredJobs = jobs || [];
  if (user?.role === "publisher") {
    filteredJobs = filteredJobs.filter(
      (j) => j.status === "confirmed"
    );
  }

  // JOIN結果をフラット化
  const mapped = filteredJobs.map((job) => ({
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
