/**
 * GET /api/auth/me — 目前登入的使用者
 * ------------------------------------------------------------
 * 前端每次載入頁面（包含重新整理）都會呼叫這支，
 * 瀏覽器會自動帶上 HTTP-only Cookie，伺服器驗證 JWT 後回傳使用者資料。
 *   已登入 → { user: { id, email, name, picture, role, plan } }
 *   未登入 → { user: null }（回 200，未登入是正常狀態不是錯誤）
 * 帳號被刪除或停權時，getCurrentUser() 也會回傳 null，一樣視為未登入。
 */
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  await connection(); // 每個請求的登入者不同，不能在建置時預先產生
  try {
    return Response.json({ user: await getCurrentUser() });
  } catch (err) {
    console.error("[auth/me]", err);
    return Response.json({ error: "無法取得登入狀態" }, { status: 500 });
  }
}
