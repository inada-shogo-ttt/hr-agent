import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  await supabaseAdmin
    .from("Notification")
    .update({ isRead: true })
    .eq("userId", auth.user.id)
    .eq("isRead", false);

  return NextResponse.json({ success: true });
}
