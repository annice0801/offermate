/**
 * 角色、會員等級、帳號狀態（前後端共用的常數）
 * ------------------------------------------------------------
 * 角色（role）決定能不能進後台：
 *   user    → 一般會員
 *   support → 客服：可以看後台所有資料，但不能修改任何東西（唯讀）
 *   admin   → 管理員：可以修改會員等級、權限、停權、系統設定
 *
 * 另外 .env.local 的 ADMIN_EMAILS 列出的 Email 是「擁有者」：
 *   每次登入都會自動成為 admin，而且後台不能把他降級或停權，避免把自己鎖在門外。
 *
 * 這支檔案沒有任何後端依賴，前端元件也可以 import。
 */
export const ROLES = ["user", "support", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  user: "一般會員",
  support: "客服（唯讀）",
  admin: "管理員",
};

export const PLANS = ["free", "pro", "enterprise"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_LABELS: Record<Plan, string> = {
  free: "免費",
  pro: "Pro",
  enterprise: "企業",
};

export const USER_STATUSES = ["active", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: "正常",
  suspended: "停權",
};

/** 能不能進後台（看資料） */
export function canViewAdmin(role: Role | undefined) {
  return role === "support" || role === "admin";
}

/** 能不能在後台修改資料 */
export function canEditAdmin(role: Role | undefined) {
  return role === "admin";
}
