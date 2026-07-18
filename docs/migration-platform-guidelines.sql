-- =============================================================
-- 媒体別生成設定 + システム参考原稿 + 3階層ロール 移行 SQL
-- 対応設計書: docs/superpowers/specs/2026-07-19-platform-guideline-settings-design.md
-- 適用方法: Supabase ダッシュボード > SQL Editor で全文実行
-- ★ このSQLは ReferencePosting を SystemReferencePosting へコピーした後 DROP する。
--   適用前に必要ならバックアップを取ること。
-- =============================================================

-- 1. ロール再編: admin(旧・運営者) → super_admin / admin(組織管理者・新設) / member
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_role_check";

UPDATE "User" SET role = 'super_admin' WHERE role = 'admin';

ALTER TABLE "User" ADD CONSTRAINT "User_role_check"
  CHECK (role IN ('super_admin', 'admin', 'member'));

-- 2. PlatformGuideline: 媒体別の生成ガイドライン(①フォーマット ③アルゴリズム ④制約条件)
--    全組織共通・最高管理者のみ編集可。行が無い/空欄の項目はコード内デフォルト
--    (lib/platform-guidelines/defaults.ts)で動くため、シードは不要。
CREATE TABLE IF NOT EXISTS "PlatformGuideline" (
  platform TEXT PRIMARY KEY
    CHECK (platform IN ('indeed', 'airwork', 'jobmedley', 'hellowork')),
  format TEXT NOT NULL DEFAULT '',       -- ① 出力フォーマット
  algorithm TEXT NOT NULL DEFAULT '',    -- ③ 媒体アルゴリズムの前提知識
  "constraints" TEXT NOT NULL DEFAULT '', -- ④ 制約条件
  "updatedBy" TEXT,                      -- 最終更新者(User.id)
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SystemReferencePosting: 全組織共通の参考原稿(最高管理者のみ編集可)
CREATE TABLE IF NOT EXISTS "SystemReferencePosting" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  industry TEXT,
  "jobType" TEXT,
  "postingData" TEXT NOT NULL,           -- 原稿データ(JSON文字列)
  performance TEXT,                      -- 実績メモ(例: 月50件応募)
  "createdBy" TEXT,                      -- User.id(移行コピー分は NULL)
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_systemreference_platform
  ON "SystemReferencePosting" (platform);

-- アクセスは Service Role クライアント経由のみ(認可はアプリ層の requireRole で担保)
ALTER TABLE "PlatformGuideline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemReferencePosting" ENABLE ROW LEVEL SECURITY;

-- 4. 既存の組織別参考原稿をシステム参考原稿へコピーしてから廃止
INSERT INTO "SystemReferencePosting"
  (id, title, platform, industry, "jobType", "postingData", performance, "createdAt")
SELECT id::text, title, platform, industry, "jobType", "postingData", performance, "createdAt"
FROM "ReferencePosting"
ON CONFLICT (id) DO NOTHING;

DROP TABLE "ReferencePosting";
