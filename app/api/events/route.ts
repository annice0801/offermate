/**
 * POST /api/events — 前端回報使用事件
 * ------------------------------------------------------------
 * 只接受只有瀏覽器知道的事件：下載診斷書（PDF / PNG）、前端錯誤。
 * 有登入就記在會員名下，沒登入就只記匿名的 clientId。
 * 同一個 IP 每分鐘最多 30 筆，避免被灌爆資料庫。
 */
import { getCurrentUser } from "@/lib/auth";
import { readTrackingHeaders, recordEvent } from "@/lib/usage";

const ALLOWED = ["download_pdf", "download_png", "client_error"] as const;
type Allowed = (typeof ALLOWED)[number];

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 30;
const recent = new Map<string, number[]>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_MAX) return Response.json({ ok: false }, { status: 429 });
  recent.set(ip, [...times, now]);

  let body: { type?: string; message?: unknown; meta?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  if (!ALLOWED.includes(body.type as Allowed)) return Response.json({ error: "未知的事件" }, { status: 400 });

  // meta 只保留少量、簡單的欄位
  const meta: Record<string, string | number> = {};
  if (body.meta && typeof body.meta === "object") {
    for (const [k, v] of Object.entries(body.meta).slice(0, 10)) {
      if (typeof v === "string") meta[k.slice(0, 30)] = v.slice(0, 200);
      else if (typeof v === "number") meta[k.slice(0, 30)] = v;
    }
  }

  const user = await getCurrentUser().catch(() => null);
  await recordEvent({
    type: body.type as Allowed,
    userId: user?.id,
    ...readTrackingHeaders(request),
    ok: body.type !== "client_error",
    errorMessage: typeof body.message === "string" ? body.message : "",
    meta,
  });
  return Response.json({ ok: true });
}
