# 掲載フロー再設計 実装計画

## 現状サマリー

- Job ステータス: draft → in_review → approved → published / rejected
- レビュー/承認ワークフロー、ReviewComment テーブルが存在
- 掲載管理は Job 単位（媒体別の管理なし）
- publisher ダッシュボードは求人単位の一覧表示

---

## Phase 1: データベースマイグレーション

### Step 1.1: PublishRequest テーブル作成

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| jobId | text NOT NULL FK → Job(id) ON DELETE CASCADE | |
| platform | text NOT NULL | indeed/airwork/jobmedley/hellowork |
| status | text NOT NULL DEFAULT 'pending' | pending/publishing/completed/expired |
| assignedTo | uuid NOT NULL FK → User(id) | 掲載担当者 |
| requestedBy | uuid NOT NULL FK → User(id) | 依頼者 |
| startDate | date | 掲載開始日（予定） |
| endDate | date | 掲載終了日（予定） |
| actualStartDate | date | 実際の掲載開始日 |
| actualEndDate | date | 実際の掲載終了日 |
| createdAt | timestamptz DEFAULT now() | |
| updatedAt | timestamptz DEFAULT now() | |

### Step 1.2: Job テーブル変更

- 既存データのステータス移行: in_review/rejected → draft, approved/published → confirmed
- CHECK 制約を `('draft','confirmed','awaiting_republish')` に変更
- `assignedReviewer` カラム削除

### Step 1.3: PublishMetrics テーブル変更

- `publishRequestId` uuid FK → PublishRequest(id) 追加（nullable）

### Step 1.4: StatusHistory テーブル変更

- `publishRequestId` uuid FK → PublishRequest(id) 追加（nullable）

### Step 1.5: ReviewComment テーブル削除

---

## Phase 2: 型定義

### Step 2.1: `/types/auth.ts` 更新

```typescript
export type JobStatus = "draft" | "confirmed" | "awaiting_republish";
```

reviewer ロールは型としては残すが、UI/ワークフローからは除外。

### Step 2.2: `/types/publish-request.ts` 新規作成

```typescript
export type PublishRequestStatus = "pending" | "publishing" | "completed" | "expired";
export type Platform = "indeed" | "airwork" | "jobmedley" | "hellowork";

export interface PublishRequest {
  id: string;
  jobId: string;
  platform: Platform;
  status: PublishRequestStatus;
  assignedTo: string;
  requestedBy: string;
  startDate: string | null;
  endDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser?: { id: string; name: string };
}
```

---

## Phase 3: API変更

### Step 3.1: `/lib/notifications.ts` 更新

新しい通知タイプ:
- `publish_requested` — 掲載依頼作成
- `publish_started` — 掲載開始
- `publish_completed` — 掲載完了
- `all_expired` — 全媒体expired
- `manuscript_modified` — 掲載中の原稿修正

削除: `review_requested`, `approved`, `rejected`, `ready_to_publish`
`notifyAllPublishers` 関数を削除

### Step 3.2: `/api/jobs/[id]/status/route.ts` 書き換え

新しい遷移:
| 現在 | アクション | 新ステータス | ロール |
|---|---|---|---|
| draft | confirm | confirmed | editor, admin |
| awaiting_republish | start_rewrite | draft | editor, admin |

レビュー関連の全ロジックを削除

### Step 3.3: `/api/jobs/[id]/publish-requests/route.ts` 新規

- GET: 求人の掲載依頼一覧（User JOIN済み）
- POST: 掲載依頼一括作成。リクエスト例:
```json
{
  "defaultAssignedTo": "uuid",
  "platforms": [
    { "platform": "indeed", "startDate": "2026-04-01", "endDate": "2026-04-30" },
    { "platform": "airwork", "assignedTo": "uuid-override", "startDate": "2026-04-01", "endDate": "2026-05-31" }
  ]
}
```

### Step 3.4: `/api/publish-requests/route.ts` 新規

- GET: 自分宛ての掲載依頼一覧（publisher ダッシュボード用）
- Job → Office, JobType を JOIN して事業所名・職種名を返す

### Step 3.5: `/api/publish-requests/[requestId]/route.ts` 新規

- GET: 掲載依頼詳細（原稿データ含む）
- PATCH: ステータス遷移
  - pending → publishing: actualStartDate を設定
  - publishing → completed: actualEndDate を設定
  - completed → expired: 全 PublishRequest が expired なら Job を awaiting_republish に自動遷移

### Step 3.6: `/api/publish-requests/[requestId]/metrics/route.ts` 新規

- POST: 数値入力 + publishRequestId 紐付け + 自動 expired 遷移

### Step 3.7: `/api/jobs/[id]/route.ts` 更新

- GET レスポンスに PublishRequest 一覧を追加

### Step 3.8: `/api/jobs/[id]/records/[recordId]/route.ts` 更新

- PATCH 成功時、Job が confirmed で publishing 中の PublishRequest があれば修正通知送信

### Step 3.9: `/api/jobs/[id]/comments/route.ts` 削除

---

## Phase 4: UI変更

### Step 4.1: StatusBadge 更新

| ステータス | ラベル | 色 |
|---|---|---|
| draft | 下書き | gray |
| confirmed | 確定済み | green |
| awaiting_republish | 再掲載待ち | amber |

### Step 4.2: PublishRequestStatusBadge 新規作成

| ステータス | ラベル | 色 |
|---|---|---|
| pending | 対応待ち | blue |
| publishing | 掲載中 | purple |
| completed | 掲載完了 | green |
| expired | 期間満了 | gray |

### Step 4.3: StatusTimeline 更新

STATUS_LABELS を新ステータスに更新

### Step 4.4: `/app/jobs/[id]/page.tsx` 大幅変更

削除:
- レビュー依頼・承認・差戻しボタンとダイアログ
- ReviewComments セクション
- reviewer 関連のステート

追加:
- 「確定する」ボタン（draft 時、editor/admin）
- 「掲載依頼」ボタン + 掲載依頼ダイアログ（confirmed 時）
  - デフォルト掲載担当者選択
  - 媒体チェックボックス
  - 媒体ごとの掲載期間入力
  - 媒体ごとの担当者上書き（オプション）
- PublishRequest 一覧セクション（confirmed 時）
- 「Team B で改善する」ボタン（awaiting_republish 時）
- 過去の掲載数値表示（awaiting_republish 時）

### Step 4.5: `/app/publish/page.tsx` 書き換え

求人単位 → PublishRequest 単位の一覧:
- `/api/publish-requests` からデータ取得
- 各行: 事業所名 / 職種 / 媒体名 / 掲載期間 / ステータス
- ステータスフィルタ

### Step 4.6: `/app/publish/[jobId]/page.tsx` → `/app/publish/[requestId]/page.tsx` 置換

- 旧ファイル削除
- 新ファイル作成: 掲載依頼詳細 + 原稿確認 + ステータス変更 + 数値入力

### Step 4.7: AppHeader 更新

- パンくずの `/publish/[jobId]` → `/publish/[requestId]` 変更
- reviewer ナビゲーション削除（該当ロール時は editor と同じ表示）

### Step 4.8: ReviewComments.tsx 削除

### Step 4.9: `/app/settings/users/page.tsx` 更新

- 新規ユーザー作成時のロール選択から reviewer を削除
- 既存 reviewer ユーザーの表示は維持（再割り当てまで）

---

## Phase 5: クリーンアップ

### Step 5.1: 通知コンポーネント確認

NotificationBell で新しい通知タイプが正しく表示されるか確認

### Step 5.2: 既存メトリクスAPI整理

- GET `/api/jobs/[id]/metrics` は残す（履歴表示用）
- POST は `/api/publish-requests/[requestId]/metrics` に移行

---

## 依存関係グラフ

```
Phase 1（DBマイグレーション）
  │
  ▼
Phase 2（型定義）
  │
  ├──────────────────┐
  ▼                  ▼
Phase 3（API変更）  Phase 4.1-4.3（コンポーネント更新）
  │                  │
  ▼                  ▼
Phase 4.4-4.9（UI変更）
  │
  ▼
Phase 5（クリーンアップ）
```

---

## 作成するファイル一覧

| ファイル | 用途 |
|---|---|
| `types/publish-request.ts` | PublishRequest 型定義 |
| `app/api/jobs/[id]/publish-requests/route.ts` | 掲載依頼 GET/POST |
| `app/api/publish-requests/route.ts` | publisher 用一覧 GET |
| `app/api/publish-requests/[requestId]/route.ts` | 依頼詳細 GET / ステータス変更 PATCH |
| `app/api/publish-requests/[requestId]/metrics/route.ts` | 数値入力 POST |
| `app/components/PublishRequestStatusBadge.tsx` | 掲載依頼ステータスバッジ |
| `app/publish/[requestId]/page.tsx` | 掲載依頼詳細ページ |

## 変更するファイル一覧

| ファイル | 変更内容 |
|---|---|
| `types/auth.ts` | JobStatus を3値に変更 |
| `lib/notifications.ts` | 通知タイプ更新、notifyAllPublishers 削除 |
| `app/api/jobs/[id]/status/route.ts` | 遷移ロジック書き換え |
| `app/api/jobs/[id]/route.ts` | PublishRequest を返すよう更新 |
| `app/api/jobs/[id]/records/[recordId]/route.ts` | 修正通知追加 |
| `app/components/StatusBadge.tsx` | 新ステータス対応 |
| `app/components/StatusTimeline.tsx` | ラベル更新 |
| `app/jobs/[id]/page.tsx` | 確定・掲載依頼UI、レビューUI削除 |
| `app/publish/page.tsx` | PublishRequest 単位の一覧に書き換え |
| `app/components/AppHeader.tsx` | パンくず更新 |
| `app/settings/users/page.tsx` | reviewer 選択肢削除 |

## 削除するファイル一覧

| ファイル | 理由 |
|---|---|
| `app/api/jobs/[id]/comments/route.ts` | レビューコメント廃止 |
| `app/components/ReviewComments.tsx` | レビューコメント廃止 |
| `app/publish/[jobId]/page.tsx` | `/publish/[requestId]` に置換 |
