/**
 * 登入狀態（JWT + HTTP-only Cookie）
 * ------------------------------------------------------------
 * 流程：
 *   登入 / 註冊成功 → createSession(userId) 簽一張 JWT → 存進 HTTP-only Cookie
 *   之後每次請求    → 瀏覽器自動帶上 Cookie → getSessionUserId() 驗證 JWT 取得 userId
 *   登出            → deleteSession() 刪除 Cookie
 *
 * HTTP-only：前端 JavaScript 讀不到這個 Cookie，就算網站被注入惡意腳本也偷不走登入狀態。
 * JWT 只放 userId（sub），不放 email 等個資；JWT 內容只是 base64，任何人都看得到。
 *
 * 簽章金鑰放在 .env.local 的 JWT_SECRET（至少 32 個字元的隨機字串）。
 * 只能在後端 import（Route Handler、Server Component）。
 */
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user";
import { canEditAdmin, canViewAdmin, type Plan, type Role } from "@/lib/roles";

export const SESSION_COOKIE = "offermate_session";
const SESSION_DAYS = 7;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("尚未設定 JWT_SECRET（至少 32 個字元），請在 .env.local 加上。");
  }
  return new TextEncoder().encode(secret);
}

/** 簽發 JWT 並寫入 HTTP-only Cookie */
export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // 本機 http://localhost 也能運作
    sameSite: "lax", // 擋下大部分跨站請求偽造（CSRF），一般連結點進來仍保持登入
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

/** 讀取 Cookie 並驗證 JWT，成功回傳 userId，未登入或 JWT 無效 / 過期回傳 null */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** 登出：刪除 Cookie */
export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** .env.local 的 ADMIN_EMAILS（逗號分隔）列出的擁有者：登入自動成為 admin，後台不能降級或停權 */
export function isOwnerEmail(email: string) {
  const owners = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.toLowerCase());
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: Role;
  plan: Plan;
};

/**
 * 目前登入的使用者（從資料庫讀最新的角色 / 等級）
 * 未登入、JWT 無效、帳號不存在或已停權都回傳 null，
 * 所以停權會「立即」生效，不用等 JWT 過期。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  await connectDB();
  const user = await UserModel.findById(userId).lean().catch(() => null);
  if (!user) return null;
  const owner = isOwnerEmail(user.email);
  // 擁有者：把資料庫同步成 admin + active，後台列表顯示的權限才會一致
  if (owner && (user.role !== "admin" || user.status !== "active")) {
    await UserModel.updateOne({ _id: user._id }, { role: "admin", status: "active" });
  } else if (user.status === "suspended") {
    return null;
  }
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: owner ? "admin" : (user.role as Role),
    plan: user.plan as Plan,
  };
}

/**
 * 後台 API 用：檢查權限，不符合時回傳要直接 return 的 Response
 *   const auth = await requireAdmin("edit"); if (auth instanceof Response) return auth;
 */
export async function requireAdmin(level: "view" | "edit"): Promise<CurrentUser | Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  const allowed = level === "edit" ? canEditAdmin(user.role) : canViewAdmin(user.role);
  if (!allowed) return Response.json({ error: "權限不足" }, { status: 403 });
  return user;
}
