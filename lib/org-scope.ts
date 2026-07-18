import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AppUser } from "@/types/auth";

// super_admin(最高管理者)は全組織のデータを読み書き可。admin / member は自組織のみ
export function canReadOrg(user: AppUser, orgId: string | null | undefined): boolean {
  return user.role === "super_admin" || user.orgId === orgId;
}

export function canWriteOrg(user: AppUser, orgId: string | null | undefined): boolean {
  return user.role === "super_admin" || user.orgId === orgId;
}

// Job を取得して組織の所有確認を行う(存在も権限も無い場合は 404 で統一)
export async function getOwnedJob(
  jobId: string,
  user: AppUser,
  access: "read" | "write"
): Promise<
  | { job: { id: string; orgId: string } & Record<string, unknown> }
  | { error: NextResponse }
> {
  const { data: job } = await supabaseAdmin
    .from("Job")
    .select("*")
    .eq("id", jobId)
    .single();

  const allowed =
    job && (access === "read" ? canReadOrg(user, job.orgId) : canWriteOrg(user, job.orgId));

  if (!allowed) {
    return {
      error: NextResponse.json({ error: "求人が見つかりません" }, { status: 404 }),
    };
  }
  return { job };
}
