import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-guard";
import { getOwnedJob } from "@/lib/org-scope";
import { extractKnowledge } from "@/lib/knowledge-extractor";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const owned = await getOwnedJob(id, auth.user, "read");
  if ("error" in owned) return owned.error;

  const { data, error } = await supabaseAdmin
    .from("PublishMetrics")
    .select("*")
    .eq("jobId", id)
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const owned = await getOwnedJob(id, auth.user, "write");
  if ("error" in owned) return owned.error;

  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("PublishMetrics")
    .insert({
      jobId: id,
      platform: body.platform,
      publishedBy: auth.user.id,
      startDate: body.startDate,
      endDate: body.endDate || null,
      impressions: body.impressions || null,
      clicks: body.clicks || null,
      applications: body.applications || null,
      cost: body.cost || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // メトリクス登録をトリガーにナレッジ自動抽出（非同期・エラー無視）
  extractKnowledge().catch((e) =>
    console.warn("[metrics] ナレッジ自動抽出エラー（続行）:", e)
  );

  return NextResponse.json(data, { status: 201 });
}
