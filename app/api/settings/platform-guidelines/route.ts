import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth-guard";
import { Platform } from "@/types/platform";
import {
  GUIDELINE_PLATFORMS,
  PLATFORM_GUIDELINE_DEFAULTS,
} from "@/lib/platform-guidelines/defaults";

export const runtime = "nodejs";

// GET /api/settings/platform-guidelines — 全媒体の設定(最高管理者専用)
// 未保存・空欄の項目はコード内デフォルトを埋めて返す(saved で保存有無を区別)
export async function GET() {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("PlatformGuideline")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = new Map((data || []).map((r) => [r.platform as string, r]));
  const platforms = GUIDELINE_PLATFORMS.map((platform) => {
    const row = rows.get(platform);
    const defaults = PLATFORM_GUIDELINE_DEFAULTS[platform];
    const pick = (key: "format" | "algorithm" | "constraints") => {
      const value = row?.[key];
      return typeof value === "string" && value.trim() ? value : defaults[key];
    };
    return {
      platform,
      format: pick("format"),
      algorithm: pick("algorithm"),
      constraints: pick("constraints"),
      saved: !!row,
      updatedAt: row?.updatedAt ?? null,
    };
  });

  return NextResponse.json({ platforms });
}

// PUT /api/settings/platform-guidelines — 1媒体分を upsert(最高管理者専用)
export async function PUT(request: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { platform, format, algorithm, constraints } = body as {
    platform?: Platform;
    format?: string;
    algorithm?: string;
    constraints?: string;
  };

  if (!platform || !GUIDELINE_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "無効な媒体です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("PlatformGuideline")
    .upsert(
      {
        platform,
        format: typeof format === "string" ? format : "",
        algorithm: typeof algorithm === "string" ? algorithm : "",
        constraints: typeof constraints === "string" ? constraints : "",
        updatedBy: auth.user.id,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "platform" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
