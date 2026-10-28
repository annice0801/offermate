/**
 * 資料表：usageevents（一次使用行為 = 一筆）
 * ------------------------------------------------------------
 * 後台的所有統計（使用量、使用時間、下載、錯誤、token、成本）都從這張表算出來。
 *
 * type：
 *   interview_start / interview_answer / interview_report → 伺服器呼叫 OpenAI（有 token 與成本）
 *   download_pdf / download_png                          → 使用者下載診斷書（前端回報）
 *   client_error                                         → 前端發生的錯誤（前端回報）
 *
 * 身分：登入的會員記 userId；沒登入的訪客只有 clientId（瀏覽器 localStorage 產生的匿名 ID）。
 * sessionId：同一場模擬面試的所有事件共用一個 ID，用來算「一場練習用了多久、有沒有完成」。
 *
 * 不存使用者的回答內容與 API Key，只存統計需要的數字與錯誤訊息。
 */
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const EVENT_TYPES = [
  "interview_start",
  "interview_answer",
  "interview_report",
  "download_pdf",
  "download_png",
  "client_error",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const usageEventSchema = new Schema(
  {
    type: { type: String, enum: EVENT_TYPES, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    clientId: { type: String, default: "" },
    sessionId: { type: String, default: "", index: true },

    ok: { type: Boolean, default: true, index: true },
    httpStatus: { type: Number },
    errorMessage: { type: String, default: "" },
    durationMs: { type: Number, default: 0 }, // 伺服器處理這次請求花多久

    // OpenAI 用量（只有 interview_* 有）
    model: { type: String, default: "" },
    inputTokens: { type: Number, default: 0 },
    cachedInputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    reasoningTokens: { type: Number, default: 0 }, // 已包含在 outputTokens 內，另外列出方便分析
    webSearchCalls: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 }, // 依「當時」的價格設定估算，之後改價格不會回溯

    // 少量補充資訊：產業、公司、題號、總分等（不放回答內容）
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

usageEventSchema.index({ createdAt: -1 });
usageEventSchema.index({ userId: 1, createdAt: -1 });

export type UsageEvent = InferSchemaType<typeof usageEventSchema>;

export const UsageEventModel =
  (models.UsageEvent as Model<UsageEvent>) || model<UsageEvent>("UsageEvent", usageEventSchema);
