/**
 * 資料表：users（一位會員 = 一筆）
 * ------------------------------------------------------------
 * 只支援 Google 登入，不存任何密碼：
 *   googleId → Google 帳號的唯一 ID（id_token 的 sub），用它找人，unique
 *   email    → Google 回傳且已驗證的 Email，一律小寫
 *   name / picture → 顯示用，每次登入都會用 Google 的最新資料更新
 *
 * 後台管理用欄位（見 lib/roles.ts）：
 *   role   → user / support / admin
 *   plan   → 會員等級 free / pro / enterprise
 *   status → active / suspended（停權後無法登入、也無法使用面試）
 *   adminNote → 管理員備註，只有後台看得到
 *
 * 為什麼用 googleId 而不是 email 找人？
 *   使用者可以在 Google 改 Email，但 sub 永遠不變。
 */
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { PLANS, ROLES, USER_STATUSES } from "@/lib/roles";

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    picture: { type: String, default: "" },
    lastLoginAt: { type: Date },
    lastSeenAt: { type: Date }, // 最後一次使用面試功能的時間

    role: { type: String, enum: ROLES, default: "user", index: true },
    plan: { type: String, enum: PLANS, default: "free", index: true },
    status: { type: String, enum: USER_STATUSES, default: "active", index: true },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }, // 自動加上 createdAt / updatedAt
);

export type User = InferSchemaType<typeof userSchema>;

// 熱更新時重複使用已編譯的 model，避免 OverwriteModelError
export const UserModel = (models.User as Model<User>) || model<User>("User", userSchema);
