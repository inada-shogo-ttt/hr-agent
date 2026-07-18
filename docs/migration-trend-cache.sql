-- =============================================================
-- トレンド調査キャッシュ 移行 SQL
-- 対応設計書: docs/superpowers/specs/2026-07-19-platform-guideline-settings-design.md の後続改善
-- 適用方法: Supabase ダッシュボード > SQL Editor で全文実行
-- =============================================================

-- TrendCache: Team A トレンド調査(Web検索)の結果キャッシュ(TTL 7日はアプリ層で判定)
-- 全組織共有(トレンドは公開情報のため)。アクセスは Service Role クライアント経由のみ
CREATE TABLE IF NOT EXISTS "TrendCache" (
  "cacheKey" TEXT PRIMARY KEY,        -- 職種|業種|都道府県|雇用形態
  industry TEXT,
  "jobCategory" TEXT,
  prefecture TEXT,
  "employmentType" TEXT,
  "trendResearch" TEXT NOT NULL,      -- TrendResearchOutput の JSON 文字列
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "TrendCache" ENABLE ROW LEVEL SECURITY;
