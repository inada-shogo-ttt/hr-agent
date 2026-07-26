// サムネイル生成の方向性提案（生成前にユーザーが3案から選択する）
// サーバ（提案API・生成パイプライン）とクライアント（提案モーダル）の両方から参照する

export type ThumbnailSlotNumber = 1 | 2 | 3 | 4 | 5;

export interface ThumbnailSlotPlan {
  slot: ThumbnailSlotNumber;
  // このスロットの構図・シーンの説明（提案カードにそのまま表示され、生成プロンプトにも注入される）
  composition: string;
  // 画像内に描画するコピー（15文字程度）。slot1は必須、slot4は推奨、他は任意
  copy?: string;
}

export interface ThumbnailDirection {
  id: "a" | "b" | "c";
  name: string;          // 例: 数字で訴求
  concept: string;       // 訴求コンセプトの説明
  colorTone: string;     // 配色・トーンの説明
  slots: ThumbnailSlotPlan[];  // 5枚分
  recommended?: boolean; // 「お任せで生成」時に採用する案
}
