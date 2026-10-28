/**
 * 資料表：settings（整個網站只有一筆，_id 固定為 "site"）
 * ------------------------------------------------------------
 *   requireLogin → 開啟後，沒登入不能開始模擬面試
 *   pricing      → 各模型每 100 萬 token 的價格（美元），用來估算成本
 *   webSearchPerCallUsd → 每次網路搜尋工具呼叫的價格
 *   usdToTwd     → 後台顯示新台幣用的匯率
 *
 * 讀取請用 lib/settings.ts 的 getSettings()，會自動補上預設值。
 */
import { Schema, model, models, type Model } from "mongoose";

export interface ModelPrice {
  model: string;
  inputPerM: number; // 一般輸入
  cachedInputPerM: number; // 快取命中的輸入
  outputPerM: number; // 輸出（含推理 token）
}

export interface SiteSettings {
  _id: string;
  requireLogin: boolean;
  pricing: ModelPrice[];
  webSearchPerCallUsd: number;
  usdToTwd: number;
  updatedAt?: Date;
}

const settingSchema = new Schema<SiteSettings>(
  {
    _id: { type: String, default: "site" },
    requireLogin: { type: Boolean, default: false },
    pricing: {
      type: [
        new Schema<ModelPrice>(
          {
            model: { type: String, required: true },
            inputPerM: { type: Number, required: true },
            cachedInputPerM: { type: Number, required: true },
            outputPerM: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    webSearchPerCallUsd: { type: Number },
    usdToTwd: { type: Number },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const SettingModel =
  (models.Setting as Model<SiteSettings>) || model<SiteSettings>("Setting", settingSchema);
