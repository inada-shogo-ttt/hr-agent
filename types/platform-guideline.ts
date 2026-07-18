import { Platform } from "@/types/platform";

// 媒体別の生成ガイドライン(システム設定。最高管理者のみ編集可)
// DB に未保存・空欄の項目は lib/platform-guidelines/defaults.ts の内容で動く
export interface PlatformGuideline {
  platform: Platform;
  // ① 出力フォーマット(テンプレート・記号・セクション構成)
  format: string;
  // ③ 媒体アルゴリズムの前提知識(検索・表示ロジック、CTR/CVR の考え方)
  algorithm: string;
  // ④ 制約条件(文字数上限・禁止事項・法令・表記ルール)
  constraints: string;
}

export type PlatformGuidelineMap = Partial<Record<Platform, PlatformGuideline>>;

// システム参考原稿(全組織共通。最高管理者のみ編集可)
export interface SystemReferencePosting {
  id: string;
  title: string;
  platform: string;
  industry: string;
  jobType: string;
  postingData: string; // JSON 文字列(ReferencePostingData.postingData と同形式)
  performance: string | null;
  createdBy: string | null;
  createdAt: string;
}
