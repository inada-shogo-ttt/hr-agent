# チーム・承認ワークフロー機能 設計書

## 概要

事業会社の自社採用チーム向けに、求人原稿の「作成→レビュー→承認→掲載→数値入力→改善」の完全なサイクルを実現する。

### 解決する課題

- 原稿の承認やり取りがSlack/メールに散らばっている
- 掲載後の数値結果がTeam B実行時に手動入力で面倒
- 掲載担当が不要な下書きまで見えてしまう

---

## 1. ロールとアクセス権限

| ロール | 説明 | できること |
|---|---|---|
| **admin** | 管理者 | 全機能 + ユーザー管理・ロール割当 |
| **editor** | 作成者 | 求人登録、Team A/B実行、原稿編集、レビュー依頼、掲載担当の数値結果を閲覧 |
| **reviewer** | 承認者 | 全求人の閲覧、コメント、承認/差戻し |
| **publisher** | 掲載担当 | 「承認済み」の求人のみ閲覧可能、掲載実行の記録、掲載後の数値結果を入力 |

- publisherは下書きやレビュー中の求人は一切見えない。承認済み〜掲載済みの求人だけが表示される
- editorはTeam B実行時に、publisherが入力した数値結果を自動で参照できる
- adminはすべてのロールの権限を兼ねる

---

## 2. 求人ステータスフロー

```
下書き → レビュー依頼 → 承認済み → 掲載済み
            ↑                         ↓
          差戻し ←←←←←←←←←←←←←←←←←←←
```

| ステータス | 誰が遷移させるか | 次のアクション |
|---|---|---|
| **draft（下書き）** | editorがTeam A実行・編集完了後 | 「レビュー依頼」ボタンで次へ |
| **in_review（レビュー依頼）** | editorが送信 | reviewerがコメント・承認・差戻し |
| **approved（承認済み）** | reviewerが承認 | publisherの画面に表示される |
| **published（掲載済み）** | publisherが「掲載完了」を記録 | publisherが数値結果を入力可能に |
| **rejected（差戻し）** | reviewerが差戻し | editorに戻り、修正→再レビュー依頼 |

### 補足ルール

- 「掲載済み」の求人に対してeditorがTeam Bを実行すると、ステータスはdraftに戻る（改善版として新しいサイクル開始）
- 差戻し時はreviewerのコメントが必須（理由を明記）
- ステータス変更のたびに履歴を記録（誰が・いつ・何に変えたか）

---

## 3. データモデル（Supabaseテーブル設計）

### 新規テーブル

#### `User`

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid (PK) | Supabase Auth のユーザーID |
| email | text | メールアドレス |
| name | text | 表示名 |
| role | text | `admin` / `editor` / `reviewer` / `publisher` |
| createdAt | timestamp | 登録日時 |

#### `StatusHistory`

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid (PK) | |
| jobId | text (FK → Job) | 対象求人 |
| fromStatus | text | 変更前ステータス |
| toStatus | text | 変更後ステータス |
| changedBy | uuid (FK → User) | 変更者 |
| comment | text (nullable) | コメント（差戻し時は必須） |
| createdAt | timestamp | 変更日時 |

#### `ReviewComment`

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid (PK) | |
| jobId | text (FK → Job) | 対象求人 |
| userId | uuid (FK → User) | コメント者 |
| body | text | コメント本文 |
| createdAt | timestamp | 投稿日時 |

#### `PublishMetrics`

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid (PK) | |
| jobId | text (FK → Job) | 対象求人 |
| platform | text | 媒体名 |
| publishedBy | uuid (FK → User) | 掲載担当者 |
| startDate | date | 掲載開始日 |
| endDate | date (nullable) | 掲載終了日（掲載中はnull） |
| impressions | integer (nullable) | 表示回数 |
| clicks | integer (nullable) | クリック数 |
| applications | integer (nullable) | 応募数 |
| cost | integer (nullable) | 掲載費用（円） |
| notes | text (nullable) | 備考 |
| createdAt | timestamp | レコード作成日時 |
| updatedAt | timestamp | 最終更新日時 |

##### 媒体別の入力項目

| カラム | Indeed | AirWork | JobMedley | HelloWork |
|---|---|---|---|---|
| startDate | 必須 | 必須 | 必須 | 必須 |
| endDate | 任意 | 任意 | - | - |
| impressions | 任意 | 任意 | - | - |
| clicks | 任意 | 任意 | - | - |
| applications | 任意 | 任意 | 必須 | 必須 |
| cost | 任意 | 任意 | - | - |
| notes | 任意 | 任意 | 任意 | 任意 |

- テーブル構造は共通。UIのフォーム側で媒体に応じて表示する入力項目を制御する
- JobMedley/HelloWorkは無料 or 成果報酬型のため、impressions・clicks・costは不要

### 既存テーブルへの変更

#### `Job` に追加

| カラム | 型 | 説明 |
|---|---|---|
| status | text (default: 'draft') | 現在のステータス |
| createdBy | uuid (FK → User) | 作成者 |
| assignedReviewer | uuid (FK → User, nullable) | 担当承認者 |

---

## 4. 認証と画面構成

### 認証

- Supabase Authを使用（メール/パスワード）
- ユーザー登録はadminのみが招待・ロール割当可能（セルフ登録なし）
- セッション管理はSupabase Auth のJWTトークン

### 新規画面

| 画面 | パス | ロール | 説明 |
|---|---|---|---|
| ログイン | `/login` | 全員 | メール/パスワード認証 |
| ユーザー管理 | `/settings/users` | admin | 招待・ロール変更・削除 |
| publisher専用ダッシュボード | `/publish` | publisher | 承認済み求人一覧 + 数値入力 |
| 数値入力フォーム | `/publish/[jobId]` | publisher | 媒体別メトリクス入力画面 |

### 既存画面の変更

| 画面 | 変更内容 |
|---|---|
| `/jobs` 求人一覧 | ステータスバッジ表示、ロールに応じたフィルタリング |
| `/jobs/[id]` 求人詳細 | ステータス遷移ボタン、コメント欄、数値結果の表示（editor向け） |
| `/jobs/[id]/rewrite-posting` | メトリクス手動入力を廃止 → PublishMetricsから自動ロード |
| `/` ダッシュボード | ロール別に表示内容を切替（editor: 自分の求人、reviewer: レビュー待ち、publisher: 掲載待ち） |

### ナビゲーション

- ヘッダーにログインユーザー名・ロール表示
- publisherはサイドバーに`/publish`のみ表示（他の画面へのリンクなし）
- reviewer/editorは既存ナビ + ステータスフィルタ付き

---

## 5. 通知

### ステータス変更時の通知

| イベント | 通知先 | 内容 |
|---|---|---|
| レビュー依頼 | assignedReviewer | 「○○の求人がレビュー待ちです」 |
| 承認 | editor（作成者） | 「○○の求人が承認されました」 |
| 差戻し | editor（作成者） | 「○○の求人が差戻されました：（コメント）」 |
| 承認済み | 全publisher | 「○○の求人が掲載可能になりました」 |
| 数値入力完了 | editor（作成者） | 「○○の掲載数値が入力されました」 |

### 実装方針

- 初期はアプリ内通知（ヘッダーのベルアイコン + 未読バッジ）を実装
- メール通知（Supabase Edge Functions + Resend）は後から追加可能

---

## 6. Team B連携（数値自動ロード）

### 現在の流れ

```
editor が手動でメトリクスを入力 → Team B実行
```

### 変更後の流れ

```
publisher が PublishMetrics に数値入力
  → editor が Team B実行時、API が自動取得
  → Team Bのプロンプトに掲載期間・数値を注入
```

### 実装詳細

- `/api/jobs/[id]/history-context` を拡張し、`PublishMetrics`のデータも返す
- `/jobs/[id]/rewrite-posting` の入力フォームからメトリクス欄を削除し、代わりに「PublishMetricsの数値を使用します」と表示（数値のプレビュー付き）
- publisherが未入力の場合はeditorに「掲載数値がまだ入力されていません」と警告を表示

---

## 技術スタック

| 領域 | 技術 |
|---|---|
| 認証 | Supabase Auth（メール/パスワード） |
| DB | Supabase PostgreSQL（既存） |
| メール通知（将来） | Supabase Edge Functions + Resend |
| フロントエンド | Next.js App Router + shadcn/ui（既存） |
| API | Next.js API Routes（既存） |
