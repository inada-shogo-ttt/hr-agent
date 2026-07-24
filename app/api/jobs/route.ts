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

  // 各求人の最新レコードを1クエリでまとめて取得(N+1回避)。
  // createdAt 降順で全件のメタ情報だけを引き、求人ごとに最初の1件を採用する
  const jobIds = mapped.map((job) => job.id);
  const latestByJob: Record<string, { type: string; platform: string; createdAt: string }> = {};
  if (jobIds.length > 0) {
    const { data: recentRecords } = await supabase
      .from("JobRecord")
      .select("jobId, type, platform, createdAt")
      .in("jobId", jobIds)
      .order("createdAt", { ascending: false });
    for (const r of recentRecords || []) {
      if (!latestByJob[r.jobId]) {
        latestByJob[r.jobId] = { type: r.type, platform: r.platform, createdAt: r.createdAt };
      }
    }
  }

  const jobsWithRecords = mapped.map((job) => ({
    ...job,
    records: latestByJob[job.id] ? [latestByJob[job.id]] : [],
  }));

  return NextResponse.json(jobsWithRecords);
}
