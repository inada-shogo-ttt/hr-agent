import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";

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

  if (officeError || !office) {
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

  // 最新レコードを各Jobに紐付け
  const jobsWithRecords = await Promise.all(
    (jobs || []).map(async (job) => {
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
