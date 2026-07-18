# マルチテナント化 + Stripe 課金 設計書

作成日: 2026-07-18
ステータス: ユーザー承認済み(会話内で前半・後半それぞれ承認)

## 1. 目的

現在は運営者1人が使う前提のアプリを、外部の会社(組織)を招待して利用してもらえる
マルチテナント SaaS にする。データは組織単位で完全に分離し、料金は
`docs/subscription-pricing-plan.md` の3プラン(基本料金+従量課金)に従って Stripe で請求する。

## 2. 決定事項サマリ

| 論点 | 決定 |
|---|---|
| テナント単位 | **組織単位**(1つの事業所IDを複数ユーザーが共有し、データ・クレジットを共有) |
| 会員登録 | **招待制のまま**。自由サインアップは開放しない。運営者が組織を作りメンバーを追加する |
| メンバー追加方式 | 現行方式のまま(運営者がメール+パスワードを直接設定して伝える) |
| ログイン | **事業所ID + メールアドレス + パスワード** の3項目 |
| ロール | `admin`(運営者)/ `member`(一般)の2種に簡素化。既存 editor/reviewer/publisher は member へ移行 |
| 職種・雇用形態マスタ | 組織ごとに分離。新規組織作成時に標準セットを自動投入 |
| 課金 | Stripe まで実装。ただし**当面は課金免除フラグ付きで招待**し、無料利用させられるようにする |
| 従量課金の計算 | **アプリ側台帳(UsageLog)方式**。Stripe は月額サブスクと超過分 InvoiceItem の決済に専念 |
| 未契約組織の扱い | 課金免除でなく契約もない組織は **Team A/B の実行のみブロック**(閲覧・編集は可) |

## 3. 用語

- **Organization(組織)**: 契約主体。ログイン時の「事業所ID」は `Organization.code`(例: `TTT001`)。
- **Office(事業所)**: 既存テーブル。求人の勤務先を表すアプリ内データ。**Organization とは別物**。
  画面上「事業所ID」と表示するのはログイン・組織管理の文脈のみで、求人管理の「事業所」とは混同させない。

## 4. データモデル変更

移行 SQL は `docs/migration-multi-tenant.sql` として追加し、Supabase ダッシュボードで手動適用する
(既存運用どおり。マイグレーションツールは導入しない)。

### 4.1 新テーブル `Organization`

| カラム | 型 | 備考 |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| code | TEXT UNIQUE NOT NULL | 事業所ID(例: TTT001)。大文字英数字 |
| name | TEXT NOT NULL | 組織名 |
| billingExempt | BOOLEAN NOT NULL DEFAULT false | 課金免除フラグ |
| stripeCustomerId | TEXT | Stripe Customer |
| stripeSubscriptionId | TEXT | Stripe Subscription |
| plan | TEXT | starter / standard / pro / NULL(未契約) |
| subscriptionStatus | TEXT | active / past_due / canceled / NULL |
| currentPeriodStart / currentPeriodEnd | TIMESTAMPTZ | 請求期間(クレジット集計の区切り) |
| createdAt / updatedAt | TIMESTAMPTZ | |

### 4.2 新テーブル `UsageLog`

| カラム | 型 | 備考 |
|---|---|---|
| id | UUID PK | |
| orgId | UUID FK → Organization | |
| userId | UUID FK → User | 実行したユーザー |
| kind | TEXT | team_a / team_b |
| jobId | TEXT | 対象求人 |
| baseAmountYen | INTEGER | クレジット消化の基準単価(A=800 / B=400) |
| overageAmountYen | INTEGER | 超過課金額(クレジット内なら 0) |
| stripeInvoiceItemId | TEXT | 超過課金の InvoiceItem。作成失敗時 NULL(未請求) |
| createdAt | TIMESTAMPTZ | |

### 4.3 既存テーブルの変更

- `User`: `orgId UUID FK` を追加。`role` の値を整理(editor/reviewer/publisher → member に UPDATE)。
- `Office` / `Job` / `ReferencePosting` / `TeamBMemory` / `JobType` / `EmploymentType`:
  `orgId UUID FK` + インデックスを追加。
- `JobRecord` / `PublishMetrics`: カラム追加なし。親 `Job` の orgId で所有確認する。
- `SharedKnowledge`: 変更なし(全組織共有の匿名化ナレッジという設計を維持)。

### 4.4 既存データの帰属

移行 SQL 内で運営者用の Organization(code は SQL 冒頭のプレースホルダで指定、初期値 `TTT001`)を
1件 INSERT し、既存の全行(User 含む)の orgId をそこへ UPDATE する。

## 5. ログイン(3項目)

- `/login` に「事業所ID」欄を追加。3項目すべて必須。
- 認証手順: ① Supabase Auth の `signInWithPassword(email, password)` → ② 成功したら自分の
  `User.orgId` → `Organization.code` を取得し、入力された事業所IDと照合(大文字小文字は区別しない)
  → ③ 不一致なら即 `signOut()` し「事業所ID、メールアドレス、またはパスワードが正しくありません」
  と表示(どの項目が誤りかは開示しない)。
- メールアドレスは Supabase Auth 全体でユニーク。事業所IDは名前空間ではなく本人確認の追加チェック。
- middleware の全ページ保護・`/login` リダイレクトは現状維持。

## 6. API 認可

- **全 API ルート**(jobs / offices / references / team-a / team-b / thumbnails / settings /
  parse-job-input / shared-knowledge)の冒頭で `requireAuth()` を呼ぶ。
- `lib/auth-guard.ts` の `AppUser` に `orgId` を追加し、クエリを `.eq("orgId", user.orgId)` でスコープ。
- 子リソース(JobRecord / PublishMetrics / history-context)は親 Job を取得して orgId を確認してから操作。
- admin(運営者)は全組織のデータを**閲覧のみ**スコープ解除。書き込みは自組織のみ。
- Service Role クライアントは現状維持(認可はアプリ層で担保)。RLS の追加は今回のスコープ外。
- Team A/B の SSE ルートはストリーム開始前に認可+契約状態チェックを行う。

## 7. 組織・ユーザー管理(運営者専用)

- `/settings/users` を組織管理画面に改修:
  - 組織の作成(code・name・課金免除トグル)/ 編集 / 一覧
  - 組織へのメンバー追加(name・email・password を運営者が設定。現行の `auth.admin.createUser` 方式)
  - メンバー追加時にプランのユーザー数上限を検査: starter=1 / standard=5 / pro=無制限 /
    課金免除=無制限 / 未契約=1(契約前の初期メンバー登録用)
- 新規組織作成時、職種・雇用形態の標準セット(現行データを雛形に定数化)を自動 INSERT。
- ロールバック方針は現行踏襲: Auth ユーザー作成後にプロフィール INSERT が失敗したら Auth 側も削除。

## 8. 料金・クレジット(真実源 = `lib/billing/plans.ts`)

```
starter:  基本 ¥3,000  込みクレジット     ¥0  超過 A ¥800 / B ¥400  上限1名
standard: 基本 ¥9,800  込みクレジット ¥8,000  超過 A ¥700 / B ¥350  上限5名
pro:      基本 ¥29,800 込みクレジット ¥32,000 超過 A ¥600 / B ¥300  無制限
```

- **クレジット消化**: 実行1回につき基準単価(A=¥800 / B=¥400)を今期のクレジット残から消化。
  残高計算は「プランの込みクレジット − 今期 UsageLog の baseAmountYen 合計」。期の区切りは
  `currentPeriodStart/End`。
- **超過**: クレジット残が基準単価未満になった実行から、プラン別超過単価で `overageAmountYen` を
  記録し Stripe InvoiceItem を作成(翌月の基本料金請求書に自動合算)。スターターは常に超過扱い。
- **課金タイミング**: Team A/B の実行が**成功した時のみ**記録・課金。途中失敗は課金しない。
- 課金免除組織は UsageLog の記録のみ行い(利用状況の把握のため)、InvoiceItem は作らない。

## 9. Stripe 連携

- 依存追加: 公式 `stripe` npm パッケージ(スペック承認をもって依存追加を了承済みとする)。
- 環境変数: `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
  `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_STANDARD` / `STRIPE_PRICE_PRO`。
- Stripe クライアントは `lib/billing/stripe.ts` に集約(サーバ専用)。

### 9.1 契約フロー

1. 組織のメンバーが `/settings/billing` でプランを選択
2. サーバが Checkout Session(mode=subscription)を作成 — Customer は組織に1つ
   (`stripeCustomerId` が無ければ作成して保存)
3. 決済完了 → Webhook `checkout.session.completed` で `Organization` に
   subscriptionId / plan / status / 期間を保存
4. プラン変更・カード変更・解約は Stripe Customer Portal(サーバで Portal Session を作って誘導)

### 9.2 Webhook `/api/stripe/webhook`

- 署名検証必須(`STRIPE_WEBHOOK_SECRET`)。
- 処理イベント: `checkout.session.completed` / `customer.subscription.updated` /
  `customer.subscription.deleted`。いずれも Stripe 側のオブジェクト ID をキーに upsert する冪等な実装。
- サブスク状態は Webhook を真実源として `Organization` に同期(plan / subscriptionStatus /
  currentPeriodStart / currentPeriodEnd)。

### 9.3 実行ゲート

- Team A/B 開始時: `billingExempt === true` または `subscriptionStatus === 'active'` なら許可。
  それ以外は SSE エラーイベント(`error` イベントに理由コード `subscription_required`)を返し、
  フロントは「プラン契約が必要です。設定 > プランからご契約ください」と表示。

### 9.4 障害時の扱い

- InvoiceItem 作成に失敗しても原稿生成は止めない。UsageLog に `stripeInvoiceItemId = NULL` で残し、
  同組織の次回実行時に未請求分をまとめて再試行する。
- Webhook が一時的に落ちても Stripe が再送する前提(冪等実装で二重処理を防ぐ)。

### 9.5 Stripe 側の初期設定手順(手動・テストモード)

1. Stripe ダッシュボード(テストモード)で商品を3つ作成:
   「スターター ¥3,000/月」「スタンダード ¥9,800/月」「プロ ¥29,800/月」(JPY・月次・定額)
2. 各 Price ID を `.env.local` の `STRIPE_PRICE_*` に設定
3. `stripe listen --forward-to localhost:3000/api/stripe/webhook` でローカル検証、
   本番は Vercel の URL で Webhook エンドポイントを登録し署名シークレットを env に設定

## 10. UI 変更

- **`/login`**: 事業所ID欄を追加。
- **`/settings/billing`(新規)**: 現在のプラン / 今月の利用回数(A・B別)/ 残クレジット /
  超過額 / 契約・変更・解約ボタン。課金免除組織には「課金対象外」と表示。
- **`/settings/users`**: 組織管理画面に改修(§7)。
- **ヘッダー(AppHeader)**: 今月の残クレジットを小さく表示(課金免除組織には出さない)。
- **Team A/B 進捗画面**: `subscription_required` エラーの表示を追加。

## 11. リリース手順

1. `docs/migration-multi-tenant.sql` を Supabase ダッシュボードで適用
   (運営者組織 `TTT001` が作られ、既存データが全て帰属する)
2. コードをデプロイ(移行 SQL 適用前の旧コードは orgId を知らないため、適用→デプロイは連続して行う)
3. Stripe テストモードで商品作成・env 設定・Webhook 登録(§9.5)
4. 動作確認後、Stripe 本番モードの商品・キーに差し替え

## 12. 手動テストチェックリスト

テストフレームワークは導入しない(プロジェクト方針)。`npm run build` を通した上で以下を手動確認:

- [ ] 事業所ID不一致でログインできない(エラー文言は3項目まとめて曖昧に)
- [ ] 組織Aのユーザーが組織Bの求人・参考原稿・履歴を一切見られない(API 直叩き含む)
- [ ] admin は他組織のデータを閲覧できるが書き込めない
- [ ] 課金免除組織は未契約でも Team A/B を実行できる
- [ ] 未契約・免除なし組織は Team A/B がブロックされ、案内が表示される
- [ ] Checkout でスタンダード契約 → プラン・期間が Organization に同期される
- [ ] スターターで実行 → 全額超過として InvoiceItem が作られる
- [ ] スタンダードで11回目の Team A 実行から超過課金になる
- [ ] スタンダード組織に6人目を追加できない
- [ ] Portal で解約 → 期間終了後に Team A/B がブロックされる
- [ ] 新規組織に職種・雇用形態の標準セットが投入されている

## 13. スコープ外(今回はやらない)

- 自由サインアップ(セルフサービス登録)・招待メール方式
- RLS によるデータベース層の多重防御
- 組織内ロール(組織管理者/一般の区別)・組織メンバーによるメンバー招待
- 請求書 PDF のアプリ内表示(Stripe の請求書メールに任せる)
- サムネイル再生成の単体課金(¥200/回。料金設計書に「将来オプション」とある)
- 既存パスワードリセット等の認証周り改善
