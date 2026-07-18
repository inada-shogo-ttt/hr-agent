import { AsyncLocalStorage } from "node:async_hooks";

// 生成1回あたりの API 利用実費(Claude + gpt-image-2)を集計するトラッカー。
// ルートの処理冒頭で startCostTracking() を呼ぶと、その非同期コンテキスト内の
// API 呼び出し(lib/claude.ts の anthropic クライアント / lib/nanobanana.ts の画像生成)が
// 自動で加算される。コンテキスト外の呼び出しは何もしない(記録失敗が生成を止めることもない)。

// ---- 料金表(USD)。改定時はここを更新する ----
// Anthropic (per MTok): https://platform.claude.com/docs/en/pricing
const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};
const DEFAULT_CLAUDE_PRICING = { input: 5, output: 25 };
// プロンプトキャッシュ: 読取 = input単価×0.1 / 書込(5分TTL) = input単価×1.25
const CACHE_READ_RATE = 0.1;
const CACHE_WRITE_RATE = 1.25;
// Web検索ツール: $10 / 1,000回(トークン分は usage 側で加算される)
const WEB_SEARCH_COST_USD = 10 / 1000;
// gpt-image-2 はトークン従量のため1枚あたりの概算値(デフォルト品質・1024px級)。
// 環境変数 IMAGE_COST_USD で調整可
const IMAGE_COST_USD = Number(process.env.IMAGE_COST_USD || 0.19);
// 円換算レート。環境変数 USDJPY_RATE で調整可
const USD_JPY = Number(process.env.USDJPY_RATE || 150);

interface CostAccumulator {
  costUsd: number;
}

const storage = new AsyncLocalStorage<CostAccumulator>();

// 現在の非同期コンテキストにコスト集計を開始する(リクエストごとに独立)
export function startCostTracking(): void {
  storage.enterWith({ costUsd: 0 });
}

// 集計中の合計を円で返す(小数1桁)。集計コンテキスト外なら null
export function getTrackedCostYen(): number | null {
  const acc = storage.getStore();
  if (!acc) return null;
  return Math.round(acc.costUsd * USD_JPY * 10) / 10;
}

interface ClaudeUsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

function lookupPricing(model: string): { input: number; output: number } {
  for (const [prefix, pricing] of Object.entries(CLAUDE_PRICING)) {
    if (model.startsWith(prefix)) return pricing;
  }
  return DEFAULT_CLAUDE_PRICING;
}

export function recordClaudeUsage(model: string, usage: ClaudeUsageLike | null | undefined): void {
  const acc = storage.getStore();
  if (!acc || !usage) return;

  const pricing = lookupPricing(model);
  let costUsd =
    ((usage.input_tokens ?? 0) / 1e6) * pricing.input +
    ((usage.output_tokens ?? 0) / 1e6) * pricing.output +
    ((usage.cache_creation_input_tokens ?? 0) / 1e6) * pricing.input * CACHE_WRITE_RATE +
    ((usage.cache_read_input_tokens ?? 0) / 1e6) * pricing.input * CACHE_READ_RATE;
  costUsd += (usage.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_COST_USD;

  acc.costUsd += costUsd;
}

export function recordImageUsage(count: number): void {
  const acc = storage.getStore();
  if (!acc || count <= 0) return;
  acc.costUsd += count * IMAGE_COST_USD;
}
