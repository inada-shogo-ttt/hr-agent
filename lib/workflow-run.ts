// Team A / Team B 実行状態の永続化(WorkflowRun テーブル)
// SSE接続が切断されても、クライアントが GET /api/workflow-runs/[id] で復旧できるようにする。
// 永続化は補助機能のため、DB障害でワークフロー本体を止めない(書き込み系は失敗しても投げない)。

import { supabaseAdmin } from "@/lib/supabase/admin";

export type WorkflowRunKind = "team-a" | "team-b";
export type WorkflowRunStatus = "running" | "completed" | "error";

// クライアントの進捗表示を復元するためのエージェント状態スナップショット
export type WorkflowAgentStatuses = Record<string, { status: string; message?: string }>;

export interface WorkflowRunRow {
  id: string;
  jobId: string;
  orgId: string;
  userId: string | null;
  kind: WorkflowRunKind;
  status: WorkflowRunStatus;
  agentStatuses: string | null;
  outputData: string | null;
  recordId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createWorkflowRun(run: {
  id: string;
  jobId: string;
  orgId: string;
  userId: string | null;
  kind: WorkflowRunKind;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("WorkflowRun").insert({
      ...run,
      status: "running",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (error) console.warn("[workflow-run] 作成に失敗:", error.message);
  } catch (e) {
    console.warn("[workflow-run] 作成に失敗:", e);
  }
}

export async function updateWorkflowRun(
  id: string,
  patch: {
    status?: WorkflowRunStatus;
    agentStatuses?: WorkflowAgentStatuses;
    outputData?: unknown;
    recordId?: string;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("WorkflowRun")
      .update({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.agentStatuses ? { agentStatuses: JSON.stringify(patch.agentStatuses) } : {}),
        ...(patch.outputData !== undefined ? { outputData: JSON.stringify(patch.outputData) } : {}),
        ...(patch.recordId ? { recordId: patch.recordId } : {}),
        ...(patch.errorMessage ? { errorMessage: patch.errorMessage } : {}),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) console.warn("[workflow-run] 更新に失敗:", error.message);
  } catch (e) {
    console.warn("[workflow-run] 更新に失敗:", e);
  }
}

// 生存確認。実行中に約30秒ごとに呼び、updatedAt を進める
export async function touchWorkflowRun(id: string): Promise<void> {
  try {
    await supabaseAdmin
      .from("WorkflowRun")
      .update({ updatedAt: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "running");
  } catch {
    // 生存確認の失敗は無視
  }
}

export async function getWorkflowRun(id: string): Promise<WorkflowRunRow | null> {
  const { data } = await supabaseAdmin
    .from("WorkflowRun")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as WorkflowRunRow | null) ?? null;
}
