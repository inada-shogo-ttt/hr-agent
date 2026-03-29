import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { data: notifications } = await supabaseAdmin
    .from("Notification")
    .select("*")
    .eq("userId", auth.user.id)
    .order("createdAt", { ascending: false })
    .limit(20);

  const { count } = await supabaseAdmin
    .from("Notification")
    .select("*", { count: "exact", head: true })
    .eq("userId", auth.user.id)
    .eq("isRead", false);

  return NextResponse.json({
    notifications: notifications || [],
    unreadCount: count || 0,
  });
}
