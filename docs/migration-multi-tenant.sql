-- =============================================================
-- マルチテナント化 移行 SQL
-- 対応設計書: docs/superpowers/specs/2026-07-18-multi-tenant-billing-design.md
-- 適用方法: Supabase ダッシュボード > SQL Editor で全文実行
-- ★ 実行前に最下部 DO ブロックの op_code / op_name(運営者組織)を確認・変更すること
-- =============================================================

-- 1. Organization: 契約主体(ログイン時の「事業所ID」= code)
CREATE TABLE IF NOT EXISTS "Organization" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                     -- 事業所ID(例: TTT001)
  name TEXT NOT NULL,                            -- 組織名
  "billingExempt" BOOLEAN NOT NULL DEFAULT false, -- 課金免除フラグ
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  plan TEXT CHECK (plan IN ('starter', 'standard', 'pro')),
  "subscriptionStatus" TEXT,                     -- active / past_due / canceled / NULL
  "currentPeriodStart" TIMESTAMPTZ,
  "currentPeriodEnd" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_code ON "Organization" (code);

-- 2. UsageLog: Team A/B 実行の課金台帳
CREATE TABLE IF NOT EXISTS "UsageLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID NOT NULL REFERENCES "Organization"(id),
  "userId" UUID NOT NULL,                        -- 実行したユーザー(User.id)
  kind TEXT NOT NULL CHECK (kind IN ('team_a', 'team_b')),
  "jobId" TEXT,                                  -- 対象求人(Job.id)
  "baseAmountYen" INTEGER NOT NULL,              -- クレジット消化の基準単価(A=800 / B=400)
  "overageAmountYen" INTEGER NOT NULL DEFAULT 0, -- 超過課金額(クレジット内なら0)
  "stripeInvoiceItemId" TEXT,                    -- 超過課金の InvoiceItem。未請求は NULL
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usagelog_org_created ON "UsageLog" ("orgId", "createdAt" DESC);

-- 3. User: 組織への帰属 + ロール整理(admin / member の2種へ)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organization"(id);
CREATE INDEX IF NOT EXISTS idx_user_org ON "User" ("orgId");

-- 旧 CHECK 制約は 'member' を許可していないため、更新前に差し替える
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_role_check";

UPDATE "User" SET role = 'member' WHERE role <> 'admin';

ALTER TABLE "User" ADD CONSTRAINT "User_role_check" CHECK (role IN ('admin', 'member'));

-- 4. テナント分離対象テーブルへ orgId を追加
ALTER TABLE "Office"          ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organization"(id);
ALTER TABLE "Job"             ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organization"(id);
ALTER TABLE "ReferencePosting" ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organization"(id);
ALTER TABLE "TeamBMemory"     ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organization"(id);
ALTER TABLE "JobType"         ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organization"(id);
ALTER TABLE "EmploymentType"  ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organization"(id);

CREATE INDEX IF NOT EXISTS idx_office_org           ON "Office" ("orgId");
CREATE INDEX IF NOT EXISTS idx_job_org              ON "Job" ("orgId");
CREATE INDEX IF NOT EXISTS idx_referenceposting_org ON "ReferencePosting" ("orgId");
CREATE INDEX IF NOT EXISTS idx_teambmemory_org      ON "TeamBMemory" ("orgId");
CREATE INDEX IF NOT EXISTS idx_jobtype_org          ON "JobType" ("orgId");
CREATE INDEX IF NOT EXISTS idx_employmenttype_org   ON "EmploymentType" ("orgId");

-- ※ JobRecord / PublishMetrics は親 Job の orgId で所有確認するためカラム追加なし
-- ※ SharedKnowledge は全組織共有のため変更なし

-- 5. 既存データを運営者組織へ帰属させる
DO $$
DECLARE
  op_code TEXT := 'TTT001';        -- ★ 運営者組織の事業所ID(ログイン時に入力する値)
  op_name TEXT := 'TTTグループ(運営)'; -- ★ 運営者組織の表示名
  org_id UUID;
BEGIN
  INSERT INTO "Organization" (code, name, "billingExempt")
  VALUES (op_code, op_name, true)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO org_id;

  UPDATE "User"             SET "orgId" = org_id WHERE "orgId" IS NULL;
  UPDATE "Office"           SET "orgId" = org_id WHERE "orgId" IS NULL;
  UPDATE "Job"              SET "orgId" = org_id WHERE "orgId" IS NULL;
  UPDATE "ReferencePosting" SET "orgId" = org_id WHERE "orgId" IS NULL;
  UPDATE "TeamBMemory"      SET "orgId" = org_id WHERE "orgId" IS NULL;
  UPDATE "JobType"          SET "orgId" = org_id WHERE "orgId" IS NULL;
  UPDATE "EmploymentType"   SET "orgId" = org_id WHERE "orgId" IS NULL;
END $$;

-- 6. 帰属完了後は orgId を必須化
ALTER TABLE "User"             ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Office"           ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Job"              ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "ReferencePosting" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "TeamBMemory"      ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "JobType"          ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "EmploymentType"   ALTER COLUMN "orgId" SET NOT NULL;
