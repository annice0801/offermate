/**
 * /api/feedback — 功能建議 / 問題回報 / 聯絡我們
 * ------------------------------------------------------------
 * 前端送來 { type, email, name, message, website }，驗證後依設定送達：
 *
 *   1. 有設定 RESEND_API_KEY + FEEDBACK_TO_EMAIL（.env.local）
 *      → 透過 Resend 寄一封 Email 到你的信箱，回覆信件會直接寄給填表的使用者
 *   2. 沒有設定
 *      → 印在執行 `npm run dev` 的終端機（伺服器 log），方便本機開發查看
 *     （不寫入專案資料夾：用 process.cwd() 組檔案路徑會讓 Turbopack 掃描整個專案而卡住編譯）
 *
 * 防濫用：
 *   - website 是「蜜罐」欄位：畫面上看不到，只有機器人會填，填了就假裝成功直接丟棄
 *   - 同一個 IP 10 分鐘內最多 5 筆（記在伺服器記憶體，重新啟動會清空）
 */
import { FEEDBACK_TYPES, type FeedbackRequest } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 2000;

// 簡易頻率限制：IP → 最近幾次送出的時間
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const recent = new Map<string, number[]>();

export async function POST(request: Request) {
  let body: FeedbackRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  // 蜜罐：機器人才會填這個隱藏欄位 → 回傳成功但不處理
  if (body.website) return Response.json({ ok: true });

  // ---------- 驗證 ----------
  const email = body.email?.trim() ?? "";
  const name = body.name?.trim().slice(0, 50) ?? "";
  const message = body.message?.trim() ?? "";
  if (!FEEDBACK_TYPES.includes(body.type)) return Response.json({ error: "請選擇回報類型" }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) return Response.json({ error: "請輸入正確的 Email" }, { status: 400 });
  if (message.length < 5) return Response.json({ error: "內容至少需要 5 個字" }, { status: 400 });
  if (message.length > MAX_MESSAGE) return Response.json({ error: `內容請勿超過 ${MAX_MESSAGE} 字` }, { status: 400 });

  // ---------- 頻率限制 ----------
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_MAX) {
    return Response.json({ error: "送出太頻繁了，請稍後再試。" }, { status: 429 });
  }
  recent.set(ip, [...times, now]);

  const entry = { type: body.type, email, name, message, createdAt: new Date().toISOString() };

  // ---------- 送達 ----------
  try {
    if (process.env.RESEND_API_KEY && process.env.FEEDBACK_TO_EMAIL) {
      await sendEmail(entry);
    } else {
      logToServer(entry);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[/api/feedback]", err instanceof Error ? err.message : err);
    return Response.json({ error: "送出失敗，請稍後再試。" }, { status: 500 });
  }
}

type Entry = { type: string; email: string; name: string; message: string; createdAt: string };

/** 透過 Resend 的 REST API 寄信（不需要額外安裝套件，用 fetch 即可） */
async function sendEmail(entry: Entry) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // 寄件人：需要是你在 Resend 驗證過的網域；未設定時用 Resend 提供的測試寄件地址
      from: process.env.FEEDBACK_FROM_EMAIL || "OfferMate <onboarding@resend.dev>",
      to: process.env.FEEDBACK_TO_EMAIL,
      reply_to: entry.email, // 在信箱按「回覆」會直接回信給使用者
      subject: `[OfferMate ${entry.type}] 來自 ${entry.name || entry.email}`,
      text: `類型：${entry.type}\n稱呼：${entry.name || "（未填）"}\nEmail：${entry.email}\n時間：${entry.createdAt}\n\n${entry.message}`,
    }),
  });
  if (!res.ok) throw new Error(`Resend 回應 ${res.status}：${await res.text()}`);
}

/** 沒有設定寄信服務時，印在伺服器終端機 */
function logToServer(entry: Entry) {
  console.log(`\n[OfferMate 回饋] ${entry.type}｜${entry.name || "（未填稱呼）"} <${entry.email}>｜${entry.createdAt}\n${entry.message}\n`);
}
