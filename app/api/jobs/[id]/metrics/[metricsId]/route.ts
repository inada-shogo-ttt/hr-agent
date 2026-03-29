import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; metricsId: string }> }
) {
  const auth = await requireRole(["admin", "publisher"]);
  if ("error" in auth) return auth.error;

  const { metricsId } = await params;
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("PublishMetrics")
    .update({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", metricsId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; metricsId: string }> }
) {
  const auth = await requireRole(["admin", "publisher"]);
  if ("error" in auth) return auth.error;

  const { metricsId } = await params;

  const { error } = await supabaseAdmin
    .from("PublishMetrics")
    .delete()
    .eq("id", metricsId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
