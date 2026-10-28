/**
 * 前端使用紀錄（瀏覽器端）
 * ------------------------------------------------------------
 *   clientId  → 這個瀏覽器的匿名 ID，存在 localStorage，讓後台能區分「訪客」
 *   sessionId → 一場模擬面試的 ID，按下「開始面試」時產生，同一場的所有請求共用
 *
 * 這兩個 ID 透過 X-Client-Id / X-Session-Id 標頭送給後端；
 * 下載診斷書、前端錯誤這類只有瀏覽器知道的事件，用 track() 回報到 /api/events。
 * 回報失敗不影響使用者操作。
 */
const CLIENT_KEY = "offermate.client-id";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  } catch {
    return ""; // 隱私模式讀不到 localStorage 就當作沒有
  }
}

export function newSessionId() {
  return randomId();
}

export function trackingHeaders(sessionId: string | null): Record<string, string> {
  return { "X-Client-Id": getClientId(), "X-Session-Id": sessionId ?? "" };
}

export type ClientEventType = "download_pdf" | "download_png" | "client_error";

export function track(type: ClientEventType, sessionId: string | null, data: { message?: string; meta?: Record<string, unknown> } = {}) {
  // keepalive：就算使用者馬上關掉分頁，請求也會送出
  fetch("/api/events", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", ...trackingHeaders(sessionId) },
    body: JSON.stringify({ type, ...data }),
  }).catch(() => {});
}
