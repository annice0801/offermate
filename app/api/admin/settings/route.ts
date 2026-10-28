/**
 * PUT /api/admin/settings — 修改系統設定（只有 admin 可以）
 * ------------------------------------------------------------
 * body：{ requireLogin, pricing: [{ model, inputPerM, cachedInputPerM, outputPerM }], webSearchPerCallUsd, usdToTwd }
 * 價格修改只影響「之後」的使用紀錄，已記錄的成本不會重算。
 */
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { AdminLogModel } from "@/lib/models/admin-log";
import { SettingModel, type ModelPrice } from "@/lib/models/setting";
import { getSettings } from "@/lib/settings";

const isPrice = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 10_000;

export async function PUT(request: Request) {
  const actor = await requireAdmin("edit");
  if (actor instanceof Response) return actor;

  let body: { requireLogin?: unknown; pricing?: unknown; webSearchPerCallUsd?: unknown; usdToTwd?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (typeof body.requireLogin !== "boolean") return Response.json({ error: "requireLogin 格式錯誤" }, { status: 400 });
  if (!isPrice(body.webSearchPerCallUsd)) return Response.json({ error: "網路搜尋價格格式錯誤" }, { status: 400 });
  if (!isPrice(body.usdToTwd) || (body.usdToTwd as number) <= 0) return Response.json({ error: "匯率格式錯誤" }, { status: 400 });
  if (!Array.isArray(body.pricing) || body.pricing.length > 20) return Response.json({ error: "價格表格式錯誤" }, { status: 400 });

  const pricing: ModelPrice[] = [];
  for (const p of body.pricing as Record<string, unknown>[]) {
    const model = typeof p.model === "string" ? p.model.trim().slice(0, 60) : "";
    if (!model) continue; // 空白列略過
    if (![p.inputPerM, p.cachedInputPerM, p.outputPerM].every(isPrice)) {
      return Response.json({ error: `模型 ${model} 的價格格式錯誤` }, { status: 400 });
    }
    pricing.push({ model, inputPerM: p.inputPerM as number, cachedInputPerM: p.cachedInputPerM as number, outputPerM: p.outputPerM as number });
  }

  await connectDB();
  const before = await getSettings();
  const next = {
    requireLogin: body.requireLogin,
    pricing,
    webSearchPerCallUsd: body.webSearchPerCallUsd as number,
    usdToTwd: body.usdToTwd as number,
  };
  await SettingModel.updateOne({ _id: "site" }, { $set: next }, { upsert: true });

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(next[key])) changes[key] = { from: before[key], to: next[key] };
  }
  if (Object.keys(changes).length) {
    await AdminLogModel.create({ actorId: actor.id, actorEmail: actor.email, action: "settings.update", changes });
  }
  return Response.json({ ok: true });
}
