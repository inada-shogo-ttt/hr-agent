export type KnowledgeType =
  | "structure_pattern"  // 構成パターン（1日の流れ、セクション順序等）
  | "appeal_point"       // 効果的な訴求ポイント
  | "tone"               // 文体・トーン
  | "keyword"            // 効果的なキーワード
  | "section_rule";      // 媒体別セクション固有ルール

export interface SharedKnowledgeEntry {
  id: string;
  category: string;           // 職種カテゴリ
  platform: string;           // 媒体
  knowledgeType: KnowledgeType;
  content: string;            // ルール本文
  example: string | null;     // 成功例
  evidenceCount: number;
  avgImpactScore: number;
  totalImpressions: number;
  totalClicks: number;
  totalApplications: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedKnowledgeSearchParams {
  category?: string;
  platform?: string;
  knowledgeType?: KnowledgeType;
  minEvidenceCount?: number;
  limit?: number;
}
