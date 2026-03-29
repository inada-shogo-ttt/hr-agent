# 掲載フロー再設計 設計書

## 概要

現在のレビュー/承認フローを廃止し、editor が「確定→掲載依頼」する流れに変更する。掲載依頼は媒体ごとに管理され、掲載担当者の指定・掲載期間の設定・媒体別のステータス追跡が可能になる。

### 解決する課題

- 掲載状態が Job 単位で1つしかなく、媒体ごとの管理ができない
- 掲載担当者を指定できない
- 掲載期間の設定・追跡ができない
- 掲載中の原稿修正を掲載担当に依頼する仕組みがない
- 再掲載サイクル（Team B → 確定 → 掲載依頼）のループが回せない

---

## 1. ステータスフロー

### Job のライフサイクル（全媒体共通）

```
draft → confirmed → awaiting_republish
          ↑                ↓
          └── confirmed ←──┘（Team B実行→確定で戻る）
```

| ステータス | 意味 | 遷移タイミング |
|---|---|---|
| `draft` | Team A/B 実行中・編集中 | 初期状態、Team B 実行時 |
| `confirmed` | 確定済み・掲載依頼可能 | editor が「確定」を押した時 |
| `awaiting_republish` | 全媒体の掲載終了・再掲載待ち | 全 PublishRequest が expired になった時 |

### PublishRequest のステータス（媒体別）

```
pending → publishing → completed → expired
```

| ステータス | 意味 |
|---|---|
| `pending` | 掲載依頼済み・掲載担当の対応待ち |
| `publishing` | 掲載中 |
| `completed` | 掲載完了・数値入力待ち |
| `expired` | 掲載期間満了・数値入力済み |

### 廃止するステータスと機能

- `in_review`, `approved`, `published`, `rejected` ステータス
- `assignedReviewer` カラム
- レビュー/承認ワークフロー
- ReviewComment テーブル（レビューフロー廃止に伴い不要）

---

## 2. データモデル

### 新規テーブル `PublishRequest`

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK DEFAULT gen_random_uuid() | |
| jobId | text NOT NULL FK → Job(id) ON DELETE CASCADE | 対象求人 |
| platform | text NOT NULL | indeed / airwork / jobmedley / hellowork |
| status | text NOT NULL DEFAULT 'pending' | pending / publishing / completed / expired |
| assignedTo | uuid NOT NULL FK → User(id) | 掲載担当者 |
| requestedBy | uuid NOT NULL FK → User(id) | 依頼者 |
| startDate | date | 掲載開始日（予定） |
| endDate | date | 掲載終了日（予定） |
| actualStartDate | date | 実際の掲載開始日 |
| actualEndDate | date | 実際の掲載終了日 |
| createdAt | timestamptz DEFAULT now() | 依頼日時 |
| updatedAt | timestamptz DEFAULT now() | |

- 掲載サイクルごとに新しいレコードが作られる
- 同じ Job の Indeed に対して過去3回掲載した場合、3つのレコードが存在する

### Job テーブルの変更

| 変更 | 内容 |
|---|---|
| `status` CHECK 制約変更 | `draft` / `confirmed` / `awaiting_republish` の3つに |
| `assignedReviewer` 削除 | レビューフロー廃止 |

### PublishMetrics テーブルの変更

| 変更 | 内容 |
|---|---|
| `publishRequestId` 追加 | uuid FK → PublishRequest(id) — どの掲載依頼に対する数値かを紐付け |

### StatusHistory テーブル

残す。Job と PublishRequest 両方のステータス変更を記録する。

---

## 3. 画面フローとUI変更

### editor 側

#### `/jobs/[id]`（求人詳細ページ）

| Job ステータス | 表示するアクション |
|---|---|
| `draft` | 「確定する」ボタン → `confirmed` に変更 |
| `confirmed` | 「掲載依頼」ボタン + 媒体別 PublishRequest 一覧 |
| `awaiting_republish` | 「Team B で改善する」ボタン + 過去の掲載数値表示 |

#### 掲載依頼ダイアログ

1. デフォルトの掲載担当者を選択（publisher ロールのユーザー一覧）
2. 掲載する媒体をチェックボックスで選択
3. 各媒体の掲載期間（開始日・終了日）を入力
4. 媒体ごとに担当者を上書き可能（オプション）
5. 送信 → 選択媒体分の PublishRequest を一括作成

#### 掲載中の修正

- `confirmed` ステータスで PublishRequest が `publishing` の場合、原稿を編集して保存すると、掲載中の全媒体の担当者に修正通知が自動送信される

#### 後から個別の媒体を追加依頼

- `confirmed` ステータスで、まだ PublishRequest が作られていない媒体に対して追加で掲載依頼を出せる

### publisher 側

#### `/publish`（掲載担当ダッシュボード）

現在の求人単位一覧を**媒体別の依頼一覧**に変更：

- 自分宛ての PublishRequest を一覧表示
- 各行: 事業所名 / 職種 / 媒体名 / 掲載期間 / ステータス
- ステータスフィルタ: 対応待ち / 掲載中 / 完了 / 期間満了

#### `/publish/[requestId]`（依頼詳細ページ）

| PublishRequest ステータス | 表示するアクション |
|---|---|
| `pending` | 原稿・サムネイル確認 + 「掲載開始」ボタン |
| `publishing` | 「掲載完了」ボタン |
| `completed` | 数値入力フォーム → 入力完了で `expired` に |

### 廃止する画面・コンポーネント

- `/publish/[jobId]`（現在のメトリクス入力ページ）→ `/publish/[requestId]` に統合
- レビューコメントセクション（求人詳細ページから削除）
- レビュー依頼・承認・差戻しボタン
- reviewer ロール用のナビゲーション

---

## 4. 通知設計

| イベント | 通知先 | タイトル |
|---|---|---|
| 掲載依頼作成 | 各媒体の assignedTo | 「〇〇の掲載依頼（Indeed）」 |
| 掲載開始 | requestedBy | 「〇〇のIndeed掲載が開始されました」 |
| 掲載完了 | requestedBy | 「〇〇のIndeed掲載が完了しました」 |
| 数値入力完了 | requestedBy | 「〇〇のIndeed掲載数値が入力されました」 |
| 全媒体 expired | requestedBy | 「〇〇の全媒体の掲載が終了しました。再掲載が可能です」 |
| 掲載中に原稿修正 | publishing 中の全 assignedTo | 「〇〇の原稿が修正されました。掲載内容の更新をお願いします」 |

### 掲載期間満了の自動チェック

現時点では手動運用：
- publisher が `completed` にして数値入力 → `expired` に変更
- 全 PublishRequest が `expired` → Job が `awaiting_republish` に自動変更

将来的に cron ジョブで自動満了チェックを追加可能。

---

## 5. API設計

### 新規API

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/jobs/[id]/publish-requests` | 掲載依頼一括作成 |
| GET | `/api/jobs/[id]/publish-requests` | 求人の掲載依頼一覧 |
| GET | `/api/publish-requests` | 自分宛ての掲載依頼一覧（publisher用） |
| GET | `/api/publish-requests/[requestId]` | 掲載依頼詳細（原稿データ含む） |
| PATCH | `/api/publish-requests/[requestId]` | ステータス変更（pending→publishing→completed→expired） |
| POST | `/api/publish-requests/[requestId]/metrics` | 数値入力 |

### 変更するAPI

| パス | 変更内容 |
|---|---|
| `PATCH /api/jobs/[id]/status` | ステータス値を `draft` / `confirmed` / `awaiting_republish` に変更。レビュー関連の遷移を削除 |
| `GET /api/jobs/[id]` | PublishRequest の一覧も返す |
| `POST /api/jobs/[id]/records/[recordId]` | 保存時に publishing 中の PublishRequest があれば修正通知を送信 |

### 廃止するAPI

| パス | 理由 |
|---|---|
| `/api/jobs/[id]/comments` | レビューコメント廃止 |
