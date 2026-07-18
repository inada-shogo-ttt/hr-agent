import { NextRequest, NextResponse } from "next/server";
import { anthropic, FAST_MODEL } from "@/lib/claude";
import { extractJSON } from "@/lib/agents/utils";
import { PLATFORM_FIELDS } from "@/lib/platform-fields";
import { requireRole } from "@/lib/auth-guard";

export const maxDuration = 60;

// POST /api/settings/system-references/extract (最高管理者専用)
// Body: { platform: string, content: string }
// Response: { postingData: Record<string, string> }
export async function POST(request: NextRequest) {
  const auth = await requireRole(["super_admin"]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { platform, content } = body as { platform?: string; content?: string };

  if (!platform || !content || !content.trim()) {
    return NextResponse.json(
      { error: "媒体と原稿本文は必須です" },
      { status: 400 }
    );
  }

  const group = PLATFORM_FIELDS[platform];
  if (!group) {
    return NextResponse.json(
      { error: `未対応の媒体です: ${platform}` },
      { status: 400 }
    );
  }

  // catchphrase は UI で個別入力するため抽出対象から除外
  const fields = [...group.main, ...group.optional].filter(
    (f) => f.key !== "catchphrase"
  );

  const fieldListText = fields.map((f) => `  - ${f.key}: ${f.label}`).join("\n");

  // 媒体別の追加ルール
  const platformSpecificRules: Record<string, string> = {
    hellowork: `
## ハローワーク特有の注意
- **2024年法改正により必須化された項目**: 原稿内に相当する記載があれば必ず抽出
  - workplaceChange（就業場所の変更の可能性）: 例「変更の範囲：なし」「変更の範囲：会社の定める事業所」
  - jobContentChange（業務内容の変更の可能性）: 例「変更の範囲：なし」「変更の範囲：会社の定める業務」
  - transferPossibility（転勤の可能性）: 「あり」「なし」
- 文字数: 職種（jobTitle）は全角28字まで、仕事の内容（jobDescription）は全角360字まで（冒頭90字が概要表示）
- 入力は半角でOK。後段で全角化されるため、原稿が半角文字でも気にせずそのまま抽出する
- 選考方法（selectionMethod）は「面接」「書類選考」「適性検査」「実技試験」から該当を**カンマ区切りの文字列**で抽出
- 応募書類（applicationDocuments）・応募方法（applicationMethodHw）も**カンマ区切りの文字列**で抽出
- 定年制（retirementAge）と退職金制度（retirementBenefit）は「あり 一律65歳」「あり 勤続3年以上」「なし」などの形式`,
    indeed: `
## Indeed特有の注意
- fixedOvertimePay（固定残業代）: 原稿中に金額・時間の記載があれば「あり 月〇時間分〇〇円（超過分は別途支給）」の形式で抽出。「固定残業代なし」と明記されていれば「なし」
- monthlyWorkingHours（月間平均所定労働時間）: 数値＋単位（例「月平均160時間」）
- featureTags（特長タグ）: 最大3個までの**カンマ区切りの文字列**（例「未経験歓迎,土日祝休み,賞与あり」）
- salaryDisplayType（給与の表示方法）: 「範囲表示」「下限表示」「固定額表示」のいずれか
- applicationMethod（応募経路）: 「Indeed応募」または「外部URL」のどちらか`,
    airwork: `
## Airワーク特有の注意
- trialPeriod（試用・研修）: **必須項目**。「試用期間あり（3ヶ月、時給990円）」「試用期間なし」の形式で抽出
- applicationReceiveMethod（応募受付方法）: 「メール」「Web」「電話」から該当を**カンマ区切りの文字列**で（例「Web,電話」）
- applicantInfoToGet（応募者から取得する情報）: **カンマ区切りの文字列**（例「氏名,電話番号,メールアドレス」）
- workDays（勤務曜日）: 「月,火,水,木,金」のようにカンマ区切り
- workPeriod（勤務期間）: 「長期」「短期」のどちらか
- commuteAllowance（交通費）: 「全額支給」「上限あり」「なし」のいずれか
- featureTags（特徴タグ）: **カンマ区切りの文字列**`,
    jobmedley: `
## JobMedley特有の注意
- facilityType（施設種別）: **必須**。「クリニック」「病院」「歯科医院」「調剤薬局」「ドラッグストア」「整骨院・接骨院」「鍼灸院」「介護施設（特養・老健）」「介護施設（有料老人ホーム）」「デイサービス」「訪問介護・看護」「保育園・幼稚園」「学童保育」「障害福祉サービス」「その他」から最も近いものを選ぶ`,
  };

  const prompt = `あなたは求人原稿を構造化するアシスタントです。
以下は ${platform} 向けの応募実績がある求人原稿です。原稿本文を読み、指定キーで JSON に分類してください。

## 抽出する項目
${fieldListText}

## 基本ルール
- 原稿中の文章は **できるだけそのまま** 抜き出す（要約や言い換えはしない）。ただし下の「整形ルール」が適用される項目は指定された形式に整える。
- 該当する情報が原稿内に明確に含まれていない項目は、キー自体を JSON に含めないこと（空文字列を入れない）。
- すべての値は **文字列型** で返すこと（配列・オブジェクトは使わず、配列は「A,B,C」のようなカンマ区切り文字列に変換）。
- 改行が必要な箇所は \\n を使用。
- JSON 以外の前置き・後置き・コメントは一切出力しないこと。

## 整形ルール（媒体共通）
- **配列系フィールド**（featureTags / selectionMethods / applicationDocuments / applicationMethod / applicationMethodHw / applicantInfoToGet / workDays / screeningQuestions）は **カンマ区切りの文字列** で返す
- **有無の２択系**（trialPeriod / fixedOvertimePay / retirementAge / retirementBenefit / transferPossibility / reEmployment / carCommute）は、原稿から判定できる場合のみ「あり + 詳細」または「なし」の形式
- **数値系**（monthlyWorkingHours / annualHolidays / selectionResultDays / overtimeAvg / totalEmployees）は「〇〇時間」「〇〇日」など単位付きの文字列
- **列挙系**（salaryDisplayType / facilityType / employmentPeriodType / educationLevel / workPeriod / commuteAllowance / publishingScope / jobCategoryType）は原稿表現に最も近い選択肢を文字列で
${platformSpecificRules[platform] || ""}

## 原稿本文
"""
${content}
"""

## 出力形式（例）
{
  "jobDescription": "...",
  "requirements": "...",
  "featureTags": "未経験歓迎,土日祝休み,賞与あり"
}`;

  try {
    const message = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    if (textBlock.type !== "text") {
      return NextResponse.json({ error: "解析結果の形式が不正です" }, { status: 500 });
    }

    const parsed = extractJSON<Record<string, unknown>>(textBlock.text, "reference-extract");

    const allowedKeys = new Set(fields.map((f) => f.key));
    const postingData: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!allowedKeys.has(k)) continue;
      // 文字列・配列・数値を文字列に正規化（AIが指示を逸脱した場合のフォールバック）
      let str: string;
      if (typeof v === "string") {
        str = v;
      } else if (Array.isArray(v)) {
        str = v
          .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
          .join(",");
      } else if (typeof v === "number" || typeof v === "boolean") {
        str = String(v);
      } else {
        continue;
      }
      const trimmed = str.trim();
      if (!trimmed) continue;
      postingData[k] = trimmed;
    }

    return NextResponse.json({ postingData });
  } catch (error) {
    console.error("[reference-extract] failed", error);
    return NextResponse.json(
      { error: "解析に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
