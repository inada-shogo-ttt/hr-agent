# 求人管理ページ テーブル型リニューアル 実装プラン

設計書: `docs/superpowers/specs/2026-07-22-jobs-list-table-redesign-design.md`

## Step 1: `components/ui/table.tsx` の追加

- shadcn/ui（new-york, Tailwind v4 対応版）の Table コンポーネントを追加する。npm 依存の追加はなし。
- `Table / TableHeader / TableBody / TableRow / TableHead / TableCell` を export。

## Step 2: `app/jobs/page.tsx` の全面改修

1. **型の拡張**
   - `JobEntry` に `updatedAt: string` を追加（API は既に返している）。
   - `OfficeGroup` を `{ officeId, officeName, jobs, jobTypeCounts: {name, count}[], manuscriptCount, platforms: string[], lastUpdatedAt }` に変更。
2. **集計の拡張**（fetch 後のグループ化処理内）
   - `jobTypeCounts`: 職種名ごとの件数、件数降順。
   - `platforms`: `records[0].platform` の distinct。
   - `lastUpdatedAt`: `updatedAt` の最大値。
3. **UI 状態**
   - `search: string` / `sortKey: "name" | "jobCount" | "manuscript" | "updatedAt"` / `sortDir: "asc" | "desc"`（初期: `updatedAt` 降順）/ 新規求人作成ダイアログの open・選択事業所。
4. **描画**
   - コンテナを `max-w-5xl` に拡大。ヘッダー右に「＋ 新規求人作成」ボタン。
   - 検索ボックス（事業所名・職種名の部分一致、クライアント側フィルタ）。
   - テーブル 6 列。ソート可能列（事業所・求人数・原稿・更新日）は見出しクリックでトグル、矢印アイコンで状態表示。原稿ソートは未作成数基準。
   - 原稿バッジ: 全件完了 = green、未作成あり = rose。
   - 媒体バッジ: `PLATFORM_LABELS`（indeed/airwork/jobmedley/hellowork/all→全媒体）で表示、未知値はそのまま。
   - 行クリックで `/jobs/offices/[officeId]` へ。
   - ローディングはテーブル型スケルトン。検索 0 件は colSpan 行で表示。エラー・事業所 0 件は現状踏襲。
5. **新規求人作成ダイアログ**
   - 既存 `Dialog` + `Select` で事業所を選択 → `/jobs/offices/[id]?add=1` へ遷移。

## Step 3: `app/jobs/offices/[officeId]/page.tsx` の追記

- マウント時に `window.location.search` の `add=1` を検出したら `openAddJobType()` を実行し、`history.replaceState` でクエリを除去する（`useSearchParams` は Suspense 境界が必要になるため使わない）。

## Step 4: 検証

- `npm run build` が通ることを確認。
