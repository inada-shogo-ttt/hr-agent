import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// POST /api/thumbnails — base64画像をSupabase Storageにアップロード
export async function POST(request: NextRequest) {
  const { images, jobId, platform } = await request.json();

  if (!images?.length || !jobId || !platform) {
    return NextResponse.json(
      { error: "images, jobId, platform は必須です" },
      { status: 400 }
    );
  }

  const urls: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const base64 = images[i] as string;
    if (!base64.startsWith("data:image/")) continue;

    // data:image/png;base64,xxxxx → バイナリに変換
    const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) continue;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const path = `${jobId}/${platform}/${Date.now()}-${i}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("thumbnails")
      .upload(path, buffer, {
        contentType: `image/${matches[1]}`,
        upsert: true,
      });

    if (error) {
      console.error(`Thumbnail upload failed: ${path}`, error.message);
      continue;
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("thumbnails")
      .getPublicUrl(path);

    urls.push(publicUrl.publicUrl);
  }

  return NextResponse.json({ urls });
}
