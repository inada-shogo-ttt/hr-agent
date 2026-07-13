# サムネイルスタジオ（create-thumbnail）システム仕様書

他システム（採用システム等）への統合を目的とした、本システムの全機能・全実装方法の詳細ドキュメント。

- 作成日: 2026-07-13
- 対象リポジトリ: `create-thumbnail`
- アプリ名: サムネイルスタジオ — AIサムネイル生成（AI THUMBNAIL STUDIO）
- 概要: テキストプロンプト（＋任意の参考画像）を入力すると、Google Gemini API を使ってサムネイル画像を生成する SPA（シングルページアプリケーション）。生成結果はブラウザの localStorage に履歴として保存され、履歴からの再利用（参考画像として再投入）・拡大表示・ダウンロードが可能。

---

## 1. 技術スタック

### 1.1 ランタイム依存パッケージ（dependencies）

| パッケージ | バージョン | 用途 |
|---|---|---|
| react | ^19.2.0 | UI フレームワーク |
| react-dom | ^19.2.0 | DOM レンダリング（`createRoot`、`createPortal` を使用） |
| react-router-dom | ^7.9.6 | クライアントサイドルーティング（`BrowserRouter`、`Routes`、`Route`、`Link`、`useNavigate`、`useLocation`） |
| lucide-react | ^0.555.0 | アイコン（Sparkles, AlertCircle, Wand2, History, Menu, X, Download, Copy, Calendar, Maximize2, ImageOff, Upload, Loader2） |
| clsx | ^2.1.1 | 条件付きクラス名の結合 |
| tailwind-merge | ^3.4.0 | Tailwind クラスの重複解決（`twMerge`） |

### 1.2 開発依存パッケージ（devDependencies）

| パッケージ | バージョン | 用途 |
|---|---|---|
| vite | ^7.2.4 | ビルドツール・開発サーバー |
| @vitejs/plugin-react | ^5.1.1 | React Fast Refresh（Babel ベース） |
| tailwindcss | ^4.1.17 | CSS フレームワーク（v4、CSS-first 設定方式） |
| @tailwindcss/postcss | ^4.1.17 | Tailwind v4 の PostCSS プラグイン |
| postcss | ^8.5.6 | CSS 処理 |
| autoprefixer | ^10.4.22 | ベンダープレフィックス自動付与 |
| eslint / @eslint/js | ^9.39.1 | Lint |
| eslint-plugin-react-hooks | ^7.0.1 | React Hooks ルール |
| eslint-plugin-react-refresh | ^0.4.24 | Fast Refresh 互換性チェック |
| globals | ^16.5.0 | ESLint グローバル定義 |
| @types/react / @types/react-dom | ^19.2.5 / ^19.2.3 | 型定義（エディタ補完用。プロジェクト自体は JavaScript/JSX） |

### 1.3 npm スクリプト

```json
"scripts": {
  "dev": "vite",            // 開発サーバー起動
  "build": "vite build",    // 本番ビルド（dist/ に出力）
  "lint": "eslint .",       // Lint 実行
  "preview": "vite preview" // ビルド成果物のローカルプレビュー
}
```

### 1.4 言語・その他

- 言語: JavaScript（JSX）。TypeScript は不使用。
- `package.json` の `"type": "module"`（ESM）。
- UI 言語: 日本語。
- フォント: Google Fonts の「Zen Kaku Gothic New」（weights: 400/500/700/900）を `index.html` で読み込み。

---

## 2. ディレクトリ構成

```
create-thumbnail/
├── index.html                     # SPA エントリ HTML（日本語 lang、フォント読込、meta 設定）
├── package.json
├── vite.config.js                 # Vite 設定（react プラグインのみ、その他デフォルト）
├── tailwind.config.js             # Tailwind v3 形式の content 設定（v4 では実質未使用の互換ファイル）
├── postcss.config.js              # @tailwindcss/postcss + autoprefixer
├── eslint.config.js               # ESLint フラット設定
├── vercel.json                    # Vercel デプロイ設定（@vercel/static-build, distDir: dist）
├── .env                           # VITE_GEMINI_API_KEY を格納（Git 管理外にすべき）
├── README.md                      # Vite テンプレートの標準 README
├── DEPLOYMENT.md                  # Vercel デプロイ手順書（日本語）
├── public/
│   └── vite.svg                   # ファビコン
├── dist/                          # ビルド成果物
└── src/
    ├── main.jsx                   # エントリポイント（StrictMode + createRoot）
    ├── App.jsx                    # ルーティング定義・Provider 構成
    ├── index.css                  # Tailwind v4 テーマ定義・グローバルスタイル
    ├── App.css                    # （Vite テンプレート由来）
    ├── assets/
    │   ├── ttt_yoko.png           # ヘッダーロゴ（ttt corporation）
    │   └── react.svg
    ├── context/
    │   └── HistoryContext.jsx     # 生成履歴のグローバル状態管理（localStorage 永続化）
    ├── utils/
    │   ├── geminiApi.js           # Gemini API 呼び出し（本番用）
    │   └── mockApi.js             # モック API（picsum.photos を利用、開発用）
    ├── components/
    │   ├── Layout.jsx             # ヘッダー・ナビ・フッターの共通レイアウト
    │   ├── Button.jsx             # 汎用ボタン（variant/size/isLoading 対応）
    │   ├── Input.jsx              # ラベル・エラー付き input
    │   ├── Textarea.jsx           # ラベル・エラー付き textarea
    │   ├── Modal.jsx              # ポータル型モーダル（ESC/背景クリックで閉じる）
    │   ├── ImageUpload.jsx        # 参考画像アップロード（D&D + ファイル選択、Base64 化）
    │   └── ImageGrid.jsx          # 生成結果グリッド（ホバーで拡大/DLアクション）
    └── pages/
        ├── TopPage.jsx            # 生成画面（ルート "/"）
        └── HistoryPage.jsx        # 履歴画面（ルート "/history"）
```

---

## 3. アプリケーション構造

### 3.1 エントリポイント（`src/main.jsx`）

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- React 19 の `createRoot` API を使用。
- `StrictMode` 有効（開発時に useEffect が二重実行される点に注意）。

### 3.2 ルーティングと Provider 構成（`src/App.jsx`）

```jsx
<HistoryProvider>            {/* 履歴のグローバル状態 */}
  <Router>                   {/* BrowserRouter */}
    <Layout>                 {/* ヘッダー・フッター共通枠 */}
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Layout>
  </Router>
</HistoryProvider>
```

| パス | ページ | 内容 |
|---|---|---|
| `/` | TopPage | サムネイル生成フォームと生成結果表示 |
| `/history` | HistoryPage | 生成履歴一覧・詳細モーダル |

- `BrowserRouter` を使用しているため、静的ホスティングでは SPA フォールバック（全パス→ `index.html`）の設定が必要（統合時の注意点）。

---

## 4. 機能仕様と実装詳細

### 4.1 サムネイル生成機能（TopPage — `src/pages/TopPage.jsx`）

#### 入力項目

| 項目 | UI | state | 初期値 | 制約 |
|---|---|---|---|---|
| プロンプト | Textarea | `prompt` (string) | `''` | 空白のみの場合は生成ボタン無効（`!prompt.trim()`） |
| 参考画像 | ImageUpload | `sampleImage` (data URL string \| null) | `null` | 任意。画像ファイルを Base64 data URL 化 |
| 幅（px） | Input type=number | `width` (number) | `800` | — |
| 高さ（px） | Input type=number | `height` (number) | `600` | — |
| 生成枚数 | Input type=number | `count` (number) | `1` | HTML 属性で min=1, max=4（JS 側での強制はなし） |

#### 生成処理フロー（`handleGenerate`）

1. `prompt.trim()` が空なら即 return。
2. `isGenerating = true`、`error = null` にセット。
3. `settings = { count, width, height, sampleImage }` を組み立て、`generateImages(prompt, settings)`（`src/utils/geminiApi.js`）を await。
4. 成功時:
   - 結果を `generatedImages` にセット。
   - 1枚以上あれば `addToHistory(images)` で履歴（Context → localStorage）に追加。
   - 0枚なら日本語エラーメッセージ「画像を生成できませんでした。プロンプトを変えてもう一度お試しください。」を表示。
5. 例外時: console.error 出力後、「生成中にエラーが発生しました。時間をおいてもう一度お試しください。」を表示。
6. finally で `isGenerating = false`。

#### 生成中の UI

- ボタンは `isLoading` 状態（スピナー＋「生成中…」表示、disabled）。
- 結果エリアに `count` 枚分のスケルトン（`aspect-[4/3]` のパルスアニメーション、150ms ずつ遅延）を表示。

#### 生成結果の表示

- `ImageGrid` コンポーネントで表示（1〜4カラムのレスポンシブグリッド）。
- 画像クリック（拡大ボタン）で `window.open(img.url, '_blank')` により新規タブで開く。
- 各カードにダウンロードリンク（`<a download>`）。

#### 履歴からの再利用の受け口

- `useLocation()` で `location.state.useAsSample` を監視する `useEffect`:

```jsx
useEffect(() => {
    if (location.state?.useAsSample) {
        const { prompt: initialPrompt, url } = location.state.useAsSample;
        setPrompt(initialPrompt || '');
        setSampleImage(url);
        window.history.replaceState({}, document.title); // state をクリアして再適用を防止
    }
}, [location.state]);
```

- HistoryPage から `navigate('/', { state: { useAsSample: { prompt, url } } })` で遷移してきた際に、プロンプトと参考画像を自動セットする。

### 4.2 Gemini API 連携（`src/utils/geminiApi.js`）

#### 接続情報

```js
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;  // .env から注入
const MODEL = 'gemini-3-pro-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
```

- 認証: URL クエリパラメータ `?key=${API_KEY}` 方式。
- **注意（統合時の重要事項）**: API キーがクライアントサイド（ブラウザ）に露出する実装。ビルド成果物に埋め込まれるため、本番統合時はサーバーサイドプロキシ経由に変更することを強く推奨。

#### エクスポート関数: `generateImages(prompt, settings)`

- `settings`: `{ count, width, height, sampleImage }`
- API キー未設定の場合は `Error('API Key is missing. Please check your .env file.')` を throw。
- **複数枚生成の実装方針**: Gemini の画像生成は 1 リクエスト 1 画像想定のため、`count` 回のリクエストを**逐次実行**する（並列ではない）。理由はレート制限（HTTP 429）回避。
  - 各リクエスト間に **1000ms の待機**（`setTimeout` による delay）を挟む。
  - 個別リクエストが失敗しても catch して console.error のみ行い、**残りのリクエストは継続**する（部分成功を許容）。
- 戻り値: 画像オブジェクトの配列（後述のデータモデル参照）。

#### 内部関数: `makeGenerationRequest(prompt, settings)`

1. **parts の構築**: `[{ text: prompt }]` から開始。
2. **参考画像（Image-to-Image）**: `settings.sampleImage` が data URL（例 `data:image/jpeg;base64,...`）の場合、以下のように分解して `inlineData` パートを追加:

```js
const base64Data = settings.sampleImage.split(',')[1];
const mimeType = settings.sampleImage.split(';')[0].split(':')[1];
parts.push({ inlineData: { mimeType, data: base64Data } });
```

3. **アスペクト比の算出**: 幅・高さの比率から Gemini がサポートする 5 種のアスペクト比にマッピング:

| 比率（width/height） | アスペクト比 |
|---|---|
| ratio >= 1.7 | 16:9 |
| 1.3 <= ratio < 1.7 | 4:3 |
| 0.9 <= ratio < 1.3 | 1:1 |
| 0.7 <= ratio < 0.9 | 3:4 |
| ratio < 0.7 | 9:16 |
| width/height 未指定 | 1:1（デフォルト） |

4. **アスペクト比の指定方法**: `generationConfig` に直接指定できないため、プロンプト末尾にテキストとして付加:

```js
parts[0].text = `${prompt} --aspect_ratio ${aspectRatio}`;
```

5. **リクエストボディ**:

```js
{
  contents: [{ parts: parts }],
  generationConfig: {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  }
}
```

6. **HTTP 呼び出し**: `fetch(API_URL?key=..., { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestData) })`
7. **エラー処理**: `response.ok` でない場合、レスポンスボディ（JSON）を含めた `Error('API Error: {status} {statusText} - {body}')` を throw。
8. **レスポンス解析**: `data.candidates[0].content.parts` を走査し、`part.inlineData.data`（Base64）を持つパートごとに data URL（`data:image/jpeg;base64,...` 固定 MIME）を生成して画像オブジェクトを作成。

#### 生成される画像オブジェクト（データモデル）

```js
{
  id: Date.now() + Math.random(),   // 数値 ID（一意性は擬似的）
  url: 'data:image/jpeg;base64,...', // Base64 data URL（外部 URL ではない）
  prompt: prompt,                    // 入力プロンプト（--aspect_ratio 付加前の原文）
  width: settings.width,             // ユーザー指定の希望幅（実画像サイズとは限らない）
  height: settings.height,           // ユーザー指定の希望高さ
  createdAt: new Date().toISOString() // ISO 8601 生成日時
}
```

### 4.3 モック API（`src/utils/mockApi.js`）

- 本番の `geminiApi.js` と同一シグネチャ `generateImages(prompt, settings)` を提供。
- 2 秒の `setTimeout` 遅延後、`https://picsum.photos/{width}/{height}?random={timestamp}` の URL を `count` 枚分返す。
- import 先を差し替えるだけで API なし開発・デモが可能（現状 TopPage は `geminiApi` を import）。

### 4.4 履歴管理（`src/context/HistoryContext.jsx`）

#### 提供 API

- `HistoryProvider`: アプリ全体をラップする Provider。
- `useHistory()`: カスタムフック。Provider 外での使用時は `Error('useHistory must be used within a HistoryProvider')` を throw。
- Context 値: `{ history, addToHistory }`
  - `history`: 画像オブジェクトの配列（新しい順）。
  - `addToHistory(images)`: `setHistory(prev => [...images, ...prev])` — 新規画像群を**先頭に**追加。

#### 永続化（localStorage）

- キー: `'thumbnail_history'`
- 初期化: `useState` の初期化関数で `localStorage.getItem` → `JSON.parse`（なければ `[]`）。
- 保存: `useEffect`（依存: `history`）で変更のたびに `JSON.stringify` して保存。
- **容量超過時のフォールバック処理**: `QuotaExceededError`（または `e.code === 22`）を検知すると、配列末尾（＝最古）の 1 件を削除して再帰的に保存を再試行し、成功するまで縮小。`setHistory(newData)` で state 側も実際の保存内容に同期させる。
- **設計上の含意**: 画像は Base64 data URL で保存されるため localStorage（通常 5〜10MB）を圧迫しやすい。統合時はサーバー保存または IndexedDB への移行を検討すべき。

### 4.5 履歴ページ（`src/pages/HistoryPage.jsx`）

#### 一覧表示

- ヘッダー: 「生成履歴」タイトル＋「全 N 件」カウント。
- 履歴 0 件時: 空状態 UI（ImageOff アイコン、「まだ履歴がありません」、「生成をはじめる」ボタン → `/` へ遷移）。
- 履歴あり: 2〜5 カラムのレスポンシブグリッド（`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`）。
  - 各サムネイルは正方形（`aspect-square`）、`object-cover`、`loading="lazy"`。
  - ホバー: 枠色変化＋シャドウ＋画像 110% ズーム＋半透明オーバーレイに Maximize2 アイコン。
  - 表示アニメーション: `animate-rise` を index × 50ms（上限 10 件分 = 500ms）の遅延付きで適用。
  - クリックで詳細モーダルを開く（`selectedImage` state）。

#### 詳細モーダル

- レイアウト: モバイルは縦積み、`lg` 以上は 3 カラムグリッド（画像 2/3、詳細パネル 1/3）。
- 画像エリア: `object-contain` で全体表示。
- 詳細パネル:
  - プロンプト全文（枠付きボックス）。
  - サイズ: `{width} × {height}`（等幅フォント）。
  - 作成日: `new Date(createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })` で「2026年7月13日」形式。
- アクション（モバイルでは `sticky bottom-0` で下部固定）:
  1. **「参考画像として使う」**（secondary ボタン）: `navigate('/', { state: { useAsSample: { prompt, url } } })` — TopPage にプロンプトと画像を引き継ぐ。
  2. **「画像をダウンロード」**（primary ボタン）: `<a href={url} download={`thumbnail-${id}.jpg`} target="_blank" rel="noreferrer">` でダウンロード。

### 4.6 共通レイアウト（`src/components/Layout.jsx`）

- **ヘッダー**: `sticky top-0 z-50`、白 85% 背景＋`backdrop-blur-md`、下ボーダー。
  - 左: ロゴ画像（`src/assets/ttt_yoko.png`、「ttt corporation」、クリックで `/` へ）。
  - ナビ項目定義: `[{ path: '/', label: '生成する', icon: Wand2 }, { path: '/history', label: '履歴', icon: History }]`
  - デスクトップ（`md` 以上）: 横並びナビ。現在パス一致で `bg-azure-50 text-azure-700` のアクティブ表示。
  - モバイル: ハンバーガーボタン（Menu/X アイコン切替、`aria-label="メニューを開閉"`）で開閉するドロップダウンナビ（`isMenuOpen` state）。リンククリックで自動クローズ。
- **メイン**: `max-w-7xl` 中央寄せ、余白付き。`children` を描画。
- **フッター**: `© {現在年} ttt corporation — Powered by Gemini`（年は `new Date().getFullYear()` で動的）。

### 4.7 UI 部品

#### Button（`src/components/Button.jsx`）

- Props: `children, className, variant='primary', size='md', isLoading=false, disabled, ...props`
- variant 4 種:
  - `primary`: `bg-azure-600 hover:bg-azure-700 text-white shadow-lg shadow-azure-600/25`
  - `secondary`: `bg-azure-50 hover:bg-azure-100 text-azure-700 border border-azure-200`
  - `outline`: 透明背景＋スレートボーダー、ホバーで azure 化
  - `ghost`: 透明背景、ホバーで `bg-slate-100`
- size 3 種: `sm`（px-3 py-1.5 text-sm）/ `md`（px-5 py-2.5 text-base）/ `lg`（px-7 py-3.5 text-lg）
- `isLoading=true` で Loader2 スピナー表示＋自動 disabled。
- 共通: `rounded-lg`、`active:scale-[0.98]` の押下アニメーション、`focus-visible:ring-2`、`disabled:opacity-40`。
- クラス結合: `twMerge(clsx(...))` の `cn()` ヘルパー（各コンポーネントにローカル定義、共通化はされていない）。

#### Input（`src/components/Input.jsx`）/ Textarea（`src/components/Textarea.jsx`）

- Props: `label, className, error, ...props`（ネイティブ属性は全てパススルー）。
- ラベル（任意）＋フィールド＋エラーメッセージ（任意、赤字 xs）の縦構成。
- フォーカス時: `ring-2 ring-azure-500/30 border-azure-500`。
- エラー時: 赤ボーダー・赤リング。
- Input は高さ `h-11` 固定、Textarea は `min-h-[120px]` で `resize-y` 可。

#### Modal（`src/components/Modal.jsx`）

- Props: `isOpen, onClose, children`
- `createPortal` で `document.body` 直下にレンダリング。
- `isOpen` 中は `document.body.style.overflow = 'hidden'` で背景スクロールロック（クリーンアップで解除）。
- Escape キーで `onClose`（`window` の keydown リスナー、`isOpen` 時のみ登録）。
- 背景（`bg-slate-900/50 backdrop-blur-sm`）クリックで閉じる（透明な全面レイヤーの onClick）。
- 右上に閉じるボタン（`aria-label="閉じる"`）。
- コンテンツ: `max-w-5xl`、`max-h-[90vh]`、内部スクロール。

#### ImageUpload（`src/components/ImageUpload.jsx`）

- Props: `label, onChange, value, className`（制御コンポーネント。`value` は data URL または null）。
- **未選択時**: 破線ボーダーのドロップゾーン。
  - クリック → 非表示の `<input type="file" accept="image/*">` を `ref` 経由で起動。
  - ドラッグ＆ドロップ対応: `dragover`/`dragleave`/`drop` をハンドリング、`isDragging` state でハイライト（azure 系に変化）。
  - ドロップ時は `file.type.startsWith('image/')` で画像のみ受け付け。
  - 案内テキスト: 「クリックして選択、またはドラッグ＆ドロップ」「PNG・JPG・WEBP に対応」。
- **ファイル処理**: `FileReader.readAsDataURL(file)` → 結果の data URL を `onChange` に渡す（サイズ制限・圧縮なし）。
- **選択済み時**: `aspect-video` のプレビュー（最大幅 xs）＋ホバーで現れる削除ボタン（`onChange(null)` ＋ input 値クリア、`aria-label="参考画像を削除"`）。

#### ImageGrid（`src/components/ImageGrid.jsx`）

- Props: `images, onImageClick`。`images` が空/未定義なら null を返す。
- グリッド: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`。
- カード: `aspect-[4/3]`、`object-cover`、`loading="lazy"`、ホバーで浮上（`-translate-y-0.5`）＋画像 105% ズーム。
- ホバーオーバーレイ（下から上のグラデーション）:
  - プロンプト（`line-clamp-2`、白字）。
  - 「拡大」ボタン → `onImageClick(image)`。
  - ダウンロードリンク → `<a download={`thumbnail-${id}.jpg`} target="_blank" rel="noreferrer">`、`e.stopPropagation()` でカードクリックと分離。
- 出現アニメーション: `animate-rise` を index × 70ms 遅延で適用。

---

## 5. デザインシステム（`src/index.css` — Tailwind v4 `@theme`）

### 5.1 カスタムテーマトークン

Tailwind CSS v4 の CSS-first 設定（`@import "tailwindcss"` + `@theme` ブロック）を採用。`tailwind.config.js` は content 指定のみの互換ファイル。

**フォント**:

```css
--font-sans:    "Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
--font-display: "Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
```

**カラーパレット（カスタム 2 系統 + 標準 slate）**:

| トークン | 値 | 役割 |
|---|---|---|
| azure-700 | #1652c4 | 藍（メイン青）— ボタンホバー |
| azure-600 | #1e63e0 | プライマリボタン・アクセント |
| azure-500 | #3577ee | フォーカスリング等 |
| azure-400 | #5f96f4 | ホバーボーダー等 |
| azure-300 | #93b9f8 | |
| azure-200 | #c3d8fb | |
| azure-100 | #e3edfd | |
| azure-50 | #f2f7fe | アクティブナビ背景・secondary ボタン |
| leaf-700 | #12784e | 若葉（アクセント緑） |
| leaf-600 | #17925f | ヒーローの英字ラベル |
| leaf-500 | #1fae72 | 見出し横のアクセントバー |
| leaf-400 | #4cc492 | |
| leaf-100 | #ddf5ea | |
| leaf-50 | #effaf5 | |

**アニメーション**:

```css
--animate-rise: rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;  /* 下から18px フェードイン */
--animate-fade: fade 0.5s ease both;                              /* フェードイン */

@keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
```

### 5.2 グローバルスタイル

- `color-scheme: light`（ライトモード固定）。
- body 背景: `#fdfdfd` ベースに、右上に青系・左下に緑系の淡いラジアルグラデーション 2 枚（`background-attachment: fixed`）。
- **和紙風ノイズテクスチャ**: `body::after` に SVG `feTurbulence`（fractalNoise, baseFrequency 0.9）の data URI を `opacity: 0.022`、`z-index: 9999`、`pointer-events: none` で全画面固定重ね。
- テキスト選択色: azure-600 背景 × 淡青文字。
- カスタムスクロールバー: 幅/高さ 8px、slate-300 サム（ホバーで slate-400）、角丸 4px。
- フォントレンダリング: `optimizeLegibility`、`-webkit-font-smoothing: antialiased`。

---

## 6. 環境変数

| 変数名 | 定義場所 | 用途 |
|---|---|---|
| `VITE_GEMINI_API_KEY` | `.env`（プロジェクトルート） | Gemini API の API キー。`import.meta.env.VITE_GEMINI_API_KEY` で参照。`VITE_` プレフィックスのためビルド時にクライアントバンドルへ埋め込まれる |

- 未設定時は生成実行時に `'API Key is missing. Please check your .env file.'` エラー。
- Vercel では Settings → Environment Variables で設定。

---

## 7. ビルド・デプロイ

### 7.1 ビルド設定

- `vite.config.js`: `@vitejs/plugin-react` のみ。base パス・alias 等のカスタマイズなし。
- `postcss.config.js`: `@tailwindcss/postcss` + `autoprefixer`。
- 出力: `dist/`。

### 7.2 Vercel デプロイ（`vercel.json` / `DEPLOYMENT.md`）

```json
{
  "version": 2,
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ]
}
```

- Framework Preset: Vite / Build Command: `npm run build` / Output Directory: `dist`。
- GitHub 連携で push → 自動再デプロイ。
- `DEPLOYMENT.md` に日本語の手順書（リポジトリ作成 → Vercel インポート → 確認 → トラブルシューティング）あり。

---

## 8. データフロー全体図

```
[TopPage 入力フォーム]
  prompt / sampleImage(Base64) / width / height / count
        │  handleGenerate()
        ▼
[geminiApi.generateImages(prompt, settings)]
  count 回ループ（逐次・各回 1000ms 間隔・個別失敗は継続）
        │  makeGenerationRequest()
        ▼
[Gemini API  POST /v1beta/models/gemini-3-pro-image-preview:generateContent?key=KEY]
  contents.parts = [ text(prompt + " --aspect_ratio X:Y"), inlineData(参考画像)? ]
  generationConfig = { temperature:1.0, topP:0.95, topK:40, maxOutputTokens:8192 }
        │  candidates[0].content.parts[].inlineData.data (Base64)
        ▼
[画像オブジェクト配列]  { id, url(data URL), prompt, width, height, createdAt }
        ├──▶ TopPage の generatedImages state → ImageGrid 表示
        └──▶ HistoryContext.addToHistory() → history state（先頭追加）
                    │ useEffect
                    ▼
              localStorage['thumbnail_history']（JSON、容量超過時は最古から削除）
                    │
                    ▼
[HistoryPage]  一覧グリッド → Modal 詳細
    ├─ ダウンロード（<a download>）
    └─ 「参考画像として使う」 → navigate('/', { state: { useAsSample: { prompt, url } } })
                                      → TopPage useEffect で prompt/sampleImage に復元
```

---

## 9. 他システム統合時の留意点

本ツールを採用システム等へ統合する際に把握しておくべき、現実装の特性・制約:

1. **API キーのクライアント露出**: `VITE_GEMINI_API_KEY` はバンドルに埋め込まれブラウザから閲覧可能。統合時はバックエンド経由（プロキシ API）での呼び出しに変更することを強く推奨。
2. **認証・ユーザー管理なし**: ログイン機構は存在しない。履歴はブラウザ（端末）単位の localStorage 保存で、ユーザー間共有・サーバー同期は不可。
3. **ストレージ制約**: 生成画像は Base64 data URL のまま localStorage に保存されるため、数枚〜十数枚で容量上限（5〜10MB）に達し、古い履歴から自動削除される。統合時は DB/オブジェクトストレージ保存への置き換えが必要。
4. **画像サイズの扱い**: width/height 入力は実際のピクセルサイズ指定ではなく、5 種のアスペクト比（16:9 / 4:3 / 1:1 / 3:4 / 9:16）への丸めにのみ使用される。履歴に記録される width/height はユーザーの希望値であり実画像サイズを保証しない。
5. **アスペクト比指定はプロンプト埋め込み**: `--aspect_ratio` をプロンプト文字列に付加する方式で、API の generationConfig によるサイズ制御は行っていない。モデル仕様変更の影響を受けやすい。
6. **レート制御**: 複数枚生成は 1 秒間隔の逐次実行のみ。リトライ・指数バックオフは未実装。429 発生時は該当リクエストが黙って欠落する（部分成功）。
7. **バリデーション**: 生成枚数の min/max は HTML 属性のみで JS 側の強制なし。参考画像のファイルサイズ上限・圧縮処理なし（巨大画像はリクエスト肥大の原因になる）。
8. **SPA ルーティング**: BrowserRouter 使用のため、ホスティング側で `/history` 等への直接アクセスを `index.html` にフォールバックさせる設定が必要（現行の vercel.json には明示の rewrites 設定はない）。
9. **モック API**: `src/utils/mockApi.js` を import 差し替えするだけで API キーなしのデモ動作が可能（同一インターフェース）。
10. **削除機能なし**: 履歴の個別削除・全削除の UI は未実装（容量超過時の自動削除のみ）。
11. **国際化なし**: UI 文言は日本語ハードコード。
12. **テストなし**: 単体・E2E テストは存在しない。Lint（ESLint）のみ。
13. **ブランディング**: ヘッダーロゴ（`src/assets/ttt_yoko.png`）とフッター表記「ttt corporation — Powered by Gemini」がハードコードされている。
14. **`cn()` ヘルパーの重複**: `twMerge(clsx())` ヘルパーが Button/Input/Textarea/ImageUpload の各ファイルにローカル定義されている（共通ユーティリティ化されていない）。

---

## 10. 主要インターフェース一覧（統合用リファレンス）

### 画像生成関数

```js
// src/utils/geminiApi.js
generateImages(prompt: string, settings: {
  count: number,        // 生成枚数（逐次リクエスト回数）
  width: number,        // 希望幅 px（アスペクト比算出に使用）
  height: number,       // 希望高さ px
  sampleImage: string | null  // 参考画像の data URL（任意）
}): Promise<Array<{
  id: number,
  url: string,          // data:image/jpeg;base64,...
  prompt: string,
  width: number,
  height: number,
  createdAt: string     // ISO 8601
}>>
```

### 履歴 Context

```js
// src/context/HistoryContext.jsx
const { history, addToHistory } = useHistory();
// history: 画像オブジェクト配列（新しい順）
// addToHistory(images: 画像オブジェクト[]): 先頭に追加し localStorage に永続化
// localStorage キー: 'thumbnail_history'
```

### ページ間連携（参考画像の引き継ぎ）

```js
// HistoryPage → TopPage
navigate('/', { state: { useAsSample: { prompt: string, url: string } } });
```
