import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  await supabaseAdmin
    .from("Notification")
    .update({ isRead: true })
    .eq("id", id)
    .eq("userId", auth.user.id);

  return NextResponse.json({ success: true });
}
