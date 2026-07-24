-- 2026-07-23: Job.orgId の不整合データ修復
--
-- 背景:
--   POST /api/offices/[id]/jobs が求人作成時に「作成者の orgId」を保存していたため、
--   super_admin が他組織の事業所に求人を追加すると Job.orgId が事業所の組織と食い違い、
--   その組織のメンバーが原稿保存時に 404「求人が見つかりません」となる。
--   （コード側は office.orgId を継承するよう修正済み。これは既存データの修復。）
--
-- 事前確認: 不整合の件数と内訳
SELECT j.id AS job_id, j."orgId" AS job_org, o.name AS office_name, o."orgId" AS office_org
FROM "Job" j
JOIN "Office" o ON o.id = j."officeId"
WHERE j."orgId" IS DISTINCT FROM o."orgId";

-- 修復: Job.orgId を所属事業所の orgId に揃える
UPDATE "Job" j
SET "orgId" = o."orgId"
FROM "Office" o
WHERE j."officeId" = o.id
  AND j."orgId" IS DISTINCT FROM o."orgId";
