# 待機画面「原稿ライブプレビュー」設計書（2026-07-13・承認済み）

## 目的

Team A / Team B 実行中（3〜5分）の待機画面から OfficeScene（ドット絵オフィス）を廃止し、
AIエージェントの**実際の発見・成果物をタイプライター演出で流す**「原稿ライブプレビュー」に置き換える。
待ち時間を「結果の先読み時間」に変え、退屈を解消する。

## 承認済みの方針（B案）

- タイプライター演出＋**媒体別の原稿完成イベントをSSEに追加**
- Team A / Team B 両方の待機画面を置き換える
- トークン単位のリアルタイムストリーミング（C案）はコスパが悪いため不採用
- サムネイル画像そのものは SSE に乗せない（ペイロード肥大防止。完成枚数の通知のみ）

## UI構成（新コンポーネント `LiveWritingDesk`）

```
┌──────────────────────────────────────┐
│ ステップドット（エージェント進捗） ●─●─◉─○─○   │
├──────────────────────────────────────┤
│ 「原稿用紙」風シート（白地・枠・点滅カーソル）      │
│  ✓ 要件分析: 「世田谷区の訪問介護。給与水準は…」   │
│  ✓ 採用キーワード: [介護 未経験] [日勤のみ] …     │
│  ✍️ Indeed原稿: ⭕未経験から正社員介護職⭕…█      │
└──────────────────────────────────────┘
（既存の進捗バーは維持。エージェント実行状況・イベントログは <details> に格下げ）
```

- フィードは FeedItem 型（kind: text | chips | manuscript）で、ページ側が SSE イベントから導出して渡す
- タイプライターはキュー式: アイテムを1つずつ、約 30〜40 字/秒で打ち出す。完了済みは全文表示
- 自動スクロールで最新行を追従
- 離脱防止バナー・エラー/タイムアウト表示・進捗計算は現状維持

## データフロー / サーバー変更

1. `lib/agents/manuscript-writing.ts`
   - `runManuscriptWritingAgent(input, onPlatformComplete?)` に拡張
   - 各媒体の生成 Promise 解決時に `onPlatformComplete(platform, { title, catchphrase?, excerpt })` を呼ぶ
     （excerpt = 本文冒頭 約200字）
2. `app/api/team-a/route.ts`
   - コールバックを `agent_progress`（agentId: manuscript-writing、data.preview）として SSE 送信
3. `app/api/team-b/route.ts`
   - `tb-text-improvement` の完了イベントに `improvements`（先頭5件の before/after/reason 要約）を追加
4. 既存イベントの実データ（manager.summary / trend-research.summary /
   trend-analysis.recommendedKeywords / fact-check.summary / assessment 等）はそのまま活用

## フィード内容（すべて実データ・時系列）

- Team A: 要件分析サマリー → トレンド調査の発見 → 採用キーワード（チップ） → 参考原稿選定
  → 媒体別原稿プレビュー（書き上がり次第） → サムネイル完成通知 → ファクトチェック所見 → 完成
- Team B: 開始通知 → 原稿分析の総合所見 → 改善箇所プレビュー（最大5件） → サムネイル通知 → 予算推奨 → 完成

## 変更ファイル

- 新規: `app/components/workflow/LiveWritingDesk.tsx`
- 変更: `lib/agents/manuscript-writing.ts`, `app/api/team-a/route.ts`, `app/api/team-b/route.ts`,
  `app/jobs/[id]/new-posting/progress/page.tsx`, `app/jobs/[id]/rewrite-posting/progress/page.tsx`
- 削除: `app/components/workflow/OfficeScene.tsx`（全使用箇所を置き換え後）

## スコープ外

- トークン単位ストリーミング / SSEへのサムネイル画像添付 / 進捗計算ロジックの変更
