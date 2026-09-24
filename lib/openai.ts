/**
 * OpenAI 呼叫的共用函式（BYOK 模式）
 * ------------------------------------------------------------
 * 這支檔案只在「伺服器端」執行（被 API Route import）。
 *
 * BYOK = Bring Your Own Key：不使用我們自己的金鑰，
 * 而是每次請求都用「使用者從瀏覽器帶來的金鑰」建立 OpenAI 客戶端。
 * 金鑰只存在這次請求的記憶體中，用完即丟，不寫入任何地方、也不印到 log。
 */
import OpenAI from "openai";

// 使用的模型；可在 .env.local 用 OPENAI_MODEL 覆寫（這不是機密，只是設定）
export const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

/** 用使用者的金鑰建立一個客戶端（每次請求各自一個，避免不同使用者的金鑰互相混用） */
function createClient(apiKey: string) {
  return new OpenAI({ apiKey });
}

/** 驗證金鑰：查詢目前設定的模型，同時確認「金鑰有效」與「帳號有權限使用這個模型」 */
export async function verifyApiKey(apiKey: string) {
  await createClient(apiKey).models.retrieve(MODEL);
}

interface AskOptions {
  apiKey: string; // 使用者的 OpenAI 金鑰
  instructions: string; // 系統指示（面試官的角色設定）
  input: string; // 這次要處理的內容
  schemaName: string; // JSON Schema 名稱（OpenAI 要求提供）
  schema: Record<string, unknown>; // 要求模型輸出的 JSON 結構
  webSearch?: boolean; // 是否讓模型可以上網搜尋
}

/**
 * 呼叫 OpenAI Responses API，並強制模型回傳符合 schema 的 JSON。
 *
 * 為什麼用「結構化輸出（Structured Outputs）」？
 *   因為前端要把分數、優缺點等欄位分開顯示，
 *   若讓模型自由輸出文字，就得自己解析，容易出錯。
 *   設定 strict: true 後，模型保證輸出的 JSON 一定符合 schema。
 *
 * 回傳：解析後的物件 + 網路搜尋時引用到的網址（citations）
 */
export async function askJSON<T>({
  apiKey,
  instructions,
  input,
  schemaName,
  schema,
  webSearch = false,
}: AskOptions): Promise<{ data: T; citations: { title: string; url: string }[] }> {
  const response = await createClient(apiKey).responses.create({
    model: MODEL,
    instructions,
    input,
    // 開啟 OpenAI 內建的 web_search 工具，模型會自行決定要搜尋哪些關鍵字
    tools: webSearch ? [{ type: "web_search" }] : undefined,
    text: {
      format: { type: "json_schema", name: schemaName, schema, strict: true },
    },
  });

  // output_text 是 SDK 幫我們把所有文字輸出串起來的便利屬性
  const data = JSON.parse(response.output_text) as T;

  // 從回應中找出模型實際引用的網址（url_citation 註解），當作可信的參考來源
  const citations: { title: string; url: string }[] = [];
  for (const item of response.output) {
    if (item.type !== "message") continue;
    for (const part of item.content) {
      if (part.type !== "output_text") continue;
      for (const a of part.annotations) {
        if (a.type === "url_citation") citations.push({ title: a.title, url: a.url });
      }
    }
  }

  return { data, citations };
}

/**
 * 把 OpenAI 的錯誤轉成使用者看得懂的中文訊息與對應的 HTTP 狀態碼
 * （BYOK 模式下，最常見的錯誤是金鑰錯誤、額度不足、沒有模型權限）
 */
export function describeOpenAIError(err: unknown): { status: number; message: string } {
  if (err instanceof OpenAI.APIError) {
    switch (err.status) {
      case 401:
        return { status: 401, message: "OpenAI API Key 無效，請到右上角「API Key 設定」重新輸入。" };
      case 403:
      case 404:
        return { status: err.status, message: `你的 OpenAI 帳號無法使用模型 ${MODEL}，請確認帳號權限。` };
      case 429:
        return { status: 429, message: "OpenAI 額度不足或請求太頻繁，請確認帳戶餘額後再試。" };
    }
    return { status: 502, message: `OpenAI 服務錯誤：${err.message}` };
  }
  return { status: 500, message: `伺服器錯誤：${err instanceof Error ? err.message : "未知錯誤"}` };
}
