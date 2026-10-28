/**
 * POST /api/auth/logout — 登出
 * ------------------------------------------------------------
 * 刪除存放 JWT 的 HTTP-only Cookie。前端 JavaScript 讀不到這個 Cookie，
 * 所以登出一定要交給伺服器處理。
 */
import { deleteSession } from "@/lib/auth";

export async function POST() {
  await deleteSession();
  return Response.json({ ok: true });
}
