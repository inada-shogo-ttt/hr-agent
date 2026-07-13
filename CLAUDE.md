# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業するときの**運用カンペ**です。網羅的な README ではなく、事故を防ぎ最短距離で正しい手を打つための判断基準に絞っています。作業前に必ず目を通してください。

---

## 1. プロジェクト概要

- **目的**: Indeed / AirWork / JobMedley 向け求人原稿を自動生成・改善する Web アプリ
- **スタック**: Next.js 16 (App Router, Turbopack) / TypeScript strict / Tailwind v4 / shadcn/ui / Anthropic Claude / Google Gemini / Supabase (PostgreSQL)
- **コア機能**: Team A（初稿生成）と Team B（改善）という 2 つのマルチエージェントオーケストレータを SSE で流す

---

## 2. コマンド（最優先のハマりポイント）

```bash
npm run dev     # node ./node_modules/next/dist/bin/next dev
npm run build   # node ./node_modules/next/dist/bin/next build
npm start       # node ./node_modules/next/dist/bin/next start
```

- `package.json` の scripts は `node ./node_modules/next/dist/bin/next` を**直接叩く形に固定**している。Node v24 系で `node_modules/.bin/next` のシムが壊れるため。勝手に `"next dev"` 形式へ書き戻さない。
- **テストフレームワーク未導入**。`npm test` は存在しない。依頼が無い限り vitest / jest 等を導入しない。
- **Lint/Formatter 未設定**。独自に ESLint / Prettier を足さない（ユーザー指示があれば別）。

---

## 3. データベース / ORM ルール

- **Prisma は使っていない**。DB アクセスは全て `@supabase/supabase-js` の直接操作。`prisma.config.ts` / `schema.prisma` / `generated/prisma` を前提にした提案やコードは誤り。
- サーバ側は `lib/supabase/admin.ts` の Service Role クライアント、クライアント側は `lib/supabase/client.ts` の anon クライアントを使う。混同するとセキュリティ事故になる。
- スキーマ変更は `docs/migration-*.sql` として SQL を追記し、Supabase ダッシュボード等で適用する運用。マイグレーションツール（`prisma migrate`, `supabase migrate`）は未導入。

---

## 4. Claude モデル選定ルール（真実源 = `lib/claude.ts`）

| 役割 | 定数 | モデル ID |
|---|---|---|
| 軽量バリデーション・ルーティング（Manager 等） | `LIGHT_MODEL` | `claude-haiku-4-5-20251001` |
| 速度優先（Web Search / テキスト改善 / 予算最適化） | `FAST_MODEL` | `claude-sonnet-4-6` |
| 品質優先（Manuscript Writing など） | `DEFAULT_MODEL` | `claude-opus-4-6` |

- モデル ID を**ハードコードしない**。必ず `lib/claude.ts` の定数を import する。
- 勝手に Claude 4.7 系へ上げない（本プロジェクトは 4.6 系固定）。上げる場合は `lib/claude.ts` 一箇所で変更し、事前にユーザー確認。
- 画像生成は OpenAI `gpt-image-2`（`lib/nanobanana.ts`、`OPENAI_API_KEY` 使用、fetch 直叩きで `openai` パッケージは未導入）。参考画像あり = `images/edits`、なし = `images/generations`。旧 Imagen 4 / Gemini は廃止済み。

---

## 5. エージェント配置・SSE 運用

### Team A（初稿作成） — `lib/agents/*.ts`
```
Manager → Trend Research → Trend Analysis → Reference Selection
       → [Manuscript Writing  +  Thumbnail Generation]  (並列)
       → Fact Check (4媒体並列) → Platform Formatter
```

### Team B（改善） — `lib/agents/team-b/*.ts`
```
Manager → Metrics Analysis (Indeed のみ) → Manuscript Analysis
       → [Text Improvement + Design Improvement + Budget Optimization]  (並列)
```
- 学習メモリ: `lib/agents/team-b/memory.ts`（Supabase `TeamBMemory` テーブル）。前回メトリクスとの CTR 比較で効果スコアをフィードバック。保存は非同期・失敗しても全体を止めない。

### API ルート（SSE オーケストレータ）
- `app/api/team-a/route.ts` / `app/api/team-b/route.ts`
- **崩してはいけない 3 点**:
  1. `export const maxDuration = 300`（5 分）
  2. 15 秒ごとのハートビート送信（Vercel proxy タイムアウト対策）
  3. フロント側は Web Worker 経由で SSE を維持（タブ非アクティブ時の切断防止）

### 新規エージェントを足すとき
- 出力型は `lib/agents/types.ts` または `lib/agents/team-b/types.ts` に追加
- 並列処理は `Promise.all` で明示
- 進捗は SSE の独立イベントとして逐次送る（まとめて最後に送らない）
- モデル指定は `lib/claude.ts` の定数を import

---

## 6. 知識ベース / 参考原稿

| テーブル | 役割 | アクセサ |
|---|---|---|
| `SharedKnowledge` | 全ユーザー共通の成功パターン（職種 × 媒体 × 効果スコア） | `lib/shared-knowledge.ts` |
| `ReferencePosting` | ユーザー登録の成功原稿（業種 × 職種でスマートマッチング） | `app/api/references/*` |
| `TeamBMemory` | Team B の改善パターン学習（媒体 × カテゴリ） | `lib/agents/team-b/memory.ts` |

- 直接 SQL を書き始めない。既存アクセサ（`lib/shared-knowledge.ts`, `lib/knowledge-extractor.ts` など）の再利用を優先。

---

## 7. ディレクトリ配置

```
app/                Next.js App Router (pages, api, providers)
app/components/     ページ専用のフォーム / 出力 / ワークフロー UI
components/ui/      shadcn/ui (style: new-york, baseColor: neutral)
lib/agents/         Team A エージェント本体
lib/agents/team-b/  Team B エージェント本体
lib/supabase/       Supabase クライアント (admin / client / server / middleware)
lib/                横断ユーティリティ (claude, nanobanana, shared-knowledge, ...)
types/              ドメイン型 (job-posting, team-b, platform, reference, ...)
docs/               設計書・マイグレーション SQL
generated/          自動生成物 — 手で触らない
```

- 新規の横断ユーティリティは `lib/` に、UI 部品は shadcn 既製があれば `components/ui/`、プロジェクト固有なら `app/components/` に置く。
- `components.json` を尊重する（shadcn add 時のスタイルが揃う）。

---

## 8. 変更時の定型チェック

- TypeScript は `strict: true`。型エラーを `any` で潰さず、`types/` に型を追加して解決する。
- 大きめの変更後は `npm run build` を通す（HMR だけで OK としない）。
- コミット prefix は直近履歴に合わせ `feat:` / `fix:` / `perf:` / `docs:` / `chore:` + 日本語サマリ。
- 機微情報を含めない: `.env.local`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` / `NANOBANANA_API_KEY`, Supabase Service Role キー。

---

## 9. 作業のお作法（Claude Code 向け）

- 変更前に関連ファイルを読む。エージェント改修は `lib/agents/types.ts` と対応 `route.ts` の SSE イベント仕様を必ず確認してから着手。
- **ユーザー確認必須**: モデル選定の変更 / Supabase スキーマ変更 / 外部 API 追加・差し替え / 依存追加。
- 過剰な抽象化・将来のための拡張・不要なコメントは入れない。3 行の重複はコピペで可、抽象化は 2 回目の重複が出てから。
- 既存の挙動を「ついでに」直さない。依頼された変更のみを行う。
