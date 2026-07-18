import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";

export const runtime = "nodejs";

// DELETE /api/reference-thumbnails/[id] — 参考サムネ削除（admin専用）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: row, error: fetchError } = await supabaseAdmin
    .from("ReferenceThumbnail")
    .select("id, storagePath")
    .eq("id", id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: "参考サムネが見つかりません" }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from("ReferenceThumbnail")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }

  // Storage 側の削除失敗は致命的でないため警告のみ
  const { error: storageError } = await supabaseAdmin.storage
    .from("thumbnails")
    .remove([row.storagePath]);
  if (storageError) {
    console.warn(`Reference thumbnail storage cleanup failed: ${row.storagePath}`, storageError.message);
  }

  return NextResponse.json({ success: true });
}
