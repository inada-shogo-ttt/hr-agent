-- =============================================================
-- 参考サムネ スロット拡張（1〜3 → 1〜5） 移行 SQL
-- 対応設計書: docs/superpowers/specs/2026-07-26-thumbnail-direction-proposal-design.md
-- 適用方法: Supabase ダッシュボード > SQL Editor で全文実行
-- =============================================================

-- サムネイル生成が全媒体スロット式5枚に拡張されたため、
-- 構図参考画像（ReferenceThumbnail）のスロットも 1〜5 を許可する。
-- 4 = 待遇・数字訴求 / 5 = 働く人・仕事シーン
ALTER TABLE "ReferenceThumbnail" DROP CONSTRAINT IF EXISTS "ReferenceThumbnail_slot_check";

ALTER TABLE "ReferenceThumbnail" ADD CONSTRAINT "ReferenceThumbnail_slot_check"
  CHECK (slot BETWEEN 1 AND 5);
