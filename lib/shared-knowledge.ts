/**
 * SharedKnowledge: 全アカウント共有のナレッジベース
 *
 * PublishMetrics の実績データから成功パターンをルールベースで抽出し、
 * 職種×媒体ごとに蓄積。Team A / Team B 双方で参照される。
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  SharedKnowledgeEntry,
  SharedKnowledgeSearchParams,
  KnowledgeType,
} from "@/types/shared-knowledge";

// ========== 検索 ==========

export async function searchSharedKnowledge(
  params: SharedKnowledgeSearchParams
): Promise<SharedKnowledgeEntry[]> {
  const { category, platform, knowledgeType, minEvidenceCount = 1, limit = 20 } = params;

  let query = supabaseAdmin
    .from("SharedKnowledge")
    .select("*")
    .gte("evidenceCount", minEvidenceCount)
    .order("avgImpactScore", { ascending: false })
    .order("evidenceCount", { ascending: false })
    .limit(limit);

  if (category) {
    // 完全一致 or 汎用（カテゴリ未指定）のナレッジを返す
    query = query.or(`category.eq.${category},category.eq.__all__`);
  }
  if (platform) {
    query = query.eq("platform", platform);
  }
  if (knowledgeType) {
    query = query.eq("knowledgeType", knowledgeType);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[shared-knowledge] 検索エラー:", error.message);
    return [];
  }
  return (data as SharedKnowledgeEntry[]) || [];
}

/**
 * Team A / Team B のプロンプトに注入するフォーマット済みテキストを生成
 */
export async function getFormattedKnowledge(params: {
  category: string;
  platform?: string;
  limit?: number;
}): Promise<string> {
  const entries = await searchSharedKnowledge({
    category: params.category,
    platform: params.platform,
    limit: params.limit || 15,
    minEvidenceCount: 2, // 最低2件のエビデンスがあるもののみ
  });

  if (entries.length === 0) {
    return "";
  }

  const lines = entries.map((e, i) => {
    const scoreLabel =
      e.avgImpactScore > 0
        ? `効果: +${(e.avgImpactScore * 100).toFixed(0)}%`
        : e.avgImpactScore < 0
          ? `効果: ${(e.avgImpactScore * 100).toFixed(0)}%`
          : "効果: 測定中";
    const evidence = `(${e.evidenceCount}件の実績)`;
    const example = e.example ? `\n    例: ${e.example}` : "";
    const typeLabel = knowledgeTypeLabel(e.knowledgeType);
    return `${i + 1}. [${typeLabel}] ${e.content} — ${scoreLabel} ${evidence}${example}`;
  });

  return lines.join("\n");
}

function knowledgeTypeLabel(type: KnowledgeType): string {
  const labels: Record<KnowledgeType, string> = {
    structure_pattern: "構成",
    appeal_point: "訴求",
    tone: "文体",
    keyword: "キーワード",
    section_rule: "セクション",
  };
  return labels[type] || type;
}

// ========== 保存・更新 ==========

/**
 * ナレッジを追加 or 既存を更新（同カテゴリ・同プラットフォーム・同タイプで類似内容がある場合はマージ）
 */
export async function upsertKnowledge(params: {
  category: string;
  platform: string;
  knowledgeType: KnowledgeType;
  content: string;
  example?: string;
  impressions?: number;
  clicks?: number;
  applications?: number;
  impactScore?: number;
}): Promise<void> {
  const {
    category,
    platform,
    knowledgeType,
    content,
    example,
    impressions = 0,
    clicks = 0,
    applications = 0,
    impactScore = 0,
  } = params;

  // 類似ナレッジを検索（同分類・同内容の先頭30文字）
  const { data: existing } = await supabaseAdmin
    .from("SharedKnowledge")
    .select("id, evidenceCount, avgImpactScore, totalImpressions, totalClicks, totalApplications")
    .eq("category", category)
    .eq("platform", platform)
    .eq("knowledgeType", knowledgeType)
    .ilike("content", `%${content.slice(0, 30)}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    const e = existing[0];
    const newCount = e.evidenceCount + 1;
    // 移動平均でスコアを更新
    const newScore =
      (e.avgImpactScore * e.evidenceCount + impactScore) / newCount;

    await supabaseAdmin
      .from("SharedKnowledge")
      .update({
        evidenceCount: newCount,
        avgImpactScore: Math.round(newScore * 1000) / 1000,
        totalImpressions: e.totalImpressions + impressions,
        totalClicks: e.totalClicks + clicks,
        totalApplications: e.totalApplications + applications,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", e.id);
  } else {
    await supabaseAdmin.from("SharedKnowledge").insert({
      category,
      platform,
      knowledgeType,
      content,
      example: example || null,
      evidenceCount: 1,
      avgImpactScore: impactScore,
      totalImpressions: impressions,
      totalClicks: clicks,
      totalApplications: applications,
    });
  }
}
