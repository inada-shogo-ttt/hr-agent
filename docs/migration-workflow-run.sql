-- =============================================================
-- WorkflowRun: Team A / Team B 実行状態の永続化 移行 SQL
-- 目的: SSE接続が切断されても生成をサーバ側で継続し、
--       クライアントがポーリングで復旧できるようにする
-- 適用方法: Supabase ダッシュボード > SQL Editor で全文実行
-- =============================================================

-- 実行1回 = 1行。エージェント進行状況・最終出力・保存済みレコードIDを保持する。
-- アクセスは Service Role クライアント経由のみ(組織チェックはアプリ層 canReadOrg)
CREATE TABLE IF NOT EXISTS "WorkflowRun" (
  id UUID PRIMARY KEY,                        -- クライアント発行の runId
  "jobId" TEXT NOT NULL,                      -- 対象求人(Job.id)
  "orgId" UUID NOT NULL,                      -- 実行ユーザーの組織
  "userId" UUID,                              -- 実行ユーザー(User.id)
  kind TEXT NOT NULL CHECK (kind IN ('team-a', 'team-b')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'error')),
  "agentStatuses" TEXT,                       -- { agentId: { status, message } } の JSON 文字列
  "outputData" TEXT,                          -- 完了時の最終出力(JSON 文字列、サムネイルは Storage URL)
  "recordId" TEXT,                            -- サーバ側で保存した JobRecord.id
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()  -- 実行中は約30秒ごとに更新(生存確認)
);

CREATE INDEX IF NOT EXISTS idx_workflowrun_job_created ON "WorkflowRun" ("jobId", "createdAt" DESC);

ALTER TABLE "WorkflowRun" ENABLE ROW LEVEL SECURITY;
