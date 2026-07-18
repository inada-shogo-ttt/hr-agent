# マルチテナント化 + Stripe 課金 実装計画

対応スペック: `docs/superpowers/specs/2026-07-18-multi-tenant-billing-design.md`

各フェーズは独立にビルド可能な単位で区切る。フェーズ完了ごとに `npm run build` を通す。

## Phase 1: 移行 SQL

- `docs/migration-multi-tenant.sql` を新規作成
  - `Organization` / `UsageLog` テーブル作成
  - `User.orgId` / 各テーブルへの `orgId` 追加 + インデックス
  - role 整理(editor/reviewer/publisher → member)
  - 運営者組織(プレースホルダ code、初期値 `TTT001`)を INSERT し既存全行を帰属
- 適用は Supabase ダッシュボードでユーザーが手動実行(コードデプロイと連続して行う)

## Phase 2: 型・認可基盤

- `types/auth.ts`: `UserRole` を `admin | member` に。`AppUser` に `orgId` 追加
- `types/organization.ts`(新規): `Organization` / `UsageLog` / `Plan` 型
- `lib/auth-guard.ts`: プロフィール取得時に orgId を含める。`requireAuth` の返り値で orgId を提供
- `lib/billing/plans.ts`(新規): 3プラン定数(基本料金・込みクレジット・超過単価・人数上限)+
  基準単価(A=800 / B=400)

## Phase 3: ログイン3項目化

- `app/api/auth/verify-org/route.ts`(新規): ログイン直後に事業所IDを照合(service role で
  自分の組織 code を取得し比較)。middleware で `/api/auth` は公開済みだが、この route 自体は
  セッション必須
- `app/login/page.tsx`: 事業所ID欄追加。signIn 成功 → verify-org → 不一致なら signOut + 曖昧エラー

## Phase 4: API 認可の統一(全ルート)

- 全 route.ts(jobs / offices / references / settings / thumbnails / parse-job-input /
  shared-knowledge / team-a / team-b / users)に `requireAuth()` + orgId スコープを適用
- 子リソースは親 Job の orgId を確認
- admin は GET のみ全組織可(書き込みは自組織のみ)
- INSERT 系は orgId を必ず付与

## Phase 5: 組織・ユーザー管理

- `app/api/organizations/route.ts` + `[id]/route.ts`(新規、admin 専用):
  組織 CRUD(code 発行・billingExempt トグル)。作成時に職種・雇用形態の標準セットを自動投入
- `lib/billing/seat-limit.ts` 相当のチェックをメンバー追加 API に組み込み
  (starter=1 / standard=5 / pro=∞ / 免除=∞ / 未契約=1)
- `app/settings/users/page.tsx` を組織管理 UI に改修(組織一覧 → 組織ごとのメンバー管理)
- `app/api/users` は組織指定でのメンバー追加に対応、role は admin/member のみ受付

## Phase 6: 課金台帳と実行ゲート

- `lib/billing/usage.ts`(新規): 今期クレジット残計算・UsageLog 記録・超過額計算・
  未請求分の InvoiceItem 再試行
- `app/api/team-a/route.ts` / `app/api/team-b/route.ts`:
  - 開始前に requireAuth + (billingExempt || active) チェック → NG なら SSE error
    (理由コード `subscription_required`)
  - 成功完了時のみ UsageLog 記録 + 超過なら InvoiceItem 作成(失敗しても処理は止めない)

## Phase 7: Stripe 連携

- `npm install stripe`(スペックで了承済み)
- `lib/billing/stripe.ts`(新規): サーバ専用クライアント
- `app/api/billing/checkout/route.ts`: Checkout Session 作成(Customer が無ければ作成)
- `app/api/billing/portal/route.ts`: Customer Portal Session 作成
- `app/api/stripe/webhook/route.ts`: 署名検証 + checkout.session.completed /
  customer.subscription.updated / deleted を冪等に処理して Organization に同期
  (middleware の公開パスに `/api/stripe/webhook` を追加)

## Phase 8: 課金 UI

- `app/settings/billing/page.tsx`(新規): 現在プラン / 今月の利用状況 / 残クレジット / 超過額 /
  契約・変更・解約ボタン。免除組織は「課金対象外」表示
- `app/api/billing/summary/route.ts`(新規): 上記表示用の集計
- `AppHeader`: 残クレジットのミニ表示(免除組織は非表示)
- Team A/B 進捗画面: `subscription_required` エラー表示

## Phase 9: 検証

- `npm run build`
- スペック §12 の手動チェックリストのうちローカルで確認可能な項目を実施
  (Stripe はテストモード + stripe CLI)

## 実装順の依存

Phase 1(SQL)→ 2(基盤)→ 3〜5(並行可)→ 6 → 7 → 8 → 9。
コードは orgId カラム前提のため、SQL 適用前に本番へデプロイしない。
