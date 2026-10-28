/**
 * 前端登入狀態
 * ------------------------------------------------------------
 * JWT 存在 HTTP-only Cookie，前端讀不到，所以靠 GET /api/auth/me 問伺服器「我是誰」。
 * 頁面載入（包含重新整理，以及 Google 登入完成導回首頁）時呼叫一次；登出後再呼叫 notifyAuthChange()
 * 通知所有使用 useCurrentUser() 的元件（例如 Header）重新查詢。
 *
 * 這支檔案只在瀏覽器端使用。
 */
import { useEffect, useState } from "react";
import type { Plan, Role } from "@/lib/roles";

export type SessionUser = { id: string; email: string; name: string; picture: string; role: Role; plan: Plan };

const CHANGE_EVENT = "offermate:auth-change";

export function notifyAuthChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** undefined = 查詢中、null = 未登入 */
export function useCurrentUser() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((json: { user?: SessionUser | null }) => !cancelled && setUser(json.user ?? null))
        .catch(() => !cancelled && setUser(null));

    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, load);
    };
  }, []);

  return user;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  notifyAuthChange();
}
