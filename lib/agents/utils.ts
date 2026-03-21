/**
 * JSON文字列値内のリテラル制御文字をエスケープシーケンスに変換する。
 * Claude が JSON の文字列値内に生の改行・タブを出力する場合の対策。
 */
function sanitizeJSONString(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) { result += `\\u${code.toString(16).padStart(4, "0")}`; continue; }
    }

    result += ch;
  }

  return result;
}

/**
 * JSON.parse エラーからエラー位置を抽出する。
 */
function getErrorPosition(error: unknown): number | null {
  if (!(error instanceof SyntaxError)) return null;
  const msg = error.message;
  // "at position 577" パターン
  const match = msg.match(/at position (\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * エラー位置を元にJSON文字列を反復的に修復する。
 * - 文字列内のエスケープされていない " を \" に変換
 * - 不足しているカンマの挿入
 * 最大 maxAttempts 回試行。
 */
function iterativeJSONFix(text: string, maxAttempts: number = 10): string | null {
  let current = text;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      JSON.parse(current);
      return current;
    } catch (e) {
      const pos = getErrorPosition(e);
      if (pos === null || pos >= current.length) return null;

      const msg = (e as SyntaxError).message;

      // Case 1: "Expected ',' or ']'" — 配列要素間のカンマ不足 or 文字列内の未エスケープ引用符
      if (msg.includes("Expected ','") || msg.includes("Expected '}'")) {
        // pos の手前を遡って、文字列内の未エスケープ引用符を探す
        // pos 付近で " が閉じてしまい、次の文字が構造的でない場合→引用符をエスケープ
        const lookBack = current.slice(Math.max(0, pos - 50), pos);
        const lookForward = current.slice(pos, pos + 5);

        // 直前に " があり、その前が文字列の内容っぽい場合 → 引用符のエスケープミス
        // パターン: ..."text"more text"... → ..."text\"more text"...
        // pos の位置にいるのは " の直後の文字
        // 戻って最後の " を探し、それがエスケープミスか判定
        const lastQuote = lookBack.lastIndexOf('"');
        if (lastQuote >= 0) {
          const absQuotePos = Math.max(0, pos - 50) + lastQuote;
          // この " の前後をチェック: 前が \ でなく、その前も文字列の中身なら → エスケープ
          if (absQuotePos > 0 && current[absQuotePos - 1] !== "\\") {
            current = current.slice(0, absQuotePos) + '\\"' + current.slice(absQuotePos + 1);
            continue;
          }
        }

        // " の直後に " が来ている（カンマ不足） → カンマを挿入
        if (lookForward.match(/^\s*"/)) {
          current = current.slice(0, pos) + "," + current.slice(pos);
          continue;
        }
      }

      // Case 2: "Bad control character" — 制御文字
      if (msg.includes("Bad control character") || msg.includes("control")) {
        const ch = current[pos];
        if (ch && ch.charCodeAt(0) < 0x20) {
          const escaped = ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : ch === "\t" ? "\\t"
            : `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
          current = current.slice(0, pos) + escaped + current.slice(pos + 1);
          continue;
        }
      }

      // Case 3: "Unexpected token" — 予期しない文字。前後の文脈で判断
      if (msg.includes("Unexpected token")) {
        // 文字列値内でなければスキップ
        // 前の未閉じ " を探して、閉じが不足しているなら " を挿入
        const before = current.slice(0, pos);
        const quoteCount = (before.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 === 1) {
          // 奇数 = 文字列の途中 → pos で " を閉じて修正
          current = current.slice(0, pos) + '"' + current.slice(pos);
          continue;
        }
      }

      // 修正できなかった
      return null;
    }
  }

  // ループ完了（すべての試行で修正できた場合は上で return している）
  try {
    JSON.parse(current);
    return current;
  } catch {
    return null;
  }
}

/**
 * JSON.parse のラッパー。直接 → サニタイズ → 反復修復 の3段階で試行。
 */
function tryParseJSON<T>(text: string, label: string): T | null {
  // 1. そのまま parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // 2. サニタイズしてリトライ
    try {
      const sanitized = sanitizeJSONString(text);
      return JSON.parse(sanitized) as T;
    } catch {
      // 3. 反復修復
      const fixed = iterativeJSONFix(text);
      if (fixed) {
        try {
          return JSON.parse(fixed) as T;
        } catch (e3) {
          console.warn(`[${label}] JSON.parse failed after iterative fix: ${(e3 as Error).message}`);
          return null;
        }
      }

      // 4. サニタイズ後に反復修復
      const sanitized = sanitizeJSONString(text);
      const fixedSanitized = iterativeJSONFix(sanitized);
      if (fixedSanitized) {
        try {
          return JSON.parse(fixedSanitized) as T;
        } catch (e4) {
          console.warn(`[${label}] JSON.parse failed after sanitize+fix: ${(e4 as Error).message}`);
          return null;
        }
      }

      console.warn(`[${label}] All JSON parse strategies failed`);
      return null;
    }
  }
}

/**
 * max_tokens で途中切断されたJSONを修復する。
 */
function repairTruncatedJSON(partial: string): string | null {
  let json = partial.replace(/,\s*$/, "");

  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    if (escaped) { escaped = false; continue; }
    if (json[i] === "\\") { escaped = true; continue; }
    if (json[i] === '"') { inString = !inString; }
  }
  if (inString) { json += '"'; }

  json = json.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  json = json.replace(/,\s*$/, "");

  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < json.length; i++) {
    if (escaped) { escaped = false; continue; }
    if (json[i] === "\\") { escaped = true; continue; }
    if (json[i] === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (json[i] === "{") stack.push("}");
    else if (json[i] === "[") stack.push("]");
    else if (json[i] === "}" || json[i] === "]") stack.pop();
  }

  while (stack.length > 0) { json += stack.pop(); }

  // tryParseJSON がバリデーション + 修復を行うので、ここでは構造修復のみ
  return json;
}

/**
 * Claude レスポンステキストからJSONを堅牢に抽出するユーティリティ
 *
 * 対応パターン:
 *   1. ```json ... ``` マークダウンコードブロック
 *   2. ``` ... ``` 汎用コードブロック
 *   3. 裸のJSONオブジェクト { ... }
 *   4. 途中切断されたJSONの修復
 *
 * 各段階で JSON.parse → サニタイズ → 反復修復 の多段フォールバック。
 */
export function extractJSON<T>(text: string, agentName: string): T {
  // 1. ```json ... ``` ブロック
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    const result = tryParseJSON<T>(jsonBlockMatch[1].trim(), `${agentName}/json-block`);
    if (result !== null) return result;
  }

  // 2. ``` ... ``` 汎用ブロック
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const result = tryParseJSON<T>(codeBlockMatch[1].trim(), `${agentName}/code-block`);
    if (result !== null) return result;
  }

  // 3. 最初の { から最後の } までを貪欲マッチ
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    const result = tryParseJSON<T>(candidate, `${agentName}/brace-match`);
    if (result !== null) return result;
  }

  // 4. 切れたJSONの修復を試行
  if (start !== -1) {
    const partial = text.slice(start);
    const repaired = repairTruncatedJSON(partial);
    if (repaired) {
      const result = tryParseJSON<T>(repaired, `${agentName}/repaired`);
      if (result !== null) return result;
    }
  }

  console.error(`[${agentName}] Failed to extract JSON. Raw response (first 300 chars):\n${text.slice(0, 300)}`);
  console.error(`[${agentName}] Raw response (last 300 chars):\n${text.slice(-300)}`);
  throw new Error(`Could not parse JSON from ${agentName} response`);
}
