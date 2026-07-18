import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { listReferenceThumbnails } from "@/lib/reference-thumbnails";

export const runtime = "nodejs";

// GET /api/reference-thumbnails — 参考サムネ一覧（admin専用）
export async function GET() {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  try {
    const items = await listReferenceThumbnails();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/reference-thumbnails — 参考サムネ登録（admin専用）
// body: { images: base64 data URL[], slot: 1|2|3, description?: string }
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const { images, slot, description } = await request.json();

  if (!images?.length || ![1, 2, 3].includes(slot)) {
    return NextResponse.json(
      { error: "images と slot (1〜3) は必須です" },
      { status: 400 }
    );
  }

  const created = [];
  for (let i = 0; i < images.length; i++) {
    const matches = (images[i] as string).match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) continue;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const path = `reference-thumbnails/slot${slot}/${Date.now()}-${i}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("thumbnails")
      .upload(path, buffer, {
        contentType: `image/${matches[1]}`,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Reference thumbnail upload failed: ${path}`, uploadError.message);
      continue;
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("thumbnails")
      .getPublicUrl(path);

    const { data: row, error: insertError } = await supabaseAdmin
      .from("ReferenceThumbnail")
      .insert({
        slot,
        url: publicUrl.publicUrl,
        storagePath: path,
        description: description?.trim() || null,
        createdBy: auth.user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Reference thumbnail insert failed:", insertError.message);
      await supabaseAdmin.storage.from("thumbnails").remove([path]);
      continue;
    }
    created.push(row);
  }

  if (created.length === 0) {
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ items: created });
}
