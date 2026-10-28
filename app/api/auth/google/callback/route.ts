/**
 * GET /api/auth/google/callback — Google 登入完成後導回這裡
 * ------------------------------------------------------------
 *   1. 比對網址的 state 和 Cookie 裡的 state（防止別人偽造登入請求）
 *   2. 用 code 向 Google 換 id_token 並驗證
 *   3. 依 googleId 找使用者，沒有就建立（第一次登入 = 註冊）；停權的帳號擋下
 *   4. 簽 JWT 寫入 HTTP-only Cookie → 導回首頁
 * 任何一步失敗都導回 /login?error=...，由登入頁顯示訊息。
 */
import { cookies } from "next/headers";
import { createSession, isOwnerEmail } from "@/lib/auth";
import { OAUTH_COOKIE, exchangeCode } from "@/lib/google-oauth";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => Response.redirect(new URL(`/login?error=${reason}`, url), 302);

  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_COOKIE)?.value;
  cookieStore.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" }); // 用過即丟

  // 使用者在 Google 畫面按「取消」
  if (url.searchParams.get("error")) return fail("cancelled");

  let saved: { state?: string; verifier?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {}
  const code = url.searchParams.get("code");
  if (!code || !saved.state || !saved.verifier || url.searchParams.get("state") !== saved.state) {
    return fail("state");
  }

  try {
    const profile = await exchangeCode(request, code, saved.verifier);
    await connectDB();
    const user = await UserModel.findOneAndUpdate(
      { googleId: profile.sub },
      {
        email: profile.email.toLowerCase(),
        name: profile.name,
        picture: profile.picture,
        lastLoginAt: new Date(),
        // 擁有者（ADMIN_EMAILS）每次登入都強制恢復成管理員
        ...(isOwnerEmail(profile.email) && { role: "admin", status: "active" }),
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    if (user.status === "suspended") return fail("suspended");
    await createSession(user._id.toString());
    return Response.redirect(new URL("/", url), 302);
  } catch (err) {
    console.error("[auth/google/callback]", err);
    return fail("google");
  }
}
