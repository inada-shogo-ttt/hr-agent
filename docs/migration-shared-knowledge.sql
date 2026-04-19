-- SharedKnowledge テーブル: 全アカウント共有のナレッジベース
-- 成功した求人原稿のパターンを匿名化して蓄積し、全ユーザーに恩恵を提供
CREATE TABLE IF NOT EXISTS "SharedKnowledge" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 分類
  category TEXT NOT NULL,           -- 職種カテゴリ (介護職, 保育士, 看護師, etc.)
  platform TEXT NOT NULL,           -- 媒体 (indeed, airwork, jobmedley, hellowork)
  "knowledgeType" TEXT NOT NULL,    -- パターン種別 (structure_pattern, appeal_point, tone, keyword, section_rule)
  -- コンテンツ
  content TEXT NOT NULL,            -- ルール本文（匿名化済み）
  example TEXT,                     -- 成功例の抜粋（匿名化済み）
  -- エビデンス
  "evidenceCount" INTEGER NOT NULL DEFAULT 1,    -- 何件の実績から抽出されたか
  "avgImpactScore" REAL NOT NULL DEFAULT 0,      -- 平均的な効果スコア (-1.0 ~ 1.0)
  "totalImpressions" INTEGER NOT NULL DEFAULT 0, -- 合計インプレッション
  "totalClicks" INTEGER NOT NULL DEFAULT 0,      -- 合計クリック
  "totalApplications" INTEGER NOT NULL DEFAULT 0,-- 合計応募数
  -- タイムスタンプ
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス: 職種×媒体での検索を高速化
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_category_platform
  ON "SharedKnowledge" (category, platform);

CREATE INDEX IF NOT EXISTS idx_shared_knowledge_type
  ON "SharedKnowledge" ("knowledgeType");

CREATE INDEX IF NOT EXISTS idx_shared_knowledge_score
  ON "SharedKnowledge" ("avgImpactScore" DESC);

-- RLS: 全ユーザーが読み取り可能、service_role のみ書き込み可能
ALTER TABLE "SharedKnowledge" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SharedKnowledge read access" ON "SharedKnowledge"
  FOR SELECT USING (true);

CREATE POLICY "SharedKnowledge service write" ON "SharedKnowledge"
  FOR ALL USING (auth.role() = 'service_role');
