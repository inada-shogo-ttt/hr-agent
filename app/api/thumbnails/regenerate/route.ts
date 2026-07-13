import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { regenerateThumbnails, ThumbnailPlatform } from "@/lib/nanobanana";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_PLATFORMS: ThumbnailPlatform[] = ["indeed", "airwork", "jobmedley"];

// 参考画像を data URL に正規化（Supabase Storage 等の http URL は取得して base64 化）
async function resolveReferenceImage(referenceImage: string | null | undefined): Promise<string | null> {
  if (!referenceImage) return null;
  if (referenceImage.startsWith("data:image/")) return referenceImage;

  if (referenceImage.startsWith("http")) {
    const res = await fetch(referenceImage);
    if (!res.ok) throw new Error(`参考画像の取得に失敗しました: ${res.status}`);
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      throw new Error("参考画像のURLが画像ではありません");
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }

  throw new Error("referenceImage は data URL または http URL で指定してください");
}

// POST /api/thumbnails/regenerate — プロンプト＋参考画像からサムネイルを再生成し Storage に保存
export async function POST(request: NextRequest) {
  const { jobId, platform, prompt, referenceImage, count } = await request.json();

  if (!jobId || !platform || !prompt?.trim()) {
    return NextResponse.json(
      { error: "jobId, platform, prompt は必須です" },
      { status: 400 }
    );
  }
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: `platform は ${VALID_PLATFORMS.join(" / ")} のいずれかを指定してください` },
      { status: 400 }
    );
  }

  let resolvedReference: string | null;
  try {
    resolvedReference = await resolveReferenceImage(referenceImage);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "参考画像の処理に失敗しました" },
      { status: 400 }
    );
  }

  const result = await regenerateThumbnails({
    prompt: prompt.trim(),
    platform,
    referenceImage: resolvedReference,
    count,
  });

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  // Supabase Storage にアップロードして公開 URL を返す
  const urls: string[] = [];
  for (let i = 0; i < result.urls.length; i++) {
    const matches = result.urls[i].match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) continue;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const path = `${jobId}/${platform}/${Date.now()}-regen-${i}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("thumbnails")
      .upload(path, buffer, {
        contentType: `image/${matches[1]}`,
        upsert: true,
      });

    if (error) {
      console.error(`Regenerated thumbnail upload failed: ${path}`, error.message);
      continue;
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("thumbnails")
      .getPublicUrl(path);

    urls.push(publicUrl.publicUrl);
  }

  if (urls.length === 0) {
    return NextResponse.json(
      { error: "生成画像の保存に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ urls, message: result.message });
}
