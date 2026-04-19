/**
 * ナレッジ自動抽出エンジン（ルールベース）
 *
 * PublishMetrics の実績データと JobRecord の原稿データを突合し、
 * 成功パターンを構造的に分析して SharedKnowledge に蓄積する。
 *
 * 分析する構成要素:
 * - 1日の流れ / タイムスケジュールの有無
 * - 箇条書き構成 vs 文章構成
 * - 絵文字使用パターン
 * - 文字数バランス
 * - 訴求ポイントのカテゴリ（給与/環境/成長/安定）
 * - セクション構成の有無（見出し分割）
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { upsertKnowledge } from "@/lib/shared-knowledge";
import { KnowledgeType } from "@/types/shared-knowledge";

// ========== 構成要素の分析関数群 ==========

interface PostingFeatures {
  hasDailySchedule: boolean;
  hasTimeline: boolean;
  hasBulletPoints: boolean;
  hasHeadings: boolean;
  emojiCount: number;
  emojiTypes: string[];
  totalCharCount: number;
  fieldCharCounts: Record<string, number>;
  appealCategories: string[];
  hasTrainingSection: boolean;
  hasBenefitsDetail: boolean;
  hasAccessDetail: boolean;
  hasSelectionProcess: boolean;
}

function analyzePostingFeatures(posting: Record<string, unknown>): PostingFeatures {
  const allText = Object.values(posting)
    .filter((v) => typeof v === "string")
    .join("\n");

  const fieldCharCounts: Record<string, number> = {};
  for (const [key, val] of Object.entries(posting)) {
    if (typeof val === "string") {
      fieldCharCounts[key] = val.length;
    }
  }

  // 1日の流れの検出
  const dailySchedulePatterns = [
    /\d{1,2}[:：]\d{2}/,       // 08:00 形式
    /\d{1,2}時/,                // 8時 形式
    /１日の流れ/,
    /タイムスケジュール/,
    /出勤.*→.*退勤/,
    /午前.*午後/,
  ];
  const hasDailySchedule = dailySchedulePatterns.some((p) => p.test(allText));

  // タイムライン形式（矢印やステップ）
  const hasTimeline = /→|▶|STEP|ステップ|①.*②/.test(allText);

  // 箇条書き
  const bulletPatterns = /[・●◆■▪✅✨⭕️]/g;
  const hasBulletPoints = (allText.match(bulletPatterns)?.length || 0) >= 3;

  // 見出し（■や【】で囲まれたテキスト）
  const headingPatterns = /[■◆▼【].*[】]?|^#{1,3}\s/gm;
  const hasHeadings = (allText.match(headingPatterns)?.length || 0) >= 2;

  // 絵文字
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✨✅⭕️]/gu;
  const emojis = allText.match(emojiRegex) || [];
  const emojiTypes = [...new Set(emojis)];

  // 訴求カテゴリ
  const appealCategories: string[] = [];
  if (/給与|年収|月収|賞与|ボーナス|昇給/.test(allText)) appealCategories.push("給与・待遇");
  if (/人間関係|チーム|雰囲気|アットホーム|風通し/.test(allText)) appealCategories.push("職場環境");
  if (/研修|成長|キャリア|スキルアップ|資格取得/.test(allText)) appealCategories.push("成長・教育");
  if (/安定|正社員|長期|定着率/.test(allText)) appealCategories.push("安定性");
  if (/残業|休日|有給|ワークライフ|プライベート/.test(allText)) appealCategories.push("働き方");
  if (/未経験|ブランク|初めて|サポート/.test(allText)) appealCategories.push("未経験歓迎");

  // 特定セクション
  const hasTrainingSection = /研修|教育体制|OJT|指導/.test(allText);
  const hasBenefitsDetail = /福利厚生|社会保険|交通費|制服|食事/.test(allText);
  const hasAccessDetail = /徒歩|バス|駅|分\s|アクセス/.test(allText);
  const hasSelectionProcess = /選考|面接|書類|応募/.test(allText);

  return {
    hasDailySchedule,
    hasTimeline,
    hasBulletPoints,
    hasHeadings,
    emojiCount: emojis.length,
    emojiTypes,
    totalCharCount: allText.length,
    fieldCharCounts,
    appealCategories,
    hasTrainingSection,
    hasBenefitsDetail,
    hasAccessDetail,
    hasSelectionProcess,
  };
}

// ========== スコア計算 ==========

interface MetricsScore {
  ctr: number;          // クリック率 (clicks / impressions)
  applicationRate: number; // 応募率 (applications / clicks)
  overallScore: number; // 総合スコア (0-1)
  impressions: number;
  clicks: number;
  applications: number;
}

function calculateMetricsScore(metrics: {
  impressions?: number | null;
  clicks?: number | null;
  applications?: number | null;
}): MetricsScore | null {
  const impressions = metrics.impressions || 0;
  const clicks = metrics.clicks || 0;
  const applications = metrics.applications || 0;

  if (impressions < 100) return null; // データ不足

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const applicationRate = clicks > 0 ? applications / clicks : 0;

  // 総合スコア: CTR と応募率の加重平均
  const overallScore = ctr * 0.4 + applicationRate * 0.6;

  return { ctr, applicationRate, overallScore, impressions, clicks, applications };
}

// ========== メイン抽出ロジック ==========

export interface ExtractionResult {
  processedCount: number;
  extractedCount: number;
  skippedCount: number;
  details: string[];
}

/**
 * 全ての未処理 PublishMetrics を分析し、成功パターンを SharedKnowledge に抽出
 */
export async function extractKnowledge(): Promise<ExtractionResult> {
  const result: ExtractionResult = {
    processedCount: 0,
    extractedCount: 0,
    skippedCount: 0,
    details: [],
  };

  // PublishMetrics を取得（impressions > 0 のもの）
  const { data: allMetrics, error } = await supabaseAdmin
    .from("PublishMetrics")
    .select("*")
    .gt("impressions", 0)
    .order("createdAt", { ascending: false });

  if (error || !allMetrics) {
    result.details.push(`メトリクス取得エラー: ${error?.message || "データなし"}`);
    return result;
  }

  // jobId ごとにグループ化して最新メトリクスを使う
  const metricsByJob = new Map<string, typeof allMetrics>();
  for (const m of allMetrics) {
    const key = `${m.jobId}_${m.platform}`;
    if (!metricsByJob.has(key)) {
      metricsByJob.set(key, []);
    }
    metricsByJob.get(key)!.push(m);
  }

  // 媒体別の平均スコアを計算（ベースライン）
  const platformScores = new Map<string, number[]>();
  for (const [key, metrics] of metricsByJob) {
    const platform = key.split("_")[1];
    const latestMetrics = metrics[0]; // 最新
    const score = calculateMetricsScore(latestMetrics);
    if (score) {
      if (!platformScores.has(platform)) platformScores.set(platform, []);
      platformScores.get(platform)!.push(score.overallScore);
    }
  }

  const platformAvg = new Map<string, number>();
  for (const [platform, scores] of platformScores) {
    platformAvg.set(platform, scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // 各求人×媒体の組み合わせを分析
  for (const [key, metrics] of metricsByJob) {
    const [jobId, platform] = key.split("_");
    const latestMetrics = metrics[0];
    result.processedCount++;

    const score = calculateMetricsScore(latestMetrics);
    if (!score) {
      result.skippedCount++;
      continue;
    }

    const avg = platformAvg.get(platform) || 0;
    const isSuccess = score.overallScore > avg * 1.2; // 平均の1.2倍以上を成功とみなす

    // JobRecord から原稿データを取得
    const { data: records } = await supabaseAdmin
      .from("JobRecord")
      .select("outputData, inputData")
      .eq("jobId", jobId)
      .eq("type", "team-a")
      .order("createdAt", { ascending: false })
      .limit(1);

    if (!records || records.length === 0) continue;

    const outputData = records[0].outputData
      ? JSON.parse(records[0].outputData)
      : null;
    const inputData = records[0].inputData
      ? JSON.parse(records[0].inputData)
      : null;

    if (!outputData || !inputData) continue;

    // 職種カテゴリの特定
    const common = inputData.common || {};
    const category = common.jobTitle || common.industry || "__all__";

    // 媒体別の原稿を取得
    const platformPosting = outputData[platform];
    if (!platformPosting || typeof platformPosting !== "object") continue;

    // 構成要素を分析
    const features = analyzePostingFeatures(platformPosting as Record<string, unknown>);

    // スコアの影響度（平均との差分を -1 ~ 1 に正規化）
    const impactScore = avg > 0
      ? Math.min(1, Math.max(-1, (score.overallScore - avg) / avg))
      : 0;

    // パターンを抽出して保存
    const baseParams = {
      category,
      platform,
      impressions: score.impressions,
      clicks: score.clicks,
      applications: score.applications,
      impactScore,
    };

    // 1. 構成パターン
    if (features.hasDailySchedule) {
      await upsertKnowledge({
        ...baseParams,
        knowledgeType: "structure_pattern" as KnowledgeType,
        content: "仕事内容に「1日の流れ」をタイムスケジュール形式で記載する",
        example: extractTimeScheduleExample(platformPosting as Record<string, string>),
      });
      result.extractedCount++;
    }

    if (features.hasTimeline && !features.hasDailySchedule) {
      await upsertKnowledge({
        ...baseParams,
        knowledgeType: "structure_pattern" as KnowledgeType,
        content: "業務フローをステップ形式（→ や ①②③）で視覚的に記載する",
      });
      result.extractedCount++;
    }

    if (features.hasHeadings) {
      await upsertKnowledge({
        ...baseParams,
        knowledgeType: "structure_pattern" as KnowledgeType,
        content: "見出し（■や【】）で情報をセクション分割し、読みやすさを向上させる",
      });
      result.extractedCount++;
    }

    if (features.hasBulletPoints) {
      await upsertKnowledge({
        ...baseParams,
        knowledgeType: "structure_pattern" as KnowledgeType,
        content: "箇条書き（✅✨⭕️）を活用して情報を整理する",
      });
      result.extractedCount++;
    }

    // 2. 訴求ポイント
    for (const appeal of features.appealCategories) {
      if (isSuccess) {
        await upsertKnowledge({
          ...baseParams,
          knowledgeType: "appeal_point" as KnowledgeType,
          content: `「${appeal}」を訴求に含めると効果的`,
        });
        result.extractedCount++;
      }
    }

    // 3. セクション固有ルール
    if (features.hasTrainingSection && isSuccess) {
      await upsertKnowledge({
        ...baseParams,
        knowledgeType: "section_rule" as KnowledgeType,
        content: "研修・教育体制セクションを設けて安心感を訴求する",
      });
      result.extractedCount++;
    }

    if (features.hasAccessDetail && isSuccess) {
      await upsertKnowledge({
        ...baseParams,
        knowledgeType: "section_rule" as KnowledgeType,
        content: "アクセス情報を具体的に記載する（最寄り駅から徒歩○分等）",
      });
      result.extractedCount++;
    }

    // 4. 文字数パターン（成功した求人の文字数をナレッジ化）
    if (isSuccess) {
      const desc = features.fieldCharCounts["jobDescription"] || 0;
      if (desc > 0) {
        const charRange = desc < 300 ? "300字未満" : desc < 500 ? "300-500字" : "500字以上";
        await upsertKnowledge({
          ...baseParams,
          knowledgeType: "section_rule" as KnowledgeType,
          content: `仕事内容は${charRange}（約${desc}字）が効果的`,
        });
        result.extractedCount++;
      }
    }

    result.details.push(
      `${jobId}/${platform}: スコア=${score.overallScore.toFixed(3)} (平均=${avg.toFixed(3)}) ${isSuccess ? "★成功" : ""} → ${features.appealCategories.join(",")} | 1日の流れ=${features.hasDailySchedule}`
    );
  }

  return result;
}

/**
 * 原稿からタイムスケジュール部分を抽出（例として保存用）
 */
function extractTimeScheduleExample(posting: Record<string, string>): string | undefined {
  const jobDesc = posting.jobDescription || "";
  const lines = jobDesc.split("\n");

  const scheduleLines = lines.filter((line) =>
    /\d{1,2}[:：]\d{2}|\d{1,2}時/.test(line)
  );

  if (scheduleLines.length >= 2) {
    return scheduleLines.slice(0, 3).join(" / ");
  }
  return undefined;
}
