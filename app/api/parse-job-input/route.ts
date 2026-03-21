import { NextRequest, NextResponse } from "next/server";
import { anthropic, DEFAULT_MODEL } from "@/lib/claude";

const SYSTEM_PROMPT = `あなたは求人情報の構造化解析エキスパートです。
ユーザーから提供されたテキスト、ファイル、またはWebページの内容から、求人に関する情報をできる限り多く・正確に抽出し、以下のJSON形式に変換してください。

出力するJSONの形式:
{
  "companyName": "会社名（法人格含む）",
  "industry": "業種（介護・福祉、IT、飲食、医療、建設、製造、小売、物流、教育 など）",
  "companyDescription": "会社の説明・特徴・事業内容",
  "jobTitle": "職種名（例: 介護職、看護師、Webエンジニア）",
  "employmentType": "正社員 | パート・アルバイト | 契約社員 | 派遣社員 | 業務委託 | インターン",
  "numberOfHires": 数値または null,
  "prefecture": "都道府県（正式名称。例: 東京都、大阪府、北海道）",
  "city": "市区町村（例: 世田谷区、大阪市北区）",
  "address": "番地・建物名",
  "nearestStation": "最寄り駅",
  "accessFromStation": "駅からのアクセス（例: 〇〇駅から徒歩5分）",
  "salaryMin": 数値（下限給与。円単位。例: 月給25万→250000、時給1200円→1200）,
  "salaryMax": 数値または null（上限給与。円単位）,
  "salaryType": "時給 | 日給 | 月給 | 年収",
  "salaryDescription": "給与補足（昇給、賞与、手当の情報など）",
  "workingHours": "勤務時間（例: 9:00〜18:00）",
  "workingHoursDescription": "勤務時間補足（シフト制、フレックスなど）",
  "jobDescription": "仕事内容（できるだけ詳細に。元テキストの情報をそのまま活かす）",
  "requirements": "応募要件・必須条件（資格、経験など）",
  "welcomeRequirements": "歓迎要件（あれば望ましい経験・スキル）",
  "holidays": "休暇・休日（週休2日制、年間休日数など）",
  "benefits": "待遇・福利厚生（手当、退職金、研修制度、社宅など）",
  "socialInsurance": ["雇用保険", "労災保険", "健康保険", "厚生年金"] のうち該当するもの,
  "probationPeriod": "試用期間（例: 3ヶ月）",
  "selectionProcess": "選考の流れ（例: 応募→書類選考→面接→内定）",
  "appealPoints": "この求人の魅力・アピールポイント",
  "targetAudience": "ターゲット層",
  "competitiveAdvantage": "競合と比べた強み・差別化ポイント"
}

重要ルール:
- Webページの内容が提供された場合、ナビゲーション・フッター・広告・関連求人リンクなどのノイズは無視し、メインの求人情報のみを抽出してください。
- 求人ページには「給与」「仕事内容」「勤務地」「応募資格」「待遇」などのセクションが含まれます。これらを正確に対応するフィールドにマッピングしてください。
- 給与は必ず数値に変換してください:
  - "月給250,000円〜300,000円" → salaryType:"月給", salaryMin:250000, salaryMax:300000
  - "時給1,200円以上" → salaryType:"時給", salaryMin:1200, salaryMax:null
  - "年収400万〜500万" → salaryType:"年収", salaryMin:4000000, salaryMax:5000000
  - "日給10,000円" → salaryType:"日給", salaryMin:10000
- 都道府県名は必ず正式名称にしてください（東京→東京都、大阪→大阪府、京都→京都府、北海道はそのまま）
- socialInsuranceは配列で返してください。「社会保険完備」「各種社会保険」と書かれていたら4種すべて含めてください
- employmentTypeは必ず指定の6種（正社員/パート・アルバイト/契約社員/派遣社員/業務委託/インターン）のいずれかにマッピングしてください
- 不明なフィールドはnullにしてください。推測はしないでください。
- jobDescriptionとrequirementsは特に重要です。元テキストから詳細に抽出してください。
- 必ず有効なJSONのみを出力してください。説明文や前置きは一切不要です。`;

function parseHtmlToText(html: string): string {
  let text = html;

  // script / style / noscript / iframe / svg を除去
  text = text.replace(/<(script|style|noscript|iframe|svg)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // headを丸ごと除去
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // JSON-LD（構造化データ）を抽出して先頭に追加
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  let jsonLdText = "";
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      const content = match.replace(/<\/?script[^>]*>/gi, "").trim();
      if (content.includes("JobPosting") || content.includes("jobTitle") || content.includes("hiringOrganization") || content.includes("salary") || content.includes("description")) {
        jsonLdText += `\n【構造化データ(JSON-LD)】\n${content}\n`;
      }
    }
  }

  // meta description / og:description を抽出
  let metaDesc = "";
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaMatch) metaDesc = metaMatch[1];
  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch && ogMatch[1].length > metaDesc.length) metaDesc = ogMatch[1];

  // テーブルを "ラベル: 値" 形式に変換
  text = text.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row: string) => {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    if (cells.length >= 2) {
      const label = cells[0][1].replace(/<[^>]+>/g, "").trim();
      const value = cells[1][1].replace(/<[^>]+>/g, "").trim();
      if (label && value) return `${label}: ${value}\n`;
    }
    return cells.map((c) => c[1].replace(/<[^>]+>/g, "").trim()).join(" ") + "\n";
  });

  // dl > dt/dd を "ラベル: 値" 形式に変換
  text = text.replace(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi, (_, dt: string, dd: string) => {
    const label = dt.replace(/<[^>]+>/g, "").trim();
    const value = dd.replace(/<[^>]+>/g, "").trim();
    return `${label}: ${value}\n`;
  });

  // h1〜h6 をセクション見出しとして保持
  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, _n: string, content: string) => {
    return `\n【${content.replace(/<[^>]+>/g, "").trim()}】\n`;
  });

  // li をハイフン付きリストに
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content: string) => {
    return `- ${content.replace(/<[^>]+>/g, "").trim()}\n`;
  });

  // br / p / div を改行に
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|section|article|header|footer)>/gi, "\n");

  // 残りのHTMLタグを除去
  text = text.replace(/<[^>]+>/g, " ");

  // HTMLエンティティをデコード
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n)))
    .replace(/&[a-zA-Z]+;/g, " ");

  // 連続空白・空行を圧縮
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.trim();

  // 組み立て
  let result = "";
  if (metaDesc) result += `【ページ概要】${metaDesc}\n\n`;
  if (jsonLdText) result += jsonLdText + "\n";
  result += text;

  return result;
}

// 求人情報の有用なコンテンツが含まれているか簡易チェック
function hasJobContent(text: string): boolean {
  const keywords = ["給与", "月給", "時給", "年収", "仕事内容", "勤務地", "応募", "職種", "雇用形態", "勤務時間", "休日", "福利厚生", "salary", "jobTitle", "description"];
  let matches = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) matches++;
  }
  return matches >= 2;
}

async function fetchUrlContent(url: string): Promise<{ content: string; method: string }> {
  // 方法1: Jina Reader API (URLをMarkdownに変換する無料サービス)
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(jinaUrl, {
        signal: controller.signal,
        headers: {
          "Accept": "text/plain",
          "X-Return-Format": "text",
        },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        if (text.length > 200 && hasJobContent(text)) {
          console.log(`[parse-job-input] Jina Reader success for ${url}: ${text.length} chars`);
          return { content: text.slice(0, 50000), method: "jina" };
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.log(`[parse-job-input] Jina Reader failed for ${url}:`, err instanceof Error ? err.message : err);
  }

  // 方法2: 直接fetch
  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: controller2.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
    });

    const html = await res.text();
    const parsed = parseHtmlToText(html);

    if (parsed.length > 200 && hasJobContent(parsed)) {
      console.log(`[parse-job-input] Direct fetch success for ${url}: ${parsed.length} chars`);
      return { content: parsed.slice(0, 50000), method: "direct" };
    }

    // コンテンツはあるがbot blockされた可能性
    if (res.status === 403 || !hasJobContent(parsed)) {
      throw new Error(`BLOCKED: HTTP ${res.status}, content has no job info (${parsed.length} chars)`);
    }

    return { content: parsed.slice(0, 50000), method: "direct" };
  } finally {
    clearTimeout(timeout2);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, fileContents, urls } = body as {
      text?: string;
      fileContents?: { type: "text" | "image" | "pdf"; content: string; mimeType?: string; name?: string }[];
      urls?: string[];
    };

    if (!text && (!fileContents || fileContents.length === 0) && (!urls || urls.length === 0)) {
      return NextResponse.json({ error: "テキスト、ファイル、またはURLを入力してください" }, { status: 400 });
    }

    // Fetch URL contents
    const urlContents: string[] = [];
    const failedUrls: string[] = [];
    if (urls && urls.length > 0) {
      for (const url of urls.slice(0, 5)) { // max 5 URLs
        try {
          const { content, method } = await fetchUrlContent(url);
          console.log(`[parse-job-input] URL fetched via ${method}: ${url} (${content.length} chars)`);
          urlContents.push(`【参考URL: ${url} から取得した求人ページの内容】\n${content}`);
        } catch (err) {
          console.error(`[parse-job-input] Failed to fetch ${url}:`, err);
          failedUrls.push(url);
        }
      }
    }

    // URL全て失敗 かつ 他の入力もない場合
    if (failedUrls.length > 0 && urlContents.length === 0 && !text && (!fileContents || fileContents.length === 0)) {
      return NextResponse.json({
        error: `URLからの情報取得に失敗しました（${failedUrls.join(", ")}）。\nIndeed等の求人サイトはアクセスをブロックしている場合があります。\n\n【代替方法】求人ページをブラウザで開き、ページ全体の内容をコピー（Ctrl+A → Ctrl+C）してテキスト欄に貼り付けてください。`,
      }, { status: 422 });
    }

    // 一部URL失敗の場合、警告を追加
    if (failedUrls.length > 0 && urlContents.length > 0) {
      console.warn(`[parse-job-input] Some URLs failed: ${failedUrls.join(", ")}`);
    }

    // Build message content
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    // Add file contents (images as base64, PDFs as document type)
    if (fileContents) {
      for (const file of fileContents) {
        if (file.type === "pdf") {
          content.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: file.content,
            },
          });
          content.push({
            type: "text",
            text: `上記はアップロードされたPDFファイル（${file.name || "求人票"}）の内容です。このPDFに含まれるすべての求人情報を漏れなく抽出してください。`,
          });
        } else if (file.type === "image" && file.mimeType) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: file.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: file.content,
            },
          });
        } else if (file.type === "text") {
          content.push({
            type: "text",
            text: `【アップロードされたファイルの内容】\n${file.content}`,
          });
        }
      }
    }

    // Add URL contents
    for (const urlContent of urlContents) {
      content.push({
        type: "text",
        text: urlContent,
      });
    }

    // Add user text
    if (text) {
      content.push({
        type: "text",
        text: `【ユーザー入力テキスト】\n${text}`,
      });
    }

    content.push({
      type: "text",
      text: "上記の情報から求人データを抽出し、指定のJSON形式で出力してください。",
    });

    // ログ: Claudeに送るテキスト量を確認
    const totalTextLength = content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .reduce((sum, c) => sum + c.text.length, 0);
    console.log(`[parse-job-input] Sending to Claude: ${content.length} blocks, ~${totalTextLength} text chars`);

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const responseText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    console.log(`[parse-job-input] Claude response (${responseText.length} chars):`, responseText.slice(0, 500));

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[parse-job-input] No JSON found in response:", responseText);
      return NextResponse.json({ error: "解析結果の取得に失敗しました" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Clean null values
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && value !== undefined && value !== "") {
        cleaned[key] = value;
      }
    }

    console.log(`[parse-job-input] Parsed fields:`, Object.keys(cleaned).join(", "));

    return NextResponse.json({ common: cleaned });
  } catch (error) {
    console.error("[parse-job-input] Error:", error);
    return NextResponse.json({ error: "解析中にエラーが発生しました" }, { status: 500 });
  }
}

// Type import for Anthropic
import type Anthropic from "@anthropic-ai/sdk";
