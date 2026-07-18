# 媒体別生成設定 + システム参考原稿 + 3階層ロール 設計書

作成日: 2026-07-19
ステータス: ユーザー承認済み・実装済み(移行SQLの適用待ち)

## 1. 目的

求人原稿の生成品質を左右する「媒体ごとのフォーマット・アルゴリズム知識・制約条件」と
「参考原稿」を、コード内のハードコードから**最高管理者だけが編集できるシステム設定**に移す。
生成時(Team A / Team B)は常にこの設定を参照し、媒体に合った原稿を出力する。
あわせてロールを3階層(最高管理者 / 管理者 / ユーザー)に再編する。

現状、フォーマット・アルゴリズム・制約は `lib/agents/manuscript-writing.ts`(Team A)と
`lib/agents/team-b/text-improvement.ts`(Team B)のプロンプト文字列にベタ書きされており、
参考原稿は組織ごとの `ReferencePosting` に登録する仕様になっている。

## 2. 決定事項サマリ

| 論点 | 決定 |
|---|---|
| ① 媒体別フォーマット | システム設定化。生成時に媒体に対応する設定をプロンプトへ注入 |
| ② 参考原稿 | **システム共通の参考原稿に一本化**。組織ごとの参考原稿(`ReferencePosting`・`/references` 画面)は完全廃止。選定は現行どおり LLM が自動判別し、書き方・訴求文・アピールポイントを参考にする |
| ③ 媒体アルゴリズム | システム設定化。生成時にプロンプトへ注入 |
| ④ 媒体別制約条件 | システム設定化。生成時にプロンプトへ注入し、Fact Check の検証条件にも使う |
| 適用範囲 | **Team A(初稿)と Team B(改善)の両方** |
| 編集権限 | ①〜④はすべて**最高管理者のみ**(管理者・ユーザーには非表示) |
| ロール | `super_admin`(最高管理者)/ `admin`(管理者)/ `member`(ユーザー)の3階層に再編 |
| 初期値 | 現行プロンプトの内容をコード内デフォルトとして保持し、設定が空の媒体はデフォルトで動く(移行直後に品質が落ちない) |

## 3. ロール再設計

### 3.1 定義(`types/auth.ts`)

`UserRole = "super_admin" | "admin" | "member"`

移行 SQL で既存の `admin`(運営者)を `super_admin` へ UPDATE する。`admin` は
「組織の管理者」という新しい意味になる。

### 3.2 権限マトリクス

| 機能 | super_admin(最高管理者) | admin(管理者) | member(ユーザー) |
|---|---|---|---|
| 組織の作成・編集(組織管理) | ○(全組織) | ×(自組織のメンバー管理のみ) | × |
| メンバー一覧・追加・編集・削除 | ○(全組織) | ○(**自組織のみ**) | × |
| 事業所マスタ | ○ | ○(自組織) | × |
| 職種マスタ | ○ | ○(自組織) | × |
| 勤務形態マスタ | ○ | ○(自組織) | × |
| プラン(billing) | ○ | ○(自組織) | × |
| 参考サムネ | ○ | **非表示** | × |
| 媒体設定(①③④) | ○ | **非表示** | × |
| システム参考原稿(②) | ○ | **非表示** | × |
| 設定画面そのもの | ○ | ○(許可タブのみ) | **非表示** |
| 求人管理・原稿生成(Team A/B) | ○ | ○ | ○ |

補足ルール:

- `super_admin` は**すべての操作が可能**。他組織データも読み書きできる
  (`canReadOrg` / `canWriteOrg` を `super_admin` は常に true に変更。
  従来 admin は「他組織は閲覧のみ」だったが、最高管理者は書き込みも許可する)。
- `admin` のメンバー管理では、付与できるロールは `admin` / `member` のみ。
  `super_admin` の付与・編集・削除は `super_admin` にしかできない。
  自分自身の削除禁止は現行踏襲。
- マスタ類(事業所・職種・勤務形態)の **GET(参照)は member にも許可したままにする**。
  求人作成フォームがマスタを読むため、絞ると生成フロー自体が壊れる。
  制限するのは設定画面の表示と書き込み系 API(POST/PATCH/DELETE)。

### 3.3 実装ポイント

- `lib/auth-guard.ts`: `requireRole` はそのまま使い、各ルートの許可ロール指定を更新。
- `lib/org-scope.ts`: `canReadOrg` / `canWriteOrg` の判定を `super_admin` 基準に変更。
- `app/api/users/*`: super_admin = 全組織対象(現行の組織管理)、admin = 自組織のメンバー
  のみ対象の二段動作に改修。admin からは `super_admin` ユーザーを不可視・操作不可にする。
- `app/api/organizations/*` / `app/api/reference-thumbnails/*`: `requireRole(["super_admin"])`。
- `app/api/settings/{offices,job-types,employment-types}/*` と billing 系:
  書き込みは `requireRole(["super_admin", "admin"])`、GET は `requireAuth()` のまま。
- `app/settings/layout.tsx`: タブごとに許可ロールを持たせる。member は設定画面全体を
  非表示(アクセス時はトップへリダイレクト)。`AppHeader` の設定リンクも member には出さない。

## 4. データモデル変更

移行 SQL は `docs/migration-platform-guidelines.sql` として追加し、Supabase ダッシュボードで
手動適用する(既存運用どおり)。

### 4.1 新テーブル `PlatformGuideline`(①③④)

媒体ごとに1行。全組織共通。

| カラム | 型 | 備考 |
|---|---|---|
| platform | TEXT PK | indeed / airwork / jobmedley / hellowork |
| format | TEXT NOT NULL DEFAULT '' | ① 出力フォーマット(テンプレート・記号・セクション構成) |
| algorithm | TEXT NOT NULL DEFAULT '' | ③ 媒体アルゴリズムの前提知識(検索・表示ロジック、CTR/CVR の考え方) |
| constraints | TEXT NOT NULL DEFAULT '' | ④ 制約条件(文字数上限・禁止事項・法令・表記ルール) |
| updatedBy | TEXT | 最終更新者(User.id) |
| updatedAt | TIMESTAMPTZ | |

- 3カラムとも自由記述テキスト。プロンプトにそのまま注入する。
- **行が無い・カラムが空の媒体は、コード内デフォルト(現行プロンプトから抽出したもの)で動く。**
  デフォルトは `lib/platform-guidelines/defaults.ts` に媒体×3区分の定数として切り出し、
  設定画面の初期表示にも使う(SQL に巨大テキストを埋め込むシードは行わない)。

### 4.2 新テーブル `SystemReferencePosting`(②)

全組織共通の参考原稿。`orgId` は持たない。

| カラム | 型 | 備考 |
|---|---|---|
| id | TEXT PK | 既存 `ReferencePosting` からのコピーを許容するため TEXT |
| title | TEXT NOT NULL | 管理用タイトル |
| platform | TEXT NOT NULL | 対象媒体 |
| industry | TEXT | 業種(マッチング用) |
| jobType | TEXT | 職種(マッチング用) |
| postingData | TEXT NOT NULL | 原稿データ(JSON 文字列。現行 `ReferencePosting.postingData` と同形式 = `types/reference.ts` の `ReferencePostingData`) |
| performance | TEXT | 実績メモ(例: 月50件応募)。現行カラムを踏襲 |
| createdBy | TEXT | User.id(移行コピー分は NULL) |
| createdAt | TIMESTAMPTZ | |

### 4.3 `ReferencePosting` の廃止

- 移行 SQL 内で、既存 `ReferencePosting` の全行を `SystemReferencePosting` へコピー
  (title / platform / industry / jobType / postingData / createdAt を引き継ぎ)した上で
  `DROP TABLE`。既存の登録データ(現状はすべて運営者組織のもの)はシステム参考原稿として生き残る。
- コード側の削除対象: `app/references/*`(一覧・登録・詳細ページ)、`app/api/references/*`、
  ナビゲーション(`AppHeader`)の参考原稿リンク、`types/master-data.ts` 等からの参照。
- **例外**: `app/references/fields.ts` の `PLATFORM_FIELDS`(媒体別フィールド定義)は
  Team B の `text-improvement.ts` と新しい登録画面が使い続けるため、`lib/platform-fields.ts`
  へ移動して存続させる。`types/reference.ts` の型も存続。

### 4.4 `User.role` の変更

- CHECK 制約を `('super_admin','admin','member')` に差し替え。
- 既存の `role = 'admin'` を `'super_admin'` に UPDATE(現運営者がそのまま最高管理者になる)。

## 5. 生成フローへの組み込み

読み込みはサーバ側で `supabaseAdmin` 直読み。アクセサは `lib/platform-guidelines/index.ts` に
`getPlatformGuidelines(platforms)`(DB 値が空ならデフォルトへフォールバックした完成形を返す)
としてまとめ、Team A / Team B の両ルートから使う。

### 5.1 Team A(`app/api/team-a/route.ts` + `lib/agents/*`)

1. **ロード**: 選択媒体分の `PlatformGuideline` と、`SystemReferencePosting` から
   職種×業種マッチ(現行と同じ `ilike` 部分一致・優先度付き・最大5件、3件未満なら最新で補充)
   で参考原稿をロード。現行の組織スコープ付き `ReferencePosting` クエリ(125〜171行)を置き換える。
2. **Reference Selection エージェント**(`reference-selection.ts`): 入力の参照元を
   システム参考原稿に差し替え。LLM がどの原稿をどう参考にするか判別し、書き方・訴求文・
   アピールポイントを抽出する現行の挙動は維持。
3. **Manuscript Writing**(`manuscript-writing.ts`): 媒体別プロンプトを
   「共通執筆ルール(basePrompt) + `algorithm` + `format` + `constraints` + 参考原稿の選定結果」
   の合成に再構成。現行のベタ書き(Indeed 114〜304行、AirWork 313〜337行、
   JobMedley 340〜363行、ハローワーク 366〜461行)は `defaults.ts` へ移動し、
   ハードコードとしては削除。ハローワークの専用 system メッセージ・全角ルールも
   `constraints` のデフォルト値として移す。
4. **Fact Check**(`fact-check.ts`): 現行の `PLATFORM_EXTRA_RULES` に加えて、
   媒体の `constraints` を検証条件としてプロンプトへ注入(「制約条件に違反していないか」を確認)。

### 5.2 Team B(`app/api/team-b/route.ts` + `lib/agents/team-b/*`)

- ルートで `input.platform` の `PlatformGuideline` をロードし、Text Improvement /
  Design Improvement へ渡す。
- `text-improvement.ts`: ハードコードの `indeedAlgorithmSection`(134〜154行)を
  DB の `algorithm` で置き換え(デフォルトへフォールバック)。`constraints` と `format` も
  「改善後も守るべきルール」としてプロンプトへ注入。ベンチマーク定数
  (`INDEED_BENCHMARKS` / `AIRWORK_BENCHMARKS`)は数値データなので今回はコードに残す。
- `design-improvement.ts`: 実装時に確認した結果、テキストプロンプトを持たない
  画像生成エージェント(`lib/nanobanana.ts` 直呼び)のため注入対象外とした。

### 5.3 SSE・オーケストレーションへの影響

なし。`maxDuration = 300`・15秒ハートビート・Web Worker 経由の SSE は変更しない。
設定ロードはストリーム開始前の既存ロード処理に追加するだけ。

## 6. API 追加・変更

| ルート | メソッド | 権限 | 内容 |
|---|---|---|---|
| `/api/settings/platform-guidelines` | GET | super_admin | 全媒体の設定(空なら defaults を埋めた形)を返す |
| `/api/settings/platform-guidelines` | PUT | super_admin | 媒体1件分を upsert |
| `/api/settings/system-references` | GET / POST | super_admin | 一覧・登録 |
| `/api/settings/system-references/[id]` | PATCH / DELETE | super_admin | 編集・削除 |
| `/api/settings/system-references/extract` | POST | super_admin | 貼り付けテキストから原稿データを LLM 抽出(現行 `/api/references/extract` の移設。モデルは現行どおり `lib/claude.ts` の定数) |
| `/api/references/*` | — | — | **削除** |
| `/api/users/*` | 各種 | super_admin / admin | §3.3 の二段動作に改修 |

## 7. UI 変更

- **`/settings` タブ構成**(ロール別表示):
  - 組織管理(users): super_admin / admin(admin は自組織メンバーのみの簡易表示)
  - 参考サムネ: super_admin のみ
  - **媒体設定(新規)**: super_admin のみ。媒体タブ(Indeed / AirWork / JobMedley / ハローワーク)
    × 3テキストエリア(フォーマット / アルゴリズム / 制約条件)+保存。未保存の媒体は
    デフォルト値をプリフィル表示し「初期値」バッジを出す
  - **参考原稿(新規)**: super_admin のみ。現行 `/references` の登録 UI
    (媒体別フィールド・テキスト貼り付け抽出)をリメイクして移植
  - 事業所マスタ / 職種マスタ / 勤務形態マスタ / プラン: super_admin / admin
- **member**: 設定画面全体にアクセス不可(リダイレクト)。`AppHeader` の設定リンク非表示。
- **`/references`**: ページ削除。ナビゲーションからも除去。

## 8. リリース手順

1. コード実装 → `npm run build` を通す
2. `docs/migration-platform-guidelines.sql` を Supabase ダッシュボードで適用
   (ロール移行 → 新テーブル作成 → 参考原稿コピー → `ReferencePosting` DROP)
3. デプロイ(旧コードは新ロール値を知らないため、適用→デプロイは連続して行う)
4. 最高管理者で「媒体設定」を開き、プリフィルされた初期値を確認・必要なら調整して保存

## 9. 手動テストチェックリスト

テストフレームワークは導入しない(プロジェクト方針)。`npm run build` を通した上で手動確認:

- [ ] super_admin: 全タブが見え、媒体設定・参考原稿を編集できる
- [ ] admin: 設定画面に「組織管理・事業所・職種・勤務形態・プラン」のみ表示。
      参考サムネ・媒体設定・参考原稿は URL 直打ちでも 403/リダイレクト
- [ ] admin: 自組織のメンバーを追加・編集・削除できる。他組織のメンバーは見えない。
      super_admin ユーザーは見えず、ロール選択肢にも super_admin が出ない
- [ ] member: 設定画面が非表示(URL 直打ちでリダイレクト)。求人作成フォームは
      マスタを読めて正常に動く
- [ ] 媒体設定が未保存の媒体で Team A を実行 → 従来と同等の原稿が出る(デフォルト動作)
- [ ] 媒体設定のフォーマットを書き換えて Team A 実行 → 出力にその内容が反映される
- [ ] システム参考原稿に職種一致の原稿を登録して Team A 実行 → Reference Selection が
      その原稿を選定し、訴求・書き方が反映される
- [ ] Team B(Indeed)実行 → 媒体設定のアルゴリズム・制約を踏まえた改善が出る
- [ ] Fact Check が制約条件違反(例: ハローワークに絵文字)を検出する
- [ ] `/references` にアクセスできない(404)。旧 API も 404
- [ ] 移行前に登録済みだった参考原稿がシステム参考原稿として残っている

## 9.5 後続改善: 生成フローの効率化(同日承認・実装済み)

媒体設定・システム参考原稿の導入で冗長になった段の整理と、フロー高速化。

| 項目 | 内容 |
|---|---|
| A. Reference Selection 廃止 | LLM による参考パターン生成を削除(`lib/agents/reference-selection.ts` 削除)。媒体設定と実在の参考原稿を直接注入するため不要になった。SSE の `reference-selection` ステップは UI 互換のため残し、ロード済み参考原稿の件数を即時返す。直列 LLM 1コール(5〜15秒)削減 |
| B. トレンド調査キャッシュ | `TrendCache` テーブル(`docs/migration-trend-cache.sql`)に Web 調査結果を保存し、同じ職種×業種×都道府県×雇用形態は **7日間** 再利用(`lib/trend-cache.ts`)。トレンド分析は入力に依存するため毎回実行。キャッシュ失敗時はライブ調査で続行 |
| C. 流用作成の強化 | Team A リクエストに `reuseSourceJobId` を追加。流用元 Job の最新 team-a レコードの確定原稿を「最優先の参考原稿」として執筆プロンプトに注入(所有権は `getOwnedJob` で確認)。入力データのコピーだけでなく実績ある構成・訴求を踏襲する |
| D. サムネ再生成の任意化 | Team B 入力に `generateThumbnails`(既定 true)を追加。ブラッシュアップ画面のチェックボックスでオフにすると Design Improvement をスキップし、テキスト改善のみ高速実行 |

## 10. スコープ外(今回はやらない)

- 媒体設定の版管理・変更履歴・承認フロー
- 組織ごとの媒体設定オーバーライド(設定は全組織共通のみ)
- RLS によるデータベース層の多重防御(従来どおりアプリ層で担保)
- 媒体の追加(4媒体固定のまま。追加時は `types/platform.ts` と defaults の拡張が必要)
- SharedKnowledge / TeamBMemory の自動学習の仕様変更(現行のまま併用)
