/**
 * 後台顯示用的格式化工具（前後端都能用）
 * 時間一律以台灣時區顯示。
 */
const TZ = "Asia/Taipei";

export function formatNumber(n: number) {
  return n.toLocaleString("zh-TW");
}

/** 成本：小額時多顯示幾位小數，例如 $0.0042 */
export function formatUsd(n: number) {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTwd(usd: number, rate: number) {
  const twd = usd * rate;
  return `NT$${twd < 10 ? twd.toFixed(2) : Math.round(twd).toLocaleString("zh-TW")}`;
}

/** 1234567 → 1.23M、45678 → 45.7K */
export function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** 毫秒 → 「1 小時 5 分」「12 分 30 秒」「8 秒」 */
export function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分 ${s % 60} 秒`;
  return `${Math.floor(m / 60)} 小時 ${m % 60} 分`;
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("zh-TW", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-TW", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 「3 分鐘前」「2 天前」 */
export function formatRelative(d: Date | string | null | undefined) {
  if (!d) return "從未";
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "剛剛";
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return formatDate(d);
}
