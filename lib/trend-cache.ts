import { supabaseAdmin } from "@/lib/supabase/admin";
import { TrendResearchOutput } from "@/lib/agents/types";

// トレンド調査(Web検索)の結果キャッシュ。
// 同じ職種×業種×地域×雇用形態なら結果はほぼ変わらないため、TTL内は再調査をスキップする。
// キャッシュ層の失敗は生成フローを止めない(常に null / 無視で続行)。

const TTL_DAYS = 7;

export interface TrendCacheParams {
  industry: string;
  jobCategory: string;
  prefecture: string;
  employmentType: string;
}

function buildCacheKey(p: TrendCacheParams): string {
  const norm = (s: string) => (s || "").trim();
  return [norm(p.jobCategory), norm(p.industry), norm(p.prefecture), norm(p.employmentType)].join("|");
}

export async function getCachedTrendResearch(
  p: TrendCacheParams
): Promise<TrendResearchOutput | null> {
  try {
    const minCreatedAt = new Date(
      Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data } = await supabaseAdmin
      .from("TrendCache")
      .select("*")
      .eq("cacheKey", buildCacheKey(p))
      .gte("createdAt", minCreatedAt)
      .maybeSingle();
    if (!data?.trendResearch) return null;
    return JSON.parse(data.trendResearch) as TrendResearchOutput;
  } catch (e) {
    console.warn("[trend-cache] 取得に失敗（ライブ調査で続行）:", e);
    return null;
  }
}

export async function saveTrendResearch(
  p: TrendCacheParams,
  output: TrendResearchOutput
): Promise<void> {
  try {
    await supabaseAdmin.from("TrendCache").upsert(
      {
        cacheKey: buildCacheKey(p),
        industry: p.industry || null,
        jobCategory: p.jobCategory || null,
        prefecture: p.prefecture || null,
        employmentType: p.employmentType || null,
        trendResearch: JSON.stringify(output),
        createdAt: new Date().toISOString(),
      },
      { onConflict: "cacheKey" }
    );
  } catch (e) {
    console.warn("[trend-cache] 保存に失敗（無視して続行）:", e);
  }
}
