/**
 * BYOK（Bring Your Own Key）：使用者自己的 OpenAI API Key 管理
 * ------------------------------------------------------------
 * 金鑰只存在「使用者自己的瀏覽器」localStorage，
 * 每次呼叫 /api/interview 時放在 X-OpenAI-Key 標頭帶給伺服器，
 * 伺服器用它呼叫 OpenAI 後就丟掉，不儲存、不記錄。
 *
 * 這支檔案只在瀏覽器端使用（Header 的設定視窗、面試頁）。
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "offermate.openai-api-key";
const CHANGE_EVENT = "offermate:api-key-change"; // 同一分頁內通知「金鑰變了」
const OPEN_EVENT = "offermate:open-api-key-settings"; // 通知 Header 打開設定視窗

// 標頭名稱定義在 types.ts（前後端共用），這裡轉出去方便前端 import
export { API_KEY_HEADER } from "./types";

/** 讀取金鑰。localStorage 在無痕模式或被封鎖時可能丟錯，所以包 try/catch */
export function getApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** 儲存金鑰；傳空字串代表清除 */
export function saveApiKey(value: string) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無法寫入（例如隱私模式）時靜默失敗，UI 仍會提示未設定
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 讓任何元件都能打開設定視窗（例如面試頁的「前往設定」按鈕） */
export function openApiKeySettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** 監聽「打開設定視窗」事件，回傳取消監聽的函式 */
export function onOpenApiKeySettings(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

/** 顯示用：只露出前 3 碼與後 4 碼，例如 sk-…a1B2 */
export function maskKey(key: string) {
  return key.length > 10 ? `${key.slice(0, 3)}…${key.slice(-4)}` : "••••";
}

/*
 * React Hook：讀取目前的金鑰，並在金鑰改變時自動重新渲染
 * useSyncExternalStore 是 React 官方用來「訂閱外部資料來源」的 Hook：
 *   subscribe       → 什麼時候要重新讀取（本分頁的 CHANGE_EVENT、其他分頁的 storage 事件）
 *   getSnapshot     → 在瀏覽器怎麼讀
 *   getServerSnapshot → 伺服器端沒有 localStorage，一律當作空字串
 */
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useApiKey() {
  return useSyncExternalStore(subscribe, getApiKey, () => "");
}
