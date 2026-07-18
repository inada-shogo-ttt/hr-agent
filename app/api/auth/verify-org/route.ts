import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

// POST /api/auth/verify-org — ログイン直後に事業所ID(Organization.code)を照合
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const { data: org } = await supabaseAdmin
    .from("Organization")
    .select("code")
    .eq("id", auth.user.orgId)
    .single();

  const valid = !!org && org.code.toLowerCase() === code.toLowerCase();
  return NextResponse.json({ valid });
}
