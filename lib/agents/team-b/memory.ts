/**
 * Team B クロスジョブ学習メモリ
 *
 * deep-agents-memory の StoreBackend コンセプトを適用:
 * - Supabase (PostgreSQL) を永続ストアとして使用
 * - 全求人の改善パターンを蓄積し、次回の改善に活用
 * - 効果測定スコアでパターンの有用性を追跡
 */

import { supabase } from "@/lib/supabase";
import { Platform } from "@/types/platform";
import { ImprovementDiff, IssueSummary } from "@/types/team-b";

// ========== 型定義 ==========

export interface TeamBMemoryEntry {
  id: string;
  platform: string;
  category: string;
  pattern: string;
  context: string | null;
  example_before: string | null;
  example_after: string | null;
  effectiveness_score: number;
  usage_count: number;
  success_count: number;
  source_job_id: string | null;
  industry: string | null;
  job_type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySearchParams {
  platform: Platform;
  categories?: string[];
  industry?: string;
  limit?: number;
}

export interface MemorySaveParams {
  platform: Platform;
  improvements: ImprovementDiff[];
  issues: IssueSummary[];
  sourceJobId?: string;
  industry?: string;
  jobType?: string;
}

// ========== 検索（読み取り） ==========

/**
 * 関連するメモリパターンを検索
 * プラットフォーム・カテゴリ・業界でフィルタし、effectiveness_score でランク付け
 */
export async function searchMemories(
  params: MemorySearchParams
): Promise<TeamBMemoryEntry[]> {
  const { platform, categories, industry, limit = 10 } = params;

  let query = supabase
    .from("TeamBMemory")
    .select("*")
    .eq("platform", platform)
    .order("effectiveness_score", { ascending: false })
    .order("usage_count", { ascending: false })
    .limit(limit);

  if (categories && categories.length > 0) {
    query = query.in("category", categories);
  }

  if (industry) {
    // 業界一致 or 業界未指定のパターンを返す
    query = query.or(`industry.eq.${industry},industry.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("[team-b-memory] 検索エラー:", error.message);
    return [];
  }

  return (data as TeamBMemoryEntry[]) || [];
}

/**
 * エージェントプロンプト注入用のフォーマット済みメモリテキストを生成
 */
export async function getFormattedMemories(
  params: MemorySearchParams
): Promise<string> {
  const memories = await searchMemories(params);

  if (memories.length === 0) {
    return "なし（学習データ未蓄積）";
  }

  return memories
    .map((m, i) => {
      const score =
        m.effectiveness_score > 0
          ? `効果: +${(m.effectiveness_score * 100).toFixed(0)}%`
          : m.effectiveness_score < 0
            ? `効果: ${(m.effectiveness_score * 100).toFixed(0)}%`
            : "効果: 未測定";
      const successRate =
        m.usage_count > 0
          ? `(${m.success_count}/${m.usage_count}回成功)`
          : "";
      const example =
        m.example_before && m.example_after
          ? `\n    例: "${m.example_before}" → "${m.example_after}"`
          : "";
      return `${i + 1}. [${m.category}] ${m.pattern} — ${score}${successRate}${example}`;
    })
    .join("\n");
}

// ========== 保存（書き込み） ==========

/**
 * Team B の改善結果からメモリパターンを抽出・保存
 * 既存の類似パターンがあれば usage_count をインクリメント
 */
export async function saveMemories(
  params: MemorySaveParams
): Promise<number> {
  const { platform, improvements, issues, sourceJobId, industry, jobType } =
    params;

  let savedCount = 0;

  // 1. 改善パターンを保存
  for (const imp of improvements) {
    const category = imp.fieldLabel || imp.field;
    const pattern = imp.reason;
    const existingBefore = imp.before;
    const existingAfter = imp.after;

    // 類似パターンを検索（同プラットフォーム・同カテゴリ・同パターン）
    const { data: existing } = await supabase
      .from("TeamBMemory")
      .select("id, usage_count")
      .eq("platform", platform)
      .eq("category", category)
      .ilike("pattern", `%${pattern.slice(0, 20)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      // 既存パターン → usage_count を更新
      await supabase
        .from("TeamBMemory")
        .update({
          usage_count: existing[0].usage_count + 1,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
    } else {
      // 新規パターンとして保存
      const { error } = await supabase.from("TeamBMemory").insert({
        platform,
        category,
        pattern,
        context: `${platform}の${category}フィールドの改善`,
        example_before: existingBefore,
        example_after: existingAfter,
        effectiveness_score: 0,
        usage_count: 1,
        success_count: 0,
        source_job_id: sourceJobId || null,
        industry: industry || null,
        job_type: jobType || null,
      });

      if (!error) savedCount++;
    }
  }

  // 2. 検出された課題パターンも保存（高・中 severity のみ）
  for (const issue of issues.filter(
    (i) => i.severity === "high" || i.severity === "medium"
  )) {
    const { data: existing } = await supabase
      .from("TeamBMemory")
      .select("id, usage_count")
      .eq("platform", platform)
      .eq("category", issue.category)
      .ilike("pattern", `%${issue.recommendation.slice(0, 20)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from("TeamBMemory")
        .update({
          usage_count: existing[0].usage_count + 1,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
    } else {
      const { error } = await supabase.from("TeamBMemory").insert({
        platform,
        category: issue.category,
        pattern: issue.recommendation,
        context: `[${issue.severity}] ${issue.description}`,
        effectiveness_score: 0,
        usage_count: 1,
        success_count: 0,
        source_job_id: sourceJobId || null,
        industry: industry || null,
        job_type: jobType || null,
      });

      if (!error) savedCount++;
    }
  }

  console.log(
    `[team-b-memory] ${savedCount}件の新規パターンを保存しました`
  );
  return savedCount;
}

// ========== 効果フィードバック ==========

/**
 * メトリクス改善があった場合にパターンの effectiveness_score を更新
 * 前回と今回のメトリクスを比較して、関連パターンのスコアを調整
 */
export async function updateEffectiveness(
  platform: Platform,
  categories: string[],
  improved: boolean
): Promise<void> {
  const delta = improved ? 0.1 : -0.05;

  const { data: memories } = await supabase
    .from("TeamBMemory")
    .select("id, effectiveness_score, success_count")
    .eq("platform", platform)
    .in("category", categories)
    .order("updatedAt", { ascending: false })
    .limit(20);

  if (!memories || memories.length === 0) return;

  for (const mem of memories) {
    const newScore = Math.max(
      -1,
      Math.min(1, mem.effectiveness_score + delta)
    );
    const newSuccess = improved ? mem.success_count + 1 : mem.success_count;

    await supabase
      .from("TeamBMemory")
      .update({
        effectiveness_score: newScore,
        success_count: newSuccess,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", mem.id);
  }

  console.log(
    `[team-b-memory] ${memories.length}件のパターンの効果スコアを更新（${improved ? "改善" : "未改善"}）`
  );
}
