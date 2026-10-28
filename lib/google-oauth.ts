/**
 * Google OAuth 2.0（Authorization Code + PKCE）
 * ------------------------------------------------------------
 * 流程：
 *   1. /api/auth/google          → 產生 state + code_verifier，暫存在短效 HTTP-only Cookie，
 *                                   把使用者導到 Google 同意畫面
 *   2. Google 導回 /api/auth/google/callback?code=...&state=...
 *   3. callback 比對 state（防 CSRF）→ 用 code + code_verifier 向 Google 換 token
 *   4. 用 Google 公開金鑰驗證 id_token 簽章 → 取得 sub / email / name / picture
 *
 * 需要 .env.local：GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET
 * Google Cloud Console 的「已授權的重新導向 URI」要加上：
 *   http://localhost:3000/api/auth/google/callback（本機）
 *   https://你的網域/api/auth/google/callback（正式）
 *
 * 只能在後端 import。
 */
import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const OAUTH_COOKIE = "offermate_oauth";
export const OAUTH_COOKIE_MAX_AGE = 10 * 60; // 10 分鐘內要完成 Google 登入

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
// jose 會快取 Google 的公開金鑰，不會每次登入都重新下載
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("尚未設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET，請在 .env.local 加上。");
  }
  return { clientId, clientSecret };
}

/** 回呼網址跟著目前網域走，本機和 Vercel 不用分開設定 */
export function getRedirectUri(request: Request) {
  return `${new URL(request.url).origin}/api/auth/google/callback`;
}

function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

/** 產生隨機 state 與 PKCE 的 code_verifier / code_challenge */
export async function createPkce() {
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { state, verifier, challenge: base64url(new Uint8Array(digest)) };
}

export function buildAuthUrl(request: Request, state: string, challenge: string) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: getConfig().clientId,
    redirect_uri: getRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account", // 每次都讓使用者選帳號，方便切換
  }).toString();
  return url.toString();
}

export type GoogleProfile = { sub: string; email: string; name: string; picture: string };

/** 用 code 換 token，並驗證 id_token，回傳使用者資料 */
export async function exchangeCode(request: Request, code: string, verifier: string): Promise<GoogleProfile> {
  const { clientId, clientSecret } = getConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(request),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const json = await res.json();
  if (!res.ok || typeof json.id_token !== "string") {
    throw new Error(`Google token 交換失敗：${json.error_description ?? json.error ?? res.status}`);
  }

  // 驗證簽章、簽發者、對象（必須是發給我們這個 client 的），過期也會在這裡被擋下
  const { payload } = await jwtVerify(json.id_token, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Google 帳號沒有已驗證的 Email");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : "",
    picture: typeof payload.picture === "string" ? payload.picture : "",
  };
}
