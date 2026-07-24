import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth-guard";
import { canReadOrg, getOwnedJob } from "@/lib/org-scope";

// GET /api/jobs/[id] — 求人詳細 + 全履歴
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: job, error } = await supabase
    .from("Job")
    .select(`
      *,
      Office(id, name),
      JobType(id, name),
      EmploymentType(id, name)
    `)
    .eq("id", id)
    .single();

  if (error || !job || !canReadOrg(auth.user, job.orgId)) {
    return NextResponse.json({ error: "求人が見つかりません" }, { status: 404 });
  }

  const { data: records } = await supabase
    .from("JobRecord")
    .select("id, jobId, type, platform, createdAt, thumbnailUrls, outputData")
    .eq("jobId", id)
    .order("createdAt", { ascending: false });

  // 履歴一覧はメタ情報のみ返す(原稿全文は /records/[recordId] で展開時に遅延取得)。
  // 一覧のバッジ表示・媒体タブ分類・最新原稿のマージに必要な値はここで導出する
  const platformKeys = ["indeed", "airwork", "jobmedley", "hellowork"] as const;
  const parsedRecords = (records || []).map((r) => {
    let output: Record<string, unknown> | null = null;
    if (r.outputData) {
      try {
        output = JSON.parse(r.outputData) as Record<string, unknown>;
      } catch { /* 破損レコードはスキップ */ }
    }
    return { record: r, output };
  });

  const slimRecords = parsedRecords.map(({ record: r, output }) => {
    const improvements = output?.improvements;
    return {
      id: r.id,
      type: r.type,
      platform: r.platform,
      createdAt: r.createdAt,
      thumbnailUrls: r.thumbnailUrls,
      // team-a: outputData に含まれる媒体(タブ分類用)
      platforms:
        r.type === "team-a" && output ? platformKeys.filter((p) => output[p]) : [],
      // team-b: 改善箇所数(バッジ用)
      improvementCount: Array.isArray(improvements) ? improvements.length : 0,
      apiCostYen: typeof output?.apiCostYen === "number" ? output.apiCostYen : null,
    };
  });

  // 最新の原稿: 媒体を分けて生成すると各 team-a レコードには生成した媒体しか
  // 入っていないため、媒体ごとに「その媒体を含む最新のレコード」からマージする
  const teamAOutputs = parsedRecords.filter(
    (p): p is { record: (typeof parsedRecords)[number]["record"]; output: Record<string, unknown> } =>
      p.record.type === "team-a" && p.output !== null
  );
  let latestManuscript: Record<string, unknown> | null = null;
  let latestRecordId: string | null = null;
  if (teamAOutputs.length > 0) {
    latestRecordId = teamAOutputs[0].record.id;
    latestManuscript = { ...teamAOutputs[0].output };
    for (const p of platformKeys) {
      if (!latestManuscript[p]) {
        const source = teamAOutputs.find((t) => t.output[p]);
        if (source) latestManuscript[p] = source.output[p];
      }
    }
  }

  return NextResponse.json({
    ...job,
    officeName: (job.Office as unknown as { name: string } | null)?.name || "",
    jobTypeName: (job.JobType as unknown as { name: string } | null)?.name || "",
    employmentTypeName: (job.EmploymentType as unknown as { name: string } | null)?.name || "",
    records: slimRecords,
    latestManuscript,
    latestRecordId,
  });
}

// DELETE /api/jobs/[id] — 求人削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const owned = await getOwnedJob(id, auth.user, "write");
  if ("error" in owned) return owned.error;

  const { error } = await supabase.from("Job").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
