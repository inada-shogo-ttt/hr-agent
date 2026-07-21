# マスターデータAPI リファレンス

外部連携（Replit Agent 等）向けに、SummarizeAI の **SharedData（account scope のマスタデータ）** を `X-API-Key` のみで参照・更新していただくための REST API です。プラグインの内部構造（plugin_id / action / dataset_id 等）は公開しておらず、業務上安定した `dataset_key` を用いてアクセスいただけます。

---

## クイックスタート

> まずはこちらをご覧ください。詳細は下記の目次以降のリファレンスをご参照ください。
> 
1. **API キーを Secrets に登録してください**（例: `SUMMARIZE_API_KEY`）。コードやプロンプトへ直接記述しないようお願いいたします。
2. ベース URL を設定してください（別途ご共有する `{BASE_URL}` をご利用ください）。
3. まずは疎通をご確認ください:
    
    ```bash
    curl -H "X-API-Key: $SUMMARIZE_API_KEY" \
      "$BASE_URL/api/v1/external/shared-data/facilities/records?limit=1"
    ```
    
    `success: true` が返れば成功です。`401` が返る場合は API キーをご確認ください。
    
4. マスタを取得します（関連データも同時に取得いただけます）:
    
    ```bash
    curl -H "X-API-Key: $SUMMARIZE_API_KEY" \
      "$BASE_URL/api/v1/external/shared-data/staff/records?include=facility,department"
    ```
    
5. レコードの作成・更新・削除は、それぞれ POST / PUT / DELETE をご利用ください（5.3 / 5.6 / 5.7）。

### ご注意いただきたい点

- `Authorization: Bearer` は付与しないでください（API キーと混在すると 401 となります）。
- `include` は **1 つの** `include` **に comma 区切り**でご指定ください（`?include=a,b`）。
- PUT は **全置換**です。更新時は全 field を含めてお送りください。
- レスポンスの実データは常に `data` の中にございます。エラー時は `error.message` をご確認ください。

---

## 目次

1. クイックスタート（Replit Agent 向け） ← まずはこちら
2. 前提・用語
3. 認証
4. ベース URL と共通仕様
5. エンドポイント一覧
6. エンドポイント詳細（例つき）
    - 5.1 一覧取得（GET）
    - 5.2 include（関連マスタ同梱）
    - 5.3 レコード作成（POST）
    - 5.4 レコード検索（POST search）
    - 5.5 単一レコード取得（GET）
    - 5.6 レコード更新（PUT）
    - 5.7 レコード削除（DELETE）
7. relation（include）の設定方法
8. エラー仕様
9. データ型・バリデーション
10. 制約・非対応

---

## 1. 前提・用語

| 用語 | 説明 |
| --- | --- |
| **dataset** | レコードの集合（テーブル相当）です。スキーマ（field 定義）と relation を持ちます。 |
| **dataset_key** | dataset を指す業務上安定したキーです。UUID ではなく `facilities` / `staff` / `residents` / `departments` のような文字列です。**URL で使用するのはこのキー**です。 |
| **record** | dataset 内の 1 レコードです。`{ id, data, created_at, updated_at }` の形で返却されます。 |
| **data** | レコードの実データ（任意の JSON オブジェクト）です。dataset のスキーマで型・必須が検証されます。 |
| **relation** | dataset 間の関連です。`include` で関連先マスタを同梱して取得いただけます。 |
| **account scope** | API キーに紐づく account 内のデータのみアクセス可能です（テナント分離）。 |

本ドキュメントの例では、介護施設向けの 4 つの dataset を題材としております。

| dataset_key | 用途 | 主な field |
| --- | --- | --- |
| `facilities` | 施設マスタ | `name`, `address`, `phone` |
| `departments` | 部署マスタ | `name` |
| `staff` | 職員マスタ | `name`(必須), `facility_id`, `department_id`, `role` |
| `residents` | 利用者マスタ | `name` 他 |

`staff` は `facility`（→`facilities`）と `department`（→`departments`）の 2 つの relation を持ちます。

---

## 2. 認証

すべてのリクエストに `X-API-Key` **ヘッダが必須**となります。

```
X-API-Key: samurai_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### ルール

- `X-API-Key` **のみ受け付けております。** JWT（`Authorization: Bearer ...`）や cookie はご利用いただけません。API キーと JWT/cookie を**混在させた場合は 401** となります（テナント context の取り違え防止のためです）。
- **API キーは account / organization に紐づいております。** そのため URL に account_id / organization_id を含める必要はございません。API キーから自動的にアクセス範囲（account scope）が決定されます。
- **API キーに紐づく account 以外のデータにはアクセスできません。**
- **API キーは秘匿情報です。** Replit では **Secrets** に保存いただき、フロントエンド（ブラウザ）へは決して出力しないようお願いいたします。リポジトリへのコミットもお控えください。

### 認証の挙動（実測）

| 状況 | HTTP | `error.code` / `error.message` |
| --- | --- | --- |
| `X-API-Key` 欠落 | **401** | `AuthenticationRequired` / `Authentication required.` |
| `X-API-Key` 不正 | **401** | `HTTPException` / `無効なAPIキー` |
| JWT/cookie 混在 | **401** | `HTTPException` / `external API は X-API-Key のみ受け付けます` |
| 正常 | **200** | — |

---

## 3. ベース URL と共通仕様

### ベース URL

```
{BASE_URL}/api/v1/external/shared-data
```

`{BASE_URL}` は接続先環境のホストです（**実際の値は別途ご共有いたします**）。例:

```
<https://api.example.com/api/v1/external/shared-data>
```

以降の例では、シェル変数を使用します:

```bash
export BASE_URL="<https://api.example.com>"
export SUMMARIZE_API_KEY="samurai_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export EP="$BASE_URL/api/v1/external/shared-data"
```

### 共通レスポンス形

**成功時**は必ず `success: true` のエンベロープで返却されます。

```json
{
  "success": true,
  "data": { /* エンドポイントごとのデータ */ },
  "message": "作成しました"
}
```

- `message` は作成・更新・削除など一部の操作にのみ付与されます（取得・検索では省略される場合がございます）。
- 実データは常に `data` の中にございます。

**エラー時**は `success: false` のエンベロープで返却されます。

```json
{
  "success": false,
  "error": {
    "code": "HTTPException",
    "message": "dataset_key が見つかりません: foo",
    "details": {}
  },
  "timestamp": "2026-06-09T16:12:55.674330+09:00",
  "path": "/api/v1/external/shared-data/foo/records"
}
```

### ステータスコード

| コード | 意味 |
| --- | --- |
| 200 | 成功（作成・更新・削除も 200 を返却します） |
| 401 | 認証エラー（API キー欠落・不正・JWT 混在） |
| 404 | dataset_key 不明 / record 不明 |
| 409 | レコード `id` の重複（作成・インポートで明示指定した id が既存と衝突） |
| 422 | バリデーションエラー / include 指定不正 |

---

## 4. エンドポイント一覧

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/{dataset_key}/records?page&limit&include` | レコード一覧（ページング・include 対応） |
| POST | `/{dataset_key}/records` | レコード作成 |
| POST | `/{dataset_key}/records/search?include` | テキスト検索（query / limit / include 対応） |
| GET | `/{dataset_key}/records/{record_id}?include` | 単一レコード取得（include 対応） |
| PUT | `/{dataset_key}/records/{record_id}` | レコード更新（`data` を全置換） |
| PATCH | `/{dataset_key}/records/{record_id}` | レコード更新（指定要素の部分置換） |
| DELETE | `/{dataset_key}/records/{record_id}` | レコード削除 |

---

## 5. エンドポイント詳細（例つき）

> 以下の例の値は介護施設マスタのサンプルデータです。`id` は環境ごとに異なります。
> 

### 5.1 一覧取得 `GET /{dataset_key}/records`

レコードを作成日時順で返却します。

**クエリパラメータ**

| 名前 | 型 | 既定 | 説明 |
| --- | --- | --- | --- |
| `page` | int (≥1) | 1 | ページ番号 |
| `limit` | int (1–100) | 20 | 1 ページあたりの件数 |
| `include` | string | — | 関連マスタを同梱（5.2） |

**リクエスト**

```bash
curl -H "X-API-Key: $SUMMARIZE_API_KEY" \
  "$EP/facilities/records?page=1&limit=20"
```

**レスポンス（200）**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "jxf8ptr5lkn4",
        "data": { "name": "たいよう本館", "address": "東京都新宿区西新宿1-1-1", "phone": "03-1111-2222" },
        "created_at": "2026-06-07T10:00:00+09:00",
        "updated_at": "2026-06-07T10:00:00+09:00"
      },
      {
        "id": "f60vj21glavj",
        "data": { "name": "さくら苑", "address": "神奈川県横浜市港北区2-2-2", "phone": "045-333-4444" },
        "created_at": "2026-06-07T10:00:00+09:00",
        "updated_at": "2026-06-07T10:00:00+09:00"
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

---

### 5.2 include（関連マスタ同梱）

外部呼び出し側で JOIN を記述することなく、dataset に定義された **relation 名**を指定するだけで、関連先マスタを同梱して取得いただけます。

**対応範囲**: 一覧取得・検索・単一レコード取得のいずれでもご利用いただけます（**1 階層のみ**・**comma 区切り 1 個のみ**・**relation は最大 5 つまで**）。指定方法はいずれも `?include=` クエリです（検索も body ではなく query で指定します。各エンドポイントの例は 5.4 / 5.5 をご参照ください）。

```bash
# facility と department を同時に同梱
curl -H "X-API-Key: $SUMMARIZE_API_KEY" \
  "$EP/staff/records?include=facility,department"
```

**レスポンス（200）**

各 item の `relations` に、relation 名をキーとして関連レコードが直接内包されます。

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "juiiahijhlrc",
        "data": { "name": "田中太郎", "role": "介護士", "facility_id": "jxf8ptr5lkn4", "department_id": "b0oxg2mx7m99" },
        "created_at": "2026-06-07T10:00:00+09:00",
        "updated_at": "2026-06-07T10:00:00+09:00",
        "relations": {
          "facility":   { "id": "jxf8ptr5lkn4", "data": { "name": "たいよう本館", "address": "東京都新宿区西新宿1-1-1", "phone": "03-1111-2222" } },
          "department": { "id": "b0oxg2mx7m99", "data": { "name": "介護部" } }
        }
      }
    ],
    "total": 4,
    "page": 1,
    "limit": 20
  }
}
```

**ご参考**

- `relations` の各レコードは `{ id, data }` のみです（`created_at` 等は含まれません）。
- 指定した relation 名のキーは**常に**出力され、参照が未解決（参照 field が空・参照先レコードが存在しない等）の場合は値が `null` となります（item 自体は必ず返却されます）。
- `include` 未指定の場合、`relations` は `null` です。
- 一覧・検索・単一レコード取得のいずれでもご利用いただけます。検索では `?include=` を**クエリ**で指定します（body の `include` は 422 となります）。

---

### 5.3 レコード作成 `POST /{dataset_key}/records`

**リクエストボディ**

```json
{ "data": { /* dataset のスキーマに沿った実データ */ } }
```

```bash
curl -X POST -H "X-API-Key: $SUMMARIZE_API_KEY" -H "Content-Type: application/json" \
  -d '{"data": {"name": "山田次郎", "facility_id": "jxf8ptr5lkn4", "department_id": "b0oxg2mx7m99", "role": "介護士"}}' \
  "$EP/staff/records"
```

**レスポンス（200）**

```json
{
  "success": true,
  "data": {
    "id": "ql8ft3z2q687",
    "data": { "name": "山田次郎", "facility_id": "jxf8ptr5lkn4", "department_id": "b0oxg2mx7m99", "role": "介護士" },
    "created_at": "2026-06-09T16:30:00+09:00",
    "updated_at": "2026-06-09T16:30:00+09:00"
  },
  "message": "作成しました"
}
```

- `id` は未指定の場合サーバ側で採番します。
- `data` がスキーマの必須 field を満たさない場合や型不一致の場合は **422** となります（7. エラー仕様）。

### `id` の任意指定

環境間のデータ再現や seeding の用途で、レコード `id` を明示的に指定して作成いただけます。

```bash
curl -X POST -H "X-API-Key: $SUMMARIZE_API_KEY" -H "Content-Type: application/json" \
  -d '{"id": "staff-yamada-001", "data": {"name": "山田次郎"}}' \
  "$EP/staff/records"
```

- **形式**: 先頭は英数小文字、以降は英数小文字・・`_`、最大 50 文字（正規表現 `^[0-9a-z][0-9a-z_-]{0,49}$`）。形式違反は **422** となります。
- **一意性**: id は dataset 単位ではなく、**ご契約アカウント内の全 dataset を通してグローバルに一意**です。既存 id と重複した場合は **409 Conflict** を返却します。
- 同様に、一括インポート（管理画面・連携経由）でも各要素を `{"data": {...}, "id": "..."}` 形式にすることで id を指定できます（id 重複が 1 件でもあるとバッチ全体がロールバックされ 409 となります）。なお、この形式として解釈されるのは**キーが** `data`**（および任意の** `id`**）のみで、**`data` **の値がオブジェクトの要素だけ**です。それ以外の要素は従来どおり要素全体が実データとして扱われます。

---

### 5.4 レコード検索 `POST /{dataset_key}/records/search`

`data` のテキストに対する検索です。リクエストボディは `query` **と** `limit` **のみ**受け付けます（body にそれ以外の field を入れると 422 となります）。`include` は**クエリパラメータ**（`?include=...`）でご指定いただけ、関連マスタを同梱できます。

**リクエストボディ**

| 名前 | 型 | 既定 | 説明 |
| --- | --- | --- | --- |
| `query` | string（1 文字以上） | 必須 | 検索クエリ |
| `limit` | int (1–100) | 20 | 取得上限 |

```bash
curl -X POST -H "X-API-Key: $SUMMARIZE_API_KEY" -H "Content-Type: application/json" \
  -d '{"query": "田中", "limit": 20}' \
  "$EP/staff/records/search"
```

**レスポンス（200）**

検索はページングに対応しておりません（`items` / `total` / `query` を返却します）。

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "juiiahijhlrc",
        "data": { "name": "田中太郎", "role": "介護士", "facility_id": "jxf8ptr5lkn4", "department_id": "b0oxg2mx7m99" },
        "created_at": "2026-06-07T10:00:00+09:00",
        "updated_at": "2026-06-07T10:00:00+09:00"
      }
    ],
    "total": 1,
    "query": "田中"
  }
}
```

**include 付き（クエリで指定）**

```bash
curl -X POST -H "X-API-Key: $SUMMARIZE_API_KEY" -H "Content-Type: application/json" \
  -d '{"query": "田中", "limit": 20}' \
  "$EP/staff/records/search?include=facility"
```

`include` を指定すると、一覧と同じく `data.included` が付与されます（指定がなければ付きません）。

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "juiiahijhlrc",
        "data": { "name": "田中太郎", "facility_id": "jxf8ptr5lkn4" },
        "created_at": "2026-06-07T10:00:00+09:00",
        "updated_at": "2026-06-07T10:00:00+09:00"
      }
    ],
    "total": 1,
    "query": "田中",
    "included": {
      "facility": {
        "jxf8ptr5lkn4": { "id": "jxf8ptr5lkn4", "data": { "name": "たいよう本館", "address": "東京都新宿区西新宿1-1-1", "phone": "03-1111-2222" } }
      }
    }
  }
}
```

---

### 5.5 単一レコード取得 `GET /{dataset_key}/records/{record_id}`

**クエリパラメータ**

| 名前 | 型 | 既定 | 説明 |
| --- | --- | --- | --- |
| `include` | string | — | 関連マスタを同梱（5.2） |

```bash
curl -H "X-API-Key: $SUMMARIZE_API_KEY" \
  "$EP/staff/records/juiiahijhlrc"
```

**レスポンス（200）**

`include` 未指定時は `included` は `null` です（既存利用への影響はありません）。

```json
{
  "success": true,
  "data": {
    "id": "juiiahijhlrc",
    "data": { "name": "田中太郎", "role": "介護士", "facility_id": "jxf8ptr5lkn4", "department_id": "b0oxg2mx7m99" },
    "created_at": "2026-06-07T10:00:00+09:00",
    "updated_at": "2026-06-07T10:00:00+09:00",
    "included": null
  }
}
```

**include 付き**

```bash
curl -H "X-API-Key: $API_KEY" \
  "$EP/staff/records/juiiahijhlrc?include=facility,department"
```

`data` に `included`（`relation名 → 関連先id → レコード`）が付与されます。

```json
{
  "success": true,
  "data": {
    "id": "juiiahijhlrc",
    "data": { "name": "田中太郎", "role": "介護士", "facility_id": "jxf8ptr5lkn4", "department_id": "b0oxg2mx7m99" },
    "created_at": "2026-06-07T10:00:00+09:00",
    "updated_at": "2026-06-07T10:00:00+09:00",
    "included": {
      "facility": { "jxf8ptr5lkn4": { "id": "jxf8ptr5lkn4", "data": { "name": "たいよう本館", "address": "東京都新宿区西新宿1-1-1", "phone": "03-1111-2222" } } },
      "department": { "b0oxg2mx7m99": { "id": "b0oxg2mx7m99", "data": { "name": "介護部" } } }
    }
  }
}
```

- 存在しない `record_id` の場合は **404** となります（`DatasetRecord（ID: xxx）が見つかりません`）。

---

### 5.6 レコード更新 `PUT /{dataset_key}/records/{record_id}`

`data` **を全置換します**（PATCH のような部分更新ではございません）。更新時は更新後の全 field を含めてお送りください。（部分更新は5.7 レコード更新 `PATCH /{dataset_key}/records/{record_id}を参照)`

**リクエストボディ**

```json
{ "data": { /* 更新後の実データ全体 */ } }
```

```bash
curl -X PUT -H "X-API-Key: $SUMMARIZE_API_KEY" -H "Content-Type: application/json" \
  -d '{"data": {"name": "田中太郎", "facility_id": "f60vj21glavj", "department_id": "b0oxg2mx7m99", "role": "主任"}}' \
  "$EP/staff/records/juiiahijhlrc"
```

**レスポンス（200）**

```json
{
  "success": true,
  "data": {
    "id": "juiiahijhlrc",
    "data": { "name": "田中太郎", "facility_id": "f60vj21glavj", "department_id": "b0oxg2mx7m99", "role": "主任" },
    "created_at": "2026-06-07T10:00:00+09:00",
    "updated_at": "2026-06-09T16:35:00+09:00"
  },
  "message": "更新しました"
}
```

- 検索用テキストは更新後の `data` で再生成されます（更新後の値で検索にヒットします）。

### 5.7 レコード更新 `PATCH /{dataset_key}/records/{record_id}`

指定したデータの部分更新

JSON形式で指定したキーのみ更新をします。

```bash
curl -X PATCH \
  -H "X-API-Key: $SUMMARIZE_API_KEY" -H "Content-Type: application/json" \
  -d '{"data":{"metadata":{"a":1}}}' \
  "$EP/staff/records/juiiahijhlrc"
```

レスポンス(200)

```bash
{"success":true,"data":{"id":"...","data":{"name":"demo","metadata":{"a":1,"b":2},"tags":["p","q","r"]},...},"message":"更新しました",...}
```

arrayの場合は全置換となります。

```bash
curl -X PATCH \
  -H "X-API-Key: $SUMMARIZE_API_KEY" -H "Content-Type: application/json" \
  -d '{"data":{"tags":["x","y"]}}' \
  "$EP/staff/records/juiiahijhlrc"
```

---

### 5.8レコード削除 `DELETE /{dataset_key}/records/{record_id}`

```bash
curl -X DELETE -H "X-API-Key: $SUMMARIZE_API_KEY" \
  "$EP/staff/records/juiiahijhlrc"
```

**レスポンス（200）**

```json
{
  "success": true,
  "data": null,
  "message": "削除しました"
}
```

- 削除後に同一 `record_id` を取得すると **404** となります。

---

## 6. relation（include）の設定方法

`include` で同梱できる relation は、\*\*dataset のスキーマ定義（`schema_definition.relations`）\*\*にあらかじめ定義されている必要がございます（管理画面または弊社側で設定いたします）。外部呼び出し側は relation 名を指定するだけで、JOIN 条件を記述する必要はございません。

`staff` dataset の relation 定義例:

```json
{
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "facility_id", "type": "text" },
    { "name": "department_id", "type": "text" },
    { "name": "role", "type": "text" }
  ],
  "relations": {
    "facility":   { "local_field": "facility_id",   "target_dataset_key": "facilities",  "target_field": "id" },
    "department": { "local_field": "department_id", "target_dataset_key": "departments", "target_field": "id" }
  }
}
```

| キー | 意味 |
| --- | --- |
| relation 名（`facility` 等） | `include=` で指定する名前です。`included` の最上位キーにもなります。 |
| `local_field` | このレコード側の参照 field（外部キー相当）です。 |
| `target_dataset_key` | 参照先 dataset のキーです。 |
| `target_field` | 参照先で照合する field です。**MVP では** `"id"`**（参照先レコードの top-level id）のみ**に対応しております。 |

---

## 7. エラー仕様

エラーは `success: false` エンベロープ（3. 共通仕様）で返却されます。代表的なケースは以下のとおりです（`error.message` は実測値です）:

| 状況 | HTTP | `error.message` 例 |
| --- | --- | --- |
| `X-API-Key` 欠落 | 401 | `Authentication required.`（code: `AuthenticationRequired`） |
| `X-API-Key` 不正 | 401 | `無効なAPIキー` |
| JWT / cookie 混在 | 401 | `external API は X-API-Key のみ受け付けます` |
| 不明な `dataset_key` | 404 | `dataset_key が見つかりません: <key>` |
| 不明な `record_id` | 404 | `DatasetRecord（ID: <id>）が見つかりません` |
| 多階層 include（`include=facility.organization`） | 422 | `多階層 include は未対応です: facility.organization` |
| 未定義 relation（`include=ghost`） | 422 | `未定義の relation です: ghost` |
| `include` を複数回指定（`?include=a&include=b`） | 422 | `include は comma-separated 1 つのみ指定できます` |
| `include` の relation 数が 6 つ以上 | 422 | `include は最大 5 つまでです（指定: 6）` |
| 作成時の `id` 形式不正 | 422 | （Pydantic バリデーションエラー） |
| 作成・インポート時の `id` 重複 | **409** | `レコード ID '<id>' は既に存在します` |
| 作成・更新でスキーマ違反（必須欠落 / 型不一致） | 422 | `データバリデーションエラー` |
| 検索で `query` / `limit` 以外を送信 | 422 | （Pydantic バリデーションエラー） |

> include を複数の関連で使用する場合は、`?include=facility,department` のように **1 つの** `include` **に comma 区切り**でご指定ください（`?include=facility&include=department` はご利用いただけません）。
> 

---

## 8. データ型・バリデーション

- `data` は任意の JSON オブジェクトですが、dataset のスキーマ（field の型・必須）に基づいて検証されます。違反した場合は **422** となります。
- field の主な型: `text` / `number` / `date` / `select` / `boolean` / `object` / `array` / `json`。
- 作成・更新の際は、数値は数値・真偽値は真偽値としてお送りください（文字列のままでは型不一致で 422 となる場合がございます）。
- 検索の `query` は 1 文字以上、`limit` は 1〜100 です。
- 作成時の `id`（任意指定）は `^[0-9a-z][0-9a-z_-]{0,49}$`（先頭英数小文字・最大 50 文字）です。アカウント内の全 dataset を通してグローバルに一意で、重複は **409** となります。

---

## 9. 制約・非対応

以下は**非対応**となっております:

- 外部呼び出し側が指定する自由 JOIN、JOIN 先の field 絞り込み。
- 多階層 include（`include=facility.organization`）。
- `target_field` に `id` 以外を指定すること。