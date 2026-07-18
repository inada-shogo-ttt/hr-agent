-- ReferenceThumbnail テーブル: 全アカウント共通のサムネイル構図参考画像（参考サムネ）
-- 管理者(admin)のみが設定ページで登録・削除できる。
-- サムネイル生成時に、スロット（1=メイン/2=雰囲気/3=事業所）ごとに AI が求人内容に合う1枚を自動選定し、
-- 構図（テキストのフォント・文字サイズ・人物の配置など）の参考画像として gpt-image-2 に渡す。
CREATE TABLE IF NOT EXISTS "ReferenceThumbnail" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 3),  -- 対象スロット（1=クリック率重視, 2=職場の雰囲気, 3=事業所の様子）
  url TEXT NOT NULL,                                   -- Storage 公開URL
  "storagePath" TEXT NOT NULL,                         -- Storage パス（削除用）
  description TEXT,                                    -- 任意メモ（AI自動選定の補助情報。例: 「介護向け」「文字大きめ」）
  "createdBy" UUID,                                    -- 登録した管理者の User.id
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reference_thumbnail_slot
  ON "ReferenceThumbnail" (slot, "createdAt" DESC);

-- RLS: 読み書きとも service_role のみ（アクセスは全て API ルート経由で権限チェック済み）
ALTER TABLE "ReferenceThumbnail" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ReferenceThumbnail service access" ON "ReferenceThumbnail"
  FOR ALL USING (auth.role() = 'service_role');
