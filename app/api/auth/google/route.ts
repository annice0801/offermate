/**
 * GET /api/auth/google — 開始 Google 登入
 * ------------------------------------------------------------
 * 產生 state + PKCE，暫存在短效 HTTP-only Cookie，然後導向 Google 同意畫面。
 * 登入頁的「使用 Google 登入」按鈕就是連到這裡。
 */
import { cookies } from "next/headers";
import { OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE, buildAuthUrl, createPkce } from "@/lib/google-oauth";

export async function GET(request: Request) {
  try {
    const { state, verifier, challenge } = await createPkce();
    const authUrl = buildAuthUrl(request, state, challenge);

    (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, verifier }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Google 導回來是頂層導覽（GET），lax 會帶上這個 Cookie
      path: "/api/auth/google",
      maxAge: OAUTH_COOKIE_MAX_AGE,
    });
    return Response.redirect(authUrl, 302);
  } catch (err) {
    console.error("[auth/google]", err);
    return Response.redirect(new URL("/login?error=config", request.url), 302);
  }
}
