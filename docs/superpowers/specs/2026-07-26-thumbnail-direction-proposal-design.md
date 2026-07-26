# サムネイル方向性提案フロー + 全媒体スロット統一 設計書

日付: 2026-07-26

## 背景と目的

サムネイル生成の出力精度を上げるため、次の3点を仕様化する。

1. **参照画像の役割を厳格に分離する**
   - ユーザーがアップロードした画像（事業所写真）: 画像内の**人物と、周りの事業所の部屋などの雰囲気のみ**を参考にする
   - システムに事前登録された画像（参考サムネ）: サムネの**構成・デザイン・色味・テキストのサイズやフォント・画像内コピーの方向性・各素材の配置場所**を決めるためのみに参考にする
2. **画像内のテキスト・コピーは、ユーザーが入力した画像以外のデータから訴求ポイントを分析して決定する**（現状はキャッチコピー先頭15文字の機械的切り出し）
3. **AIが自動で画像を生成する前に、1〜5枚目の生成方向性を3案提示し、ユーザーが選択できる画面を挟む**。選択した案（またはお任せ）を元にサムネイルを生成する

対象範囲は **新規求人掲載・流用掲載（いずれも Team A）・ブラッシュアップ掲載（Team B）** の全フロー。

あわせて生成枚数を **各媒体3枚 → 5枚** に拡張し、Indeed のみだったスロット式生成を **AirWork / JobMedley にも統一**する（方向性3案の「1〜5枚目の構成」が全媒体でそのまま反映されるようにするため）。

## 全体フロー

```
[新規/流用]        JobInputForm「生成開始」
[ブラッシュアップ] rewrite-posting「実行」（サムネイル再生成ONのとき）
        ↓
POST /api/agents/thumbnail-directions（新規・通常API・SSE不要）
  入力データ（画像を除くテキストのみ）から訴求ポイントを分析し3案を返す（目標5〜15秒）
        ↓
提案モーダル: 3案カード ＋「お任せで生成」
        ↓
選択した案を入力に載せて従来どおり POST /api/team-a（または /api/team-b）
  SSE・ハートビート・Web Worker・WorkflowRun の仕組みは一切変更しない
```

- 提案・選択は**生成開始前に完結**させる。SSE 実行中の一時停止や WorkflowRun の2フェーズ化は行わない。
- 提案画面をスキップする条件:
  - サムネイル対象媒体（indeed / airwork / jobmedley）が1つも選択されていない（ハローワークのみ等）
  - Team B でサムネイル再生成がOFF
- 「お任せで生成」= 提案APIが `recommended` を付けた案を自動選択して即進行する。
- **フェイルソフト**: 提案APIの失敗・タイムアウト時はモーダルにエラーを表示し、「このまま生成（方向性なし）」ボタンで従来相当のスロット別プロンプトによる生成を続行できる（キャンセルも可）。サムネイル都合で原稿生成を止めない既存方針を踏襲。

## 提案API

### `POST /api/agents/thumbnail-directions`（新規）

- `requireAuth`（全ロール利用可）。`runtime = "nodejs"`。
- リクエスト:
  - `source: "team-a" | "team-b"`
  - `jobPostingInput`（team-a: 入力フォームの内容）または `existingPosting` + `metrics`（team-b）
  - `platforms: ("indeed" | "airwork" | "jobmedley")[]`
- サーバ側で `thumbnailReference` などの画像データ（data URL）を**除外してから** Claude に渡す。「画像以外のデータから訴求分析する」仕様を構造的に担保する。
- モデルは `lib/claude.ts` の **`FAST_MODEL`**（速度優先の分析タスク。モデルIDはハードコードしない）。
- 分析内容: 職種・業種・給与・休日・福利厚生・アピールポイント・ターゲット・競合優位性などのテキストから訴求ポイントを抽出し、切り口の異なる3案を生成する（例: 数字訴求 / 職場の人・雰囲気訴求 / 安心・教育体制訴求）。
- レスポンス: `{ directions: ThumbnailDirection[3] }`（うち1案に `recommended: true`）。
- JSON抽出は既存の `extractJson` パターンを踏襲し、パース失敗はエラーレスポンス（クライアント側でフェイルソフト）。

### 型定義: `types/thumbnail-direction.ts`（新規）

サーバ・クライアント両方から import するため `types/` 配下に置く。

```ts
export interface ThumbnailSlotPlan {
  slot: 1 | 2 | 3 | 4 | 5;
  composition: string;   // このスロットの構図・シーンの説明（提案カードにそのまま表示）
  copy?: string;         // 画像内に描画するコピー。slot1は必須、slot4は推奨、他は任意
}

export interface ThumbnailDirection {
  id: "a" | "b" | "c";
  name: string;          // 例: 数字で訴求
  concept: string;       // 訴求コンセプトの説明
  colorTone: string;     // 配色・トーンの説明
  slots: ThumbnailSlotPlan[];  // 5枚分
  recommended?: boolean; // お任せ時に採用する案
}
```

- `JobPostingInput`（types/job-posting.ts）と `TeamBInput`（types/team-b.ts）に `thumbnailDirection?: ThumbnailDirection` を追加。
- コピーは選択案の `copy` を**そのまま描画**する。`shortenCatchCopy` による切り出しは、方向性なしで生成するフォールバック時のみ使用。

## 生成パイプライン（5枚 × 全媒体スロット統一）

### スロット定義（1〜5・全媒体共通）

`lib/thumbnail-prompts.ts` の `INDEED_THUMBNAIL_SLOTS` を `THUMBNAIL_SLOTS`（1〜5）へ拡張・改名する。

| スロット | 目的 | 画像内コピー |
|---|---|---|
| 1 | メイン（人物1名バストアップ+コピー。クリック率重視） | 必須 |
| 2 | 職場の雰囲気（スタッフ2〜3名の自然なシーン） | なし |
| 3 | 事業所の様子（空間が伝わる引きカット） | なし |
| 4 | 待遇・数字訴求（給与・休日等の具体数値を前面に） | 推奨 |
| 5 | 働く人・仕事シーン（業務の1コマ・1日の流れ的な別カット） | 任意 |

- 方向性が選択されている場合、`slots[].composition` / `copy` / `colorTone` / `concept` を各スロットのプロンプトに注入する（スロットの目的定義はガードレールとして残す）。
- 方向性なし（お任せAPI失敗時等）の場合は、上記スロット定義に基づく従来型のプロンプト（Claude 生成 + フォールバック文字列）で生成する。

### nanobanana.ts の変更

- `generateIndeedSlotThumbnails` を `generateSlotThumbnails(request, platform)` に一般化し、**indeed / airwork / jobmedley すべて**この経路で生成する。
- 以下の旧経路は**削除**する:
  - corporate / warm / dynamic の3バリエーション生成（`generateImagePromptsWithClaude` / `buildFallbackPrompt`）
  - 参考画像マスター方式（`generateReferenceThumbnails` / `buildReferenceEditPrompt`。3:2マスター→クロップ配布）
- `PlatformThumbnails` は各媒体5枚になる（ハローワークは従来どおり空配列）。
- 参照画像の組み合わせロジック（構図+写真 / 構図のみ / 写真のみ / テキスト生成）は現行の4分岐を維持し、スロット4・5にも適用する。

### レート制限・実行制御

- input-images 消費が増える（最大 5スロット × 2枚 × 3媒体）ため、**媒体内のスロット生成は 3+2 の2バッチ逐次、媒体間は並列**を初期値とする。
- 429 リトライ（`parseRetryAfterSeconds` + 1回リトライ）は既存機構を踏襲。失敗スロットはスロット位置を保ったままリトライし、最終的に失敗した分は欠番で返す（現行踏襲）。

## 参照画像の役割厳格化（プロンプト文言変更）

`lib/thumbnail-prompts.ts` の役割文言を以下に統一する。

- **アップ画像（事業所写真）= 素材参考**:
  「人物（服装・制服の色・年齢層）と、事業所の部屋・内装・全体の雰囲気**のみ**を参考にする。構図・レイアウト・文字・文言は参考にしない」
  - 現行で写真の**構図まで忠実に維持**しているスロット3の `buildIndeedSlotReferencePrompt` / AirWork・JobMedley の faithful バリアントのズレを解消する。
- **登録画像（参考サムネ）= 構図・デザイン参考**:
  「サムネの構成・デザイン・**色味**・テキストのサイズ・フォント・**画像内コピーの方向性**・各素材の配置場所のみを参考にする。写っている人物・場所・文言はそのままコピーしない」
  （下線部を現行の `COMPOSITION_ROLE` に追記）

## DBスキーマ変更（要ダッシュボード適用）

- `docs/migration-reference-thumbnail-slots.sql`（新規）: `ReferenceThumbnail.slot` の CHECK 制約を `1〜3` → `1〜5` に変更。
- `lib/reference-thumbnails.ts` の `slot: 1 | 2 | 3` を `1〜5` に拡張し、`selectCompositionRefsForJob` は5スロット分を選定する。
- 設定画面 `/settings/reference-thumbnails` にスロット4・5の登録枠を追加。
- スロット4・5に参考サムネが未登録の間は、該当スロットは構図参考なしで生成する（生成は止めない）。

## UI

### 提案モーダル（新規: `app/components/thumbnails/DirectionProposalDialog.tsx`）

- 新規/流用: `JobInputForm` の「生成開始」クリック → モーダル表示。ブラッシュアップ: `rewrite-posting` の実行ボタン → サムネ再生成ONのときのみ表示。
- ローディング中: 「訴求ポイントを分析中…」の表示（スケルトン）。
- 3案カード: 案名 / コンセプト / 配色トーン / 1〜5枚目の構成リスト / コピー案（コピーは目立つ表示）。各カードに「この案で生成」。
- 「お任せで生成」ボタン: `recommended` の案で即進行。ローディング中に押された場合は、提案完了を待って自動進行する。
- 提案API失敗時: モーダル内にエラーを表示し、「このまま生成（方向性なし）」ボタンで続行できる。
- モーダルを閉じた（キャンセル）場合は生成自体を開始しない。

### 表示への影響

- 求人詳細・出力画面のサムネイル表示は配列ベースのため5枚でもそのまま並ぶ想定。実装時にレイアウト崩れがないか確認する。

## 変更ファイル一覧（概略）

**新規**
- `app/api/agents/thumbnail-directions/route.ts`
- `types/thumbnail-direction.ts`
- `app/components/thumbnails/DirectionProposalDialog.tsx`
- `docs/migration-reference-thumbnail-slots.sql`

**変更**
- `lib/thumbnail-prompts.ts`（5スロット化・方向性注入・参照役割文言の厳格化）
- `lib/nanobanana.ts`（スロット式へ全媒体統一・5枚化・旧経路削除・バッチ制御）
- `lib/agents/thumbnail-generation.ts` / `lib/agents/team-b/design-improvement.ts`（direction の受け渡し）
- `types/job-posting.ts` / `types/team-b.ts`（`thumbnailDirection` 追加）
- `lib/reference-thumbnails.ts` / `app/settings/reference-thumbnails/page.tsx`（スロット4・5対応）
- `app/components/forms/JobInputForm.tsx` / `app/rewrite-posting/page.tsx`（提案モーダルの組み込み）
- `app/api/team-a/route.ts` / `app/api/team-b/route.ts`（入力の受け渡しのみ。SSEイベント仕様は不変）

## コスト・時間への影響

- 画像生成: 9枚 → 15枚/回（約1.7倍）。Team B は 3枚 → 5枚。
- 生成時間: バッチ逐次化により従来比 +1〜2分程度を見込む。
- 提案API: `FAST_MODEL` 1回/生成 + ユーザーの選択時間。
- モデルは既存定数（`FAST_MODEL` / `LIGHT_MODEL`）のみ使用。新規外部API・新規依存なし。課金ロジック（UsageLog）への変更なし。

## スコープ外

- `/dev/thumbnail-lab` への方向性入力の追加（方向性なし生成として動作継続。必要になれば追加）
- 提案の再生成（「別の3案を出す」）ボタン
- 提案内容の手動編集（コピー文言の書き換え等）
- ReferenceThumbnail 以外の新規テーブル追加（方向性の保存・再利用はしない。JobRecord の inputData に選択案が残るのみ）
