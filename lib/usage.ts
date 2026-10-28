/**
 * 寫入使用紀錄（usageevents）
 * ------------------------------------------------------------
 * 記錄失敗絕對不能影響使用者正在做的事，所以所有錯誤都只印 log、不往外丟。
 *
 * 只能在後端 import。
 */
import "server-only";
import { connectDB } from "@/lib/mongodb";
import { UsageEventModel, type EventType } from "@/lib/models/usage-event";
import { UserModel } from "@/lib/models/user";
import { EMPTY_USAGE, estimateCostUsd, getSettings, type TokenUsage } from "@/lib/settings";

/** 從請求標頭讀出前端帶來的匿名 ID 與這場練習的 ID（長度限制避免被塞垃圾） */
export function readTrackingHeaders(request: Request) {
  const clean = (v: string | null) => (v ?? "").replace(/[^\w-]/g, "").slice(0, 64);
  return {
    clientId: clean(request.headers.get("x-client-id")),
    sessionId: clean(request.headers.get("x-session-id")),
  };
}

interface RecordInput {
  type: EventType;
  userId?: string | null;
  clientId?: string;
  sessionId?: string;
  ok?: boolean;
  httpStatus?: number;
  errorMessage?: string;
  durationMs?: number;
  model?: string;
  usage?: TokenUsage;
  meta?: Record<string, unknown>;
}

export async function recordEvent(input: RecordInput) {
  try {
    await connectDB();
    const usage = input.usage ?? EMPTY_USAGE;
    const costUsd = input.model ? estimateCostUsd(await getSettings(), input.model, usage) : 0;

    await UsageEventModel.create({
      type: input.type,
      userId: input.userId || undefined,
      clientId: input.clientId ?? "",
      sessionId: input.sessionId ?? "",
      ok: input.ok ?? true,
      httpStatus: input.httpStatus,
      errorMessage: (input.errorMessage ?? "").slice(0, 500),
      durationMs: input.durationMs ?? 0,
      model: input.model ?? "",
      ...usage,
      costUsd,
      meta: input.meta ?? {},
    });

    if (input.userId) await UserModel.updateOne({ _id: input.userId }, { lastSeenAt: new Date() });
  } catch (err) {
    console.error("[usage] 寫入使用紀錄失敗", err instanceof Error ? err.message : err);
  }
}
