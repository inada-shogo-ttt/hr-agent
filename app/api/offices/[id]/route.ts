import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";
import { canReadOrg } from "@/lib/org-scope";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: office, error: officeError } = await supabaseAdmin
    .from("Office")
    .select("*")
    .eq("id", id)
    .single();

  if (officeError || !office || !canReadOrg(auth.user, office.orgId)) {
    return NextResponse.json({ error: "事業所が見つかりません" }, { status: 404 });
  }

  const { data: jobs } = await supabaseAdmin
    .from("Job")
    .select(`
      *,
      JobType(id, name, color),
      EmploymentType(id, name)
    `)
    .eq("officeId", id)
    .order("createdAt", { ascending: true });

  // 閲覧権限のある求人のみ返す（orgId 不整合データの露出防止）
  const visibleJobs = (jobs || []).filter((job) => canReadOrg(auth.user, job.orgId));

  // 最新レコードを各Jobに紐付け
  const jobsWithRecords = await Promise.all(
    visibleJobs.map(async (job) => {
      const { data: records } = await supabaseAdmin
        .from("JobRecord")
        .select("type, platform, createdAt")
        .eq("jobId", job.id)
        .order("createdAt", { ascending: false })
        .limit(1);

      return { ...job, records: records || [] };
    })
  );

  return NextResponse.json({ ...office, jobs: jobsWithRecords });
}
