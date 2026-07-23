# サムネイルラボ（画像生成の単体テスト環境） 設計書

日付: 2026-07-24

## 背景と目的

サムネイル生成のブラッシュアップをしたいが、現状は Team A の全パイプライン（Manuscript Writing = Opus で数分）を通さないとサムネイル生成を実行できない。実際には `runThumbnailGenerationAgent` が原稿から使うのは `indeed.jobTitle` と `indeed.catchphrase` の2文字列のみ。原稿生成を飛ばしてサムネイル生成だけを直接実行できる開発用の入口を作り、1回のテストを数十秒にする。

## 構成

### API: `POST /api/agents/thumbnail-generation`（新規）

- **super_admin 専用**（`requireRole(["super_admin"])`）。`maxDuration = 300`。
- リクエスト: `{ jobTitle(必須), catchphrase, companyName, industry, platforms?: ("indeed"|"airwork"|"jobmedley")[], referenceImage?: dataURL }`
- 入力から最小の `JobPostingInput`（common はデフォルト値で充足）と `manuscript`（indeed の jobTitle / catchphrase のみ）を組み立て、**本番と同一の `runThumbnailGenerationAgent` を実行**する（deriveVisualStyle・構図参考の自動選定・プロンプト生成・gpt-image 呼び出しまで本番パイプラインそのまま）。
- レスポンス: `{ platformThumbnails, generationStatus, message, visualStyle, elapsedMs }`。Storage 保存はしない（画面で確認するだけの使い捨て）。

### ページ: `/dev/thumbnail-lab`（新規）

- フォーム: 職種名 / キャッチコピー / 会社名 / 業種 / 対象媒体（チェック、デフォルト indeed のみ）/ サムネ素材画像（任意）
- 実行中は経過秒数を表示。結果は媒体別に画像グリッドで即表示し、`generationStatus` と `message`（placeholder フォールバック時の警告含む）も表示。
- 直前の入力値（画像以外）を localStorage に保持し、連続テストできるようにする。
- ナビには載せない（URL 直打ち）。権限チェックは API 側で行い、403 はページにエラー表示。

## スコープ外

- 生成プロンプトの手動上書き（まずは本番同等パイプラインの高速実行のみ。必要になれば追加）
- Storage への保存・求人への紐付け
