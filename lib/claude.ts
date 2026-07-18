import Anthropic from "@anthropic-ai/sdk";
import { recordClaudeUsage } from "@/lib/api-cost";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// messages.create をラップし、レスポンスの usage を API コスト集計(lib/api-cost.ts)へ記録する。
// 集計コンテキスト外(startCostTracking を呼んでいないルート)では recordClaudeUsage が no-op
const originalCreate = client.messages.create.bind(client.messages);
client.messages.create = ((...args: Parameters<typeof originalCreate>) => {
  const result = originalCreate(...args);
  return (result as Promise<unknown>).then((response) => {
    try {
      const message = response as {
        model?: string;
        usage?: Parameters<typeof recordClaudeUsage>[1];
      };
      if (message?.usage) {
        const model = String(message.model || (args[0] as { model?: string })?.model || "");
        recordClaudeUsage(model, message.usage);
      }
    } catch {
      // コスト記録の失敗で API 呼び出しを壊さない
    }
    return response;
  });
}) as typeof client.messages.create;

export const anthropic = client;

export const DEFAULT_MODEL = "claude-opus-4-6";
export const FAST_MODEL = "claude-sonnet-4-6";
export const LIGHT_MODEL = "claude-haiku-4-5-20251001";
