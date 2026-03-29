import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const statusFilter = request.nextUrl.searchParams.get("status");

  let query = supabaseAdmin
    .from("PublishRequest")
    .select(`*, assignedUser:User!assignedTo(id, name)`)
    .eq("assignedTo", auth.user.id)
    .order("createdAt", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 各リクエストのJob情報を個別に取得
  const mapped = await Promise.all(
    (data || []).map(async (r) => {
      const { data: job } = await supabaseAdmin
        .from("Job")
        .select("id, Office(name), JobType(name, color), EmploymentType(name)")
        .eq("id", r.jobId)
        .single();

      return {
        ...r,
        officeName: (job?.Office as unknown as { name: string } | null)?.name || "",
        jobTypeName: (job?.JobType as unknown as { name: string } | null)?.name || "",
        jobTypeColor: (job?.JobType as unknown as { name: string; color?: string } | null)?.color || "#6b7280",
        employmentTypeName: (job?.EmploymentType as unknown as { name: string } | null)?.name || "",
      };
    })
  );

  return NextResponse.json(mapped);
}
