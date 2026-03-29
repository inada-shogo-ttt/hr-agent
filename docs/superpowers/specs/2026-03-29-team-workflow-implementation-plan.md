# チーム・承認ワークフロー機能 実装計画

## 現状サマリー

- Supabase PostgreSQL に `Job`、`JobRecord` テーブルが存在
- `lib/supabase.ts` はサービスロールキーを使用（認証なし）
- `@supabase/ssr` 未インストール（Next.js App Router 向けcookieベース認証に必要）
- 全APIルートにユーザーコンテキストなし
- Team Bのメトリクスは手動入力

---

## Phase 1: 基盤 — DBスキーマと認証セットアップ

**全フェーズの前提。ここが最優先。**

### Step 1.1: 依存パッケージ追加

`@supabase/ssr` を `package.json` に追加。

### Step 1.2: データベースマイグレーション

Supabase MCPまたはCLIで以下を一括マイグレーション。

**新規テーブル:**

1. **`User`**
   - `id` uuid PK（`auth.users.id` を参照）
   - `email` text NOT NULL
   - `name` text NOT NULL
   - `role` text NOT NULL CHECK ('admin','editor','reviewer','publisher')
   - `created_at` timestamptz DEFAULT now()

2. **`StatusHistory`**
   - `id` uuid PK DEFAULT gen_random_uuid()
   - `job_id` text NOT NULL FK → Job(id) ON DELETE CASCADE
   - `from_status` text
   - `to_status` text NOT NULL
   - `changed_by` uuid NOT NULL FK → User(id)
   - `comment` text（`to_status = 'rejected'` 時はNOT NULL）
   - `created_at` timestamptz DEFAULT now()

3. **`ReviewComment`**
   - `id` uuid PK DEFAULT gen_random_uuid()
   - `job_id` text NOT NULL FK → Job(id) ON DELETE CASCADE
   - `user_id` uuid NOT NULL FK → User(id)
   - `body` text NOT NULL
   - `created_at` timestamptz DEFAULT now()

4. **`PublishMetrics`**
   - `id` uuid PK DEFAULT gen_random_uuid()
   - `job_id` text NOT NULL FK → Job(id) ON DELETE CASCADE
   - `platform` text NOT NULL
   - `published_by` uuid NOT NULL FK → User(id)
   - `start_date` date NOT NULL
   - `end_date` date
   - `impressions` integer
   - `clicks` integer
   - `applications` integer
   - `cost` integer
   - `notes` text
   - `created_at` timestamptz DEFAULT now()
   - `updated_at` timestamptz DEFAULT now()

5. **`Notification`**（アプリ内通知用）
   - `id` uuid PK DEFAULT gen_random_uuid()
   - `user_id` uuid NOT NULL FK → User(id) ON DELETE CASCADE
   - `job_id` text FK → Job(id) ON DELETE CASCADE
   - `type` text NOT NULL（'review_requested', 'approved', 'rejected', 'ready_to_publish', 'metrics_entered'）
   - `title` text NOT NULL
   - `body` text
   - `is_read` boolean DEFAULT false
   - `created_at` timestamptz DEFAULT now()

**既存テーブル変更:**

6. **`Job`** に追加:
   - `status` text NOT NULL DEFAULT 'draft' CHECK ('draft','in_review','approved','published','rejected')
   - `created_by` uuid FK → User(id)
   - `assigned_reviewer` uuid FK → User(id)

**インデックス:**
   - `StatusHistory(job_id, created_at)`
   - `ReviewComment(job_id, created_at)`
   - `PublishMetrics(job_id)`
   - `Notification(user_id, is_read, created_at)`
   - `Job(status)`, `Job(created_by)`

### Step 1.3: Supabase Authクライアント構成

`lib/supabase.ts` を以下に分割:

| ファイル | 用途 |
|---|---|
| `lib/supabase/server.ts` | `createServerClient`（APIルート、Server Components用） |
| `lib/supabase/client.ts` | `createBrowserClient`（Client Components用） |
| `lib/supabase/admin.ts` | 既存のサービスロールクライアント（リネーム） |
| `lib/supabase/middleware.ts` | middleware用ヘルパー |

### Step 1.4: Next.js Middleware

`middleware.ts` を作成:
- 全リクエストでSupabase authセッションをリフレッシュ
- 未認証ユーザーを `/login` にリダイレクト
- `publisher` ロールは `/publish` 系のみアクセス可、他は `/publish` にリダイレクト

### Step 1.5: 型定義

`types/auth.ts` を作成:
```typescript
export type UserRole = 'admin' | 'editor' | 'reviewer' | 'publisher';
export type JobStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'rejected';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
```

---

## Phase 2: ログインとユーザー管理

### Step 2.1: ログインページ — `/app/login/page.tsx`

- メール/パスワードフォーム（shadcn/ui Card, Input, Button）
- `supabase.auth.signInWithPassword()` 呼び出し
- 成功時: ロール別にリダイレクト（publisher→`/publish`、他→`/jobs`）

### Step 2.2: Auth Context/Hook

`lib/hooks/use-user.ts` を作成:
- 現在の `AppUser` を提供するクライアントサイドフック
- `User` テーブルからプロフィール取得
- `signOut()` 関数

### Step 2.3: `app/layout.tsx` 更新

- AuthProviderでラップ

### Step 2.4: ユーザー管理ページ — `/app/settings/users/page.tsx`

- admin専用
- ユーザー一覧（ロール表示）
- 「ユーザー招待」フォーム: email, name, role
  - `supabase.auth.admin.createUser()` で作成（サーバーサイド）
- ロール変更、ユーザー削除

**APIルート:**
- `/api/users/route.ts` — GET（一覧）、POST（招待）
- `/api/users/[id]/route.ts` — PATCH（ロール変更）、DELETE

### Step 2.5: shadcn/ui コンポーネント追加

`dialog`, `avatar`, `popover`, `separator`, `tooltip` をインストール

---

## Phase 3: ヘッダー・ナビゲーション・ロール別レイアウト

### Step 3.1: `AppHeader.tsx` 更新

- ユーザー名・ロールバッジ表示
- 通知ベルアイコン（未読カウント）
- ログアウトボタン
- ロール別ナビゲーションリンク:
  - `publisher`: `/publish` のみ
  - `editor`: `/jobs`, `/references`
  - `reviewer`: `/jobs`（レビュー待ちフィルタ）
  - `admin`: 全リンク + `/settings/users`

### Step 3.2: ダッシュボード（`app/page.tsx`）更新

- ログインユーザーのロール別表示:
  - **editor**: 自分の求人一覧 + ステータスバッジ
  - **reviewer**: レビュー待ちキュー
  - **publisher**: `/publish` にリダイレクト
  - **admin**: 統合ビュー

---

## Phase 4: ステータスワークフロー（コア機能）

### Step 4.1: StatusBadgeコンポーネント

`app/components/StatusBadge.tsx` を作成:
- draft→灰色、in_review→青、approved→緑、published→紫、rejected→赤
- 日本語ラベル: 下書き / レビュー依頼 / 承認済み / 掲載済み / 差戻し

### Step 4.2: 求人一覧（`app/jobs/page.tsx`）更新

- ステータスバッジ追加
- ステータスフィルタ（タブまたはドロップダウン）
- ロール別フィルタリング（editor: 自分の求人、reviewer: 全件）

### Step 4.3: 求人詳細（`app/jobs/[id]/page.tsx`）更新

- ステータス表示 + 遷移ボタン:
  - draft + editor → 「レビュー依頼」（承認者選択ダイアログ付き）
  - in_review + reviewer → 「承認」「差戻し」（差戻しコメント必須）
- レビューコメントセクション
- ステータス履歴タイムライン
- PublishMetrics表示（editor向け、掲載済み時）

### Step 4.4: ステータス遷移API

`/api/jobs/[id]/status/route.ts` を作成:

| 現在 | アクション | 新ステータス | 必要ロール |
|---|---|---|---|
| draft | submit_review | in_review | editor, admin |
| in_review | approve | approved | reviewer, admin |
| in_review | reject | rejected | reviewer, admin |
| rejected | submit_review | in_review | editor, admin |
| approved | mark_published | published | publisher, admin |
| published | start_rewrite | draft | editor, admin |

### Step 4.5: コメントAPI

`/api/jobs/[id]/comments/route.ts` — GET / POST

### Step 4.6: ステータス履歴API

`/api/jobs/[id]/status-history/route.ts` — GET

### Step 4.7: 求人作成API更新

`POST /api/jobs` に `created_by`, `status = 'draft'` を追加

### Step 4.8: Team B実行時のステータスリセット

Team B完了後に `status = 'draft'` に更新 + StatusHistory記録

---

## Phase 5: 掲載担当ダッシュボードと数値入力

### Step 5.1: 掲載ダッシュボード — `/app/publish/page.tsx`

- `approved` / `published` のみ表示
- 「掲載完了を記録」ボタン（approved → published）
- 「数値を入力/更新」リンク

### Step 5.2: 数値入力ページ — `/app/publish/[jobId]/page.tsx`

- 媒体別フォーム:
  - **Indeed/AirWork**: startDate（必須）, endDate, impressions, clicks, applications, cost, notes
  - **JobMedley/HelloWork**: startDate（必須）, applications（必須）, notes のみ
- 既存メトリクスの編集
- 保存時にeditorへ通知作成

### Step 5.3: PublishMetrics API

- `/api/jobs/[id]/metrics/route.ts` — GET / POST
- `/api/jobs/[id]/metrics/[metricsId]/route.ts` — PATCH / DELETE

---

## Phase 6: Team B連携（メトリクス自動ロード）

### Step 6.1: history-context API拡張

`/api/jobs/[id]/history-context/route.ts` に `PublishMetrics` データを追加

### Step 6.2: rewrite-posting ページ更新

- 手動メトリクス入力欄を削除
- 「PublishMetricsの数値を使用します」+ プレビュー表示
- 未入力時は警告: 「掲載数値がまだ入力されていません」

### Step 6.3: Team B API更新

- `PublishMetrics` をサーバーサイドで自動取得
- 既存の `IndeedMetrics`/`AirWorkMetrics` 型にマッピング
- Team Bプロンプトに注入

---

## Phase 7: 通知

### Step 7.1: 通知API

- `/api/notifications/route.ts` — GET（一覧 + 未読カウント）
- `/api/notifications/[id]/route.ts` — PATCH（既読化）
- `/api/notifications/read-all/route.ts` — POST（全既読化）

### Step 7.2: NotificationBellコンポーネント

- ベルアイコン + 未読バッジ
- 30秒ポーリング（将来はSupabase Realtimeに移行可能）
- Popoverで通知リスト表示
- 「すべて既読」ボタン

### Step 7.3: 通知作成ヘルパー

`lib/notifications.ts` を作成:
- `createNotification(userId, jobId, type, title, body)` 関数
- ステータス遷移API・メトリクスAPIから呼び出し

---

## Phase 8: ガードレールと仕上げ

### Step 8.1: API認証ガード

`lib/auth-guard.ts` を作成:
- `requireAuth(request)` — セッションから `AppUser` を取得
- `requireRole(request, allowedRoles)` — ロールチェック
- 401（未認証）/ 403（権限不足）を返す

### Step 8.2: 既存APIルートの改修

全APIルートに認証ガードを適用:
- `/api/jobs/*` — ロール別フィルタリング
- `/api/team-a/*`, `/api/team-b/*` — editor/admin のみ
- `/api/references/*` — editor/admin のみ

### Step 8.3: 初期adminユーザーセットアップ

- Supabase Authで最初のadminユーザーを作成
- `User` テーブルに `role = 'admin'` で挿入
- このユーザーがUIから他のメンバーを招待

---

## 依存関係グラフ

```
Phase 1（基盤）
  │
  ▼
Phase 2（ログイン + ユーザー管理）
  │
  ▼
Phase 3（ヘッダー/ナビ/レイアウト） ──→ Phase 8.1-8.2（認証ガード、並列可）
  │
  ▼
Phase 4（ステータスワークフロー） ──→ Phase 7（通知、4.4以降並列可）
  │
  ▼
Phase 5（掲載担当ダッシュボード）
  │
  ▼
Phase 6（Team B連携）
  │
  ▼
Phase 8.3（初期セットアップ + 最終調整）
```

---

## 作成するファイル一覧

| ファイル | 用途 |
|---|---|
| `middleware.ts` | 認証ルーティング |
| `lib/supabase/server.ts` | サーバーサイド認証クライアント |
| `lib/supabase/client.ts` | ブラウザサイド認証クライアント |
| `lib/supabase/admin.ts` | サービスロールクライアント |
| `lib/supabase/middleware.ts` | Middlewareヘルパー |
| `lib/auth-guard.ts` | API認証ガード |
| `lib/notifications.ts` | 通知作成ヘルパー |
| `lib/hooks/use-user.ts` | ユーザーフック |
| `types/auth.ts` | 認証関連型定義 |
| `app/login/page.tsx` | ログインページ |
| `app/settings/users/page.tsx` | ユーザー管理 |
| `app/publish/page.tsx` | 掲載担当ダッシュボード |
| `app/publish/[jobId]/page.tsx` | 数値入力フォーム |
| `app/components/StatusBadge.tsx` | ステータスバッジ |
| `app/components/NotificationBell.tsx` | 通知ベル |
| `app/components/ReviewComments.tsx` | コメントスレッド |
| `app/components/StatusTimeline.tsx` | ステータス履歴 |
| `app/providers/auth-provider.tsx` | 認証プロバイダー |
| `api/jobs/[id]/status/route.ts` | ステータス遷移 |
| `api/jobs/[id]/comments/route.ts` | コメント |
| `api/jobs/[id]/status-history/route.ts` | ステータス履歴 |
| `api/jobs/[id]/metrics/route.ts` | メトリクスCRUD |
| `api/jobs/[id]/metrics/[metricsId]/route.ts` | メトリクス個別操作 |
| `api/users/route.ts` | ユーザー一覧・招待 |
| `api/users/[id]/route.ts` | ユーザー更新・削除 |
| `api/notifications/route.ts` | 通知一覧 |
| `api/notifications/[id]/route.ts` | 既読化 |
| `api/notifications/read-all/route.ts` | 全既読化 |

## 変更するファイル一覧

| ファイル | 変更内容 |
|---|---|
| `lib/supabase.ts` | `lib/supabase/admin.ts` にリネーム、全インポート更新 |
| `app/layout.tsx` | AuthProviderでラップ |
| `app/page.tsx` | ロール別ダッシュボード |
| `app/components/AppHeader.tsx` | ユーザー表示、通知、ロール別ナビ |
| `app/jobs/page.tsx` | ステータスバッジ、フィルタ |
| `app/jobs/[id]/page.tsx` | ステータス遷移、コメント、メトリクス表示 |
| `app/jobs/[id]/rewrite-posting/page.tsx` | 手動メトリクス廃止→自動ロード |
| `app/api/jobs/route.ts` | 認証ガード、createdBy追加 |
| `app/api/jobs/[id]/route.ts` | 認証ガード、ロール別アクセス |
| `app/api/jobs/[id]/history-context/route.ts` | PublishMetrics追加 |
| `app/api/team-a/route.ts` | 認証ガード |
| `app/api/team-b/route.ts` | メトリクス自動取得、ステータスリセット |
| `package.json` | `@supabase/ssr` 追加 |

---

## リスクと対策

1. **既存 `lib/supabase.ts` のリファクタ** — 全APIルートがインポートしている。`lib/supabase/admin.ts` にリネームしてドロップイン互換を維持し、段階的にセッションベースのクライアントに移行。

2. **既存データの後方互換性** — `Job` テーブルの新カラムは `status = 'draft'`, `created_by = NULL` でデフォルト設定。初期adminユーザー作成後に既存求人を割り当て可能。

3. **媒体別メトリクスフォーム** — プラットフォーム→フィールド可視性/必須ルールの設定オブジェクトを作成し、フォームレンダリングを駆動。
