import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { uploadThumbnailImages } from "@/lib/thumbnail-storage";

export const runtime = "nodejs";

// POST /api/thumbnails — base64画像をSupabase Storageにアップロード
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { images, jobId, platform } = await request.json();

  if (!images?.length || !jobId || !platform) {
    return NextResponse.json(
      { error: "images, jobId, platform は必須です" },
      { status: 400 }
    );
  }

  const urls = await uploadThumbnailImages(images, jobId, platform);

  return NextResponse.json({ urls });
}
