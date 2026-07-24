import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { canReadOrg } from "@/lib/org-scope";
import { getWorkflowRun } from "@/lib/workflow-run";

export const runtime = "nodejs";

// 実行中とみなす生存確認の猶予。サーバは約30秒ごとに updatedAt を更新するため、
// これを超えて更新が無い running はサーバ側で実行が死んだと判定する
const STALE_THRESHOLD_MS = 150 * 1000;

// GET /api/workflow-runs/[id] — 実行状態の取得(切断後の復旧ポーリング用)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const run = await getWorkflowRun(id);
  if (!run || !canReadOrg(auth.user, run.orgId)) {
    return NextResponse.json({ error: "実行が見つかりません" }, { status: 404 });
  }

  const stale =
    run.status === "running" &&
    Date.now() - new Date(run.updatedAt).getTime() > STALE_THRESHOLD_MS;

  const parseJson = (text: string | null) => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  return NextResponse.json({
    id: run.id,
    kind: run.kind,
    status: run.status,
    stale,
    agentStatuses: parseJson(run.agentStatuses),
    outputData: parseJson(run.outputData),
    recordId: run.recordId,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  });
}
