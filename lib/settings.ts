/**
 * 網站設定（讀取 + 成本估算）
 * ------------------------------------------------------------
 * 預設價格為 2026 年 OpenAI 公告的牌價（美元 / 每 100 萬 token），
 * OpenAI 調價時到後台「系統設定」修改即可，不用改程式。
 *
 * 只能在後端 import。
 */
import "server-only";
import { connectDB } from "@/lib/mongodb";
import { SettingModel, type ModelPrice, type SiteSettings } from "@/lib/models/setting";

export const DEFAULT_PRICING: ModelPrice[] = [
  { model: "gpt-5-mini", inputPerM: 0.25, cachedInputPerM: 0.025, outputPerM: 2.0 },
  { model: "gpt-5", inputPerM: 1.25, cachedInputPerM: 0.125, outputPerM: 10.0 },
  { model: "gpt-5-nano", inputPerM: 0.05, cachedInputPerM: 0.005, outputPerM: 0.4 },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  _id: "site",
  requireLogin: false,
  pricing: DEFAULT_PRICING,
  webSearchPerCallUsd: 0.01, // 網路搜尋工具每 1,000 次 10 美元
  usdToTwd: 32,
};

export async function getSettings(): Promise<SiteSettings> {
  await connectDB();
  const doc = await SettingModel.findById("site").lean();
  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(Object.entries(doc ?? {}).filter(([, v]) => v !== undefined && v !== null)),
    _id: "site",
  } as SiteSettings;
}

export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
}

export const EMPTY_USAGE: TokenUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  webSearchCalls: 0,
};

/**
 * 估算一次呼叫的成本（美元）
 * OpenAI 的 input_tokens 已包含快取命中的部分，所以一般輸入 = input - cached。
 * 找不到該模型的價格時回傳 0，後台會提示去補價格。
 */
export function estimateCostUsd(settings: SiteSettings, model: string, u: TokenUsage) {
  const price = settings.pricing.find((p) => p.model === model);
  const search = u.webSearchCalls * settings.webSearchPerCallUsd;
  if (!price) return search;
  const uncached = Math.max(0, u.inputTokens - u.cachedInputTokens);
  return (
    (uncached * price.inputPerM + u.cachedInputTokens * price.cachedInputPerM + u.outputTokens * price.outputPerM) /
      1_000_000 +
    search
  );
}
