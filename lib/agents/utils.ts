/**
 * Claude レスポンステキストからJSONを堅牢に抽出するユーティリティ
 *
 * 対応パターン:
 *   1. ```json ... ``` マークダウンコードブロック
 *   2. ``` ... ``` 汎用コードブロック
 *   3. 裸のJSONオブジェクト { ... }
 */
export function extractJSON<T>(text: string, agentName: string): T {
  // 1. ```json ... ``` ブロック
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim()) as T;
    } catch {
      // fall through
    }
  }

  // 2. ``` ... ``` 汎用ブロック
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // fall through
    }
  }

  // 3. 最初の { から最後の } までを貪欲マッチ
  //    ネストを考慮して最外殻を正確に取り出す
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // fall through
    }
  }

  console.error(`[${agentName}] Failed to extract JSON. Raw response:\n${text}`);
  throw new Error(`Could not parse JSON from ${agentName} response`);
}
