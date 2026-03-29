# 求人管理マスタデータ構造変更 実装計画

## 現状サマリー

- `Job` テーブルに `officeName`, `jobTitle`, `employmentType` が文字列で格納
- 10以上のAPIルートとUIページがこれらの文字列を直接参照
- 既存データは1件のみ → クリーンスタートが可能

---

## Phase 1: データベースマイグレーション

### Step 1.1: マスタテーブル作成 + Jobテーブル再構築

単一のSupabaseマイグレーションで実行:

1. `JobType` テーブル作成 (`id uuid PK`, `name text UNIQUE`, `createdAt`)
2. `EmploymentType` テーブル作成（同構造）
3. `Office` テーブル作成 (`id uuid PK`, `name text`, `createdBy uuid FK→User`, `createdAt`)
4. 既存データ全削除（FK順: PublishMetrics → ReviewComment → StatusHistory → Notification → JobRecord → Job）
5. `Job` から `officeName`, `jobTitle`, `employmentType` カラム削除
6. `Job` に `officeId`, `jobTypeId`, `employmentTypeId` FK カラム追加
7. UNIQUE制約 `(officeId, jobTypeId, employmentTypeId)` 追加
8. RLS有効化 + ポリシー設定
9. インデックス: `Job(officeId)`, `Job(jobTypeId)`, `Job(employmentTypeId)`

---

## Phase 2: 型定義

### Step 2.1: `/types/master-data.ts` 作成

```typescript
export interface JobType {
  id: string;
  name: string;
  createdAt: string;
}

export interface EmploymentType {
  id: string;
  name: string;
  createdAt: string;
}

export interface Office {
  id: string;
  name: string;
  createdBy: string | null;
  createdAt: string;
}

export interface JobWithMasters {
  id: string;
  officeId: string;
  jobTypeId: string;
  employmentTypeId: string;
  status: JobStatus;
  createdBy: string | null;
  assignedReviewer: string | null;
  createdAt: string;
  updatedAt: string;
  officeName: string;
  jobTypeName: string;
  employmentTypeName: string;
}
```

---

## Phase 3: マスタ管理API

### Step 3.1: `/api/settings/job-types/route.ts` (GET + POST)

- GET: 全職種一覧を返す
- POST: 職種名で新規追加。admin専用。UNIQUE違反は409

### Step 3.2: `/api/settings/job-types/[id]/route.ts` (PATCH + DELETE)

- PATCH: 名前変更
- DELETE: CASCADE削除（紐づくJob+子レコード全て）。admin専用

### Step 3.3: `/api/settings/employment-types/route.ts` (GET + POST)

- 職種と同パターン

### Step 3.4: `/api/settings/employment-types/[id]/route.ts` (PATCH + DELETE)

- 職種と同パターン

### Step 3.5: `/api/settings/offices/route.ts` (GET + POST)

- GET: 全事業所一覧（求人数・ステータス別カウント付き）
- POST: 事業所 + 紐付けJobを一括作成

```json
{
  "name": "有料老人ホームたいよう本館",
  "assignments": [
    { "jobTypeId": "uuid", "employmentTypeIds": ["uuid1", "uuid2"] }
  ]
}
```

### Step 3.6: `/api/settings/offices/[id]/route.ts` (PATCH + DELETE)

- PATCH: 事業所名変更
- DELETE: CASCADE削除。admin専用

---

## Phase 4: 事業所詳細API

### Step 4.1: `/api/offices/[id]/route.ts` (GET)

- 事業所詳細 + 配下のJob一覧を JobType/EmploymentType JOIN して返す

### Step 4.2: `/api/offices/[id]/jobs/route.ts` (POST)

- 事業所に職種×勤務形態の組み合わせを追加（Job作成）
- `{ jobTypeId, employmentTypeIds: string[] }`

---

## Phase 5: 既存API更新

### Step 5.1: `GET /api/jobs/route.ts`

- JOINクエリに変更: `select("*, Office(name), JobType(name), EmploymentType(name)")`
- POSTハンドラを削除

### Step 5.2: `GET /api/jobs/[id]/route.ts`

- 同様のJOINクエリに変更

### Step 5.3: `PATCH /api/jobs/[id]/status/route.ts`

- Jobクエリに Office/JobType JOIN 追加
- 通知メッセージ: `job.officeName` → `job.Office.name + job.JobType.name`

### Step 5.4: `/api/jobs/[id]/metrics/route.ts`

- 通知メッセージ用のJob取得にJOIN追加

### Step 5.5: `/api/team-a/route.ts`, `/api/team-b/route.ts`

- API自体は変更不要（クライアントからの入力データを受け取るため）
- Team A入力フォームでマスタデータから自動入力するのはUI側の変更

### Step 5.6: `/api/jobs/[id]/history-context/route.ts`

- Job参照がある場合はJOIN追加

---

## Phase 6: 設定UI

### Step 6.1: `/app/settings/layout.tsx` — タブナビゲーション

設定ページ共通レイアウト。タブ切替:
- ユーザー管理 → `/settings/users`
- 事業所マスタ → `/settings/offices`
- 職種マスタ → `/settings/job-types`
- 勤務形態マスタ → `/settings/employment-types`

admin ロールチェック付き

### Step 6.2: `/app/settings/job-types/page.tsx`

- 一覧表示 + 追加ダイアログ + インライン編集 + 削除確認

### Step 6.3: `/app/settings/employment-types/page.tsx`

- 職種と同パターン

### Step 6.4: `/app/settings/offices/page.tsx`

- 一覧表示 + 追加ダイアログ（マルチステップ: 名前→職種選択→各職種に勤務形態選択）
- 削除確認（CASCADE警告付き）

---

## Phase 7: 求人UIリストラクチャ

### Step 7.1: `/app/jobs/page.tsx` — 事業所カードグリッド

完全書き換え:
- `/api/jobs` からデータ取得 → `officeId` でグループ化
- 2列カードグリッド表示
- 各カード: 事業所名、職種名一覧、ステータス別カウント、求人数
- ステータスフィルタ（フィルタに合致するJobを含む事業所のみ表示）
- クリック → `/jobs/offices/[officeId]`

### Step 7.2: `/app/jobs/offices/[officeId]/page.tsx` — 新規ページ

- パンくず: 求人管理 > 事業所名
- 「職種を追加」ボタン → ダイアログ
- 職種グループごとに勤務形態（=Job）をリスト表示
- 各Jobに StatusBadge + 最新実行情報
- 「勤務形態を追加」ボタン → ダイアログ
- クリック → `/jobs/[jobId]`

### Step 7.3: `/app/jobs/[id]/page.tsx` — ヘッダー更新

- `JobDetail` インターフェースを更新
- `officeName` → JOIN結果の `office.name`
- `jobTitle` → `jobType.name`
- `employmentType` → `employmentType.name`

### Step 7.4: `/app/jobs/new/page.tsx` — 削除

### Step 7.5: `/app/publish/page.tsx` — フィールド参照更新

### Step 7.6: `/app/publish/[jobId]/page.tsx` — フィールド参照更新

### Step 7.7: `AppHeader.tsx` — パンくず更新

- `/jobs/offices/[officeId]` ルート追加
- `/jobs/new` パンくず削除
- 設定メニュー項目を「設定」に汎用化

### Step 7.8: Team A入力フォーム自動入力

- `/jobs/[id]/new-posting` でJobのマスタデータを取得し `common.jobTitle`/`common.employmentType` を自動入力

---

## Phase 8: コンポーネント更新

### Step 8.1: 出力コンポーネント確認

- `IndeedOutput.tsx`, `AirWorkOutput.tsx` 等は `JobPostingInput` のフォームデータを表示（DB Jobフィールドではない） → 変更不要の見込み
- 確認して必要なら更新

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
Phase 3（マスタAPI） Phase 5（既存API更新）
  │                  │
  ▼                  ▼
Phase 4（事業所API） Phase 7（求人UI）
  │                  │
  ▼                  ▼
Phase 6（設定UI）   Phase 8（コンポーネント）
```

Phase 3-4 と Phase 5 は並列実行可能。Phase 6 と Phase 7 も部分的に並列可能。

---

## 作成するファイル一覧

| ファイル | 用途 |
|---|---|
| `types/master-data.ts` | マスタデータ型定義 |
| `app/api/settings/job-types/route.ts` | 職種マスタ GET/POST |
| `app/api/settings/job-types/[id]/route.ts` | 職種マスタ PATCH/DELETE |
| `app/api/settings/employment-types/route.ts` | 勤務形態マスタ GET/POST |
| `app/api/settings/employment-types/[id]/route.ts` | 勤務形態マスタ PATCH/DELETE |
| `app/api/settings/offices/route.ts` | 事業所マスタ GET/POST |
| `app/api/settings/offices/[id]/route.ts` | 事業所マスタ PATCH/DELETE |
| `app/api/offices/[id]/route.ts` | 事業所詳細 GET |
| `app/api/offices/[id]/jobs/route.ts` | 事業所にJob追加 POST |
| `app/settings/layout.tsx` | 設定タブナビゲーション |
| `app/settings/job-types/page.tsx` | 職種管理UI |
| `app/settings/employment-types/page.tsx` | 勤務形態管理UI |
| `app/settings/offices/page.tsx` | 事業所管理UI |
| `app/jobs/offices/[officeId]/page.tsx` | 事業所詳細ページ |

## 変更するファイル一覧

| ファイル | 変更内容 |
|---|---|
| `app/api/jobs/route.ts` | JOIN追加、POST削除 |
| `app/api/jobs/[id]/route.ts` | JOIN追加 |
| `app/api/jobs/[id]/status/route.ts` | JOIN追加、通知メッセージ更新 |
| `app/api/jobs/[id]/metrics/route.ts` | JOIN追加、通知メッセージ更新 |
| `app/api/jobs/[id]/history-context/route.ts` | JOIN追加 |
| `app/jobs/page.tsx` | 事業所カードグリッドに書き換え |
| `app/jobs/[id]/page.tsx` | ヘッダーのフィールド参照更新 |
| `app/publish/page.tsx` | フィールド参照更新 |
| `app/publish/[jobId]/page.tsx` | フィールド参照更新 |
| `app/components/AppHeader.tsx` | パンくず更新 |

## 削除するファイル

| ファイル | 理由 |
|---|---|
| `app/jobs/new/page.tsx` | 事業所登録フローに統合 |
