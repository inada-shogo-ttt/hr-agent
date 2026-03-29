# 求人管理マスタデータ構造変更 設計書

## 概要

求人管理のデータ構造をフラットな文字列（officeName, jobTitle, employmentType）から、マスタデータの階層構造（事業所→職種→勤務形態）に変更する。「事業所×職種×勤務形態」の組み合わせが1つの求人（Job）となる。

### 解決する課題

- 事業所・職種・勤務形態が文字列でバラバラに管理されており、一貫性がない
- 事業所単位で求人を俯瞰できない
- マスタデータの再利用ができない（同じ職種名を毎回手入力）

---

## 1. データモデル

### グローバルマスタ

#### `JobType`（職種マスタ）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| name | text NOT NULL UNIQUE | 「介護職」「看護師」等 |
| createdAt | timestamptz DEFAULT now() | |

#### `EmploymentType`（勤務形態マスタ）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| name | text NOT NULL UNIQUE | 「正社員」「パート」等 |
| createdAt | timestamptz DEFAULT now() | |

### 事業所マスタ

#### `Office`（事業所）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| name | text NOT NULL | 事業所名 |
| createdBy | uuid FK → User(id) | 登録者 |
| createdAt | timestamptz DEFAULT now() | |

### Jobテーブル（再定義）

#### `Job`（事業所×職種×勤務形態の組み合わせ = 求人）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| officeId | uuid NOT NULL FK → Office(id) ON DELETE CASCADE | 事業所 |
| jobTypeId | uuid NOT NULL FK → JobType(id) ON DELETE CASCADE | 職種 |
| employmentTypeId | uuid NOT NULL FK → EmploymentType(id) ON DELETE CASCADE | 勤務形態 |
| status | text NOT NULL DEFAULT 'draft' | draft/in_review/approved/published/rejected |
| createdBy | uuid FK → User(id) | 作成者 |
| assignedReviewer | uuid FK → User(id) | 担当承認者 |
| createdAt | timestamptz DEFAULT now() | |
| updatedAt | timestamptz DEFAULT now() | |
| **UNIQUE(officeId, jobTypeId, employmentTypeId)** | | 同一組み合わせの重複防止 |

### 既存テーブルへの影響

以下のテーブルは `jobId` (FK → Job.id) で紐付いており、**変更不要**：

- `JobRecord` — 実行履歴
- `StatusHistory` — ステータス変更履歴
- `ReviewComment` — レビューコメント
- `PublishMetrics` — 掲載数値
- `Notification` — 通知

### 削除するカラム

`Job` テーブルから以下のカラムを削除：

- `officeName` (text) → `officeId` (FK) に置換
- `jobTitle` (text) → `jobTypeId` (FK) に置換
- `employmentType` (text) → `employmentTypeId` (FK) に置換

### 既存データ

クリーンスタート。既存の Job, JobRecord, StatusHistory, ReviewComment, PublishMetrics データは全て削除する（現在1件のみ）。

---

## 2. 画面構成

### `/settings` の構成

既存の `/settings/users` に加えて、3つのマスタ管理を追加。タブ切替で管理：

| タブ | パス | 内容 |
|---|---|---|
| ユーザー管理 | `/settings/users` | 既存のまま |
| 事業所マスタ | `/settings/offices` | 事業所の追加・編集・削除。追加時にJobType/EmploymentTypeを選んでJob同時作成 |
| 職種マスタ | `/settings/job-types` | 職種名の追加・編集・削除 |
| 勤務形態マスタ | `/settings/employment-types` | 勤務形態名の追加・編集・削除 |

### 事業所登録フロー

1. `/settings/offices` で「事業所を追加」
2. 事業所名を入力
3. 職種マスタから職種を選択（複数可）
4. 選択した各職種に対して、勤務形態マスタから勤務形態を選択（複数可）
5. 保存 → `Office` 1件 + 選択した組み合わせ分の `Job` レコードが一括作成

### `/jobs` ページ（事業所カード一覧）

- 事業所ごとのカード表示（2列グリッド）
- カードに表示する情報：事業所名、職種名一覧、ステータス別カウント、求人数
- ステータスフィルタ（すべて/下書き/レビュー依頼/承認済み/掲載済み/差戻し）
- クリックで `/jobs/offices/[officeId]` に遷移

### `/jobs/offices/[officeId]`（事業所詳細ページ）

- パンくず：求人管理 > 事業所名
- 事業所名・職種数・求人数の表示
- 「職種を追加」ボタン — 既存JobTypeマスタから追加紐付け → Job作成
- 職種ごとのグループ表示：
  - 職種名ヘッダー + 「勤務形態を追加」ボタン
  - 各勤務形態（= Job）をリスト表示
  - ステータスバッジ + 最新実行情報
  - クリックで `/jobs/[jobId]` 求人詳細ページに遷移

### `/jobs/[id]`（求人詳細ページ）

既存のまま。ただしヘッダーの表示を変更：

- 現在：`job.officeName` + `job.employmentType` + `job.jobTitle`
- 変更後：JOIN した `office.name` + `jobType.name` + `employmentType.name`

### `/jobs/new` ページ

**廃止。** 事業所・職種・勤務形態の登録は `/settings` から行うため不要。

---

## 3. API設計

### マスタ管理API（全てadminロール専用）

| メソッド | パス | 説明 |
|---|---|---|
| GET / POST | `/api/settings/job-types` | 職種マスタ一覧・追加 |
| PATCH / DELETE | `/api/settings/job-types/[id]` | 職種の編集・削除 |
| GET / POST | `/api/settings/employment-types` | 勤務形態マスタ一覧・追加 |
| PATCH / DELETE | `/api/settings/employment-types/[id]` | 勤務形態の編集・削除 |
| GET / POST | `/api/settings/offices` | 事業所一覧・追加（Job一括作成含む） |
| PATCH / DELETE | `/api/settings/offices/[id]` | 事業所の編集・削除 |

### 事業所追加時のPOSTリクエスト

```json
{
  "name": "有料老人ホームたいよう本館",
  "assignments": [
    {
      "jobTypeId": "uuid-介護職",
      "employmentTypeIds": ["uuid-正社員", "uuid-パート"]
    },
    {
      "jobTypeId": "uuid-看護師",
      "employmentTypeIds": ["uuid-正社員"]
    }
  ]
}
```

→ `Office` 1件 + `Job` 3件が作成される

### 事業所詳細用API

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/offices/[id]` | 事業所詳細 + 配下のJob一覧（JobType/EmploymentType JOIN済み） |
| POST | `/api/offices/[id]/jobs` | 事業所に職種×勤務形態の組み合わせを追加（Job作成） |

### 既存APIの変更

| パス | 変更内容 |
|---|---|
| `GET /api/jobs` | Office/JobType/EmploymentType を JOIN して返す |
| `GET /api/jobs/[id]` | Office/JobType/EmploymentType の名前を JOIN して返す |
| `POST /api/jobs` | 廃止（事業所登録時またはoffices APIで作成） |
| `POST /api/jobs/[id]/status` | 変更なし |
| `POST /api/team-a` | officeName/jobTitle/employmentType を JOIN で取得するよう変更 |
| `POST /api/team-b` | 同上 |
| 通知メッセージ | `job.officeName` → `office.name + jobType.name` に変更 |

### 削除時のカスケード

- **勤務形態マスタ削除** → 紐づくJob（とその JobRecord 等）も全て CASCADE 削除。確認ダイアログ必須
- **職種マスタ削除** → 同上
- **事業所削除** → 配下のJob全て CASCADE 削除。確認ダイアログ必須
