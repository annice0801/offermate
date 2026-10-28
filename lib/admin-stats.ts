/**
 * 後台統計查詢
 * ------------------------------------------------------------
 * 全部從 usageevents 即時計算，不另外存統計表，資料永遠一致。
 *
 * 名詞：
 *   一場練習（session）→ 同一個 sessionId 的所有事件
 *   使用時間           → 每場練習「第一個事件到最後一個事件」的時間加總
 *   完成               → 這場練習有成功產生診斷書（interview_report 成功）
 *   錯誤率             → AI 請求（interview_*）失敗的比例
 *
 * 只能在後端 import。
 */
import "server-only";
import { Types, type PipelineStage } from "mongoose";
import { isOwnerEmail } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { AdminLogModel } from "@/lib/models/admin-log";
import { UsageEventModel } from "@/lib/models/usage-event";
import { UserModel } from "@/lib/models/user";
import type { Plan, Role, UserStatus } from "@/lib/roles";

const TZ = "Asia/Taipei";
const DAY = 24 * 60 * 60 * 1000;
const AI_TYPES = ["interview_start", "interview_answer", "interview_report"];

/* ------------------------------------------------------------
 * 共用：把事件依 sessionId 整理成「一場一筆」
 * ------------------------------------------------------------ */
export interface SessionRow {
  sessionId: string;
  userId: string | null;
  clientId: string;
  company: string;
  industry: string;
  totalQuestions: number;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  startedOk: boolean; // 開場（搜尋面經 + 第一題）有成功
  answered: number;
  completed: boolean;
  overallScore: number | null;
  downloads: number;
  errors: number;
  tokens: number;
  costUsd: number;
}

async function sessionRows(match: Record<string, unknown>, limit = 0): Promise<SessionRow[]> {
  const pipeline: PipelineStage[] = [
    { $match: { ...match, sessionId: { $ne: "" } } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$sessionId",
        userId: { $first: "$userId" },
        clientId: { $first: "$clientId" },
        company: { $max: "$meta.company" },
        industry: { $max: "$meta.industry" },
        totalQuestions: { $max: "$meta.totalQuestions" },
        startedAt: { $min: "$createdAt" },
        endedAt: { $max: "$createdAt" },
        startedOk: { $max: { $cond: [{ $and: [{ $eq: ["$type", "interview_start"] }, "$ok"] }, 1, 0] } },
        answered: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "interview_answer"] }, "$ok"] }, 1, 0] } },
        completed: { $max: { $cond: [{ $and: [{ $eq: ["$type", "interview_report"] }, "$ok"] }, 1, 0] } },
        overallScore: { $max: "$meta.overallScore" },
        downloads: { $sum: { $cond: [{ $in: ["$type", ["download_pdf", "download_png"]] }, 1, 0] } },
        errors: { $sum: { $cond: ["$ok", 0, 1] } },
        tokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
        costUsd: { $sum: "$costUsd" },
      },
    },
    { $sort: { startedAt: -1 } },
  ];
  if (limit) pipeline.push({ $limit: limit });

  const rows = await UsageEventModel.aggregate(pipeline);
  return rows.map((r) => ({
    sessionId: r._id,
    userId: r.userId ? String(r.userId) : null,
    clientId: r.clientId ?? "",
    company: r.company ?? "",
    industry: r.industry ?? "",
    totalQuestions: r.totalQuestions ?? 0,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    durationMs: new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime(),
    startedOk: r.startedOk === 1,
    answered: r.answered,
    completed: r.completed === 1,
    overallScore: r.overallScore ?? null,
    downloads: r.downloads,
    errors: r.errors,
    tokens: r.tokens,
    costUsd: r.costUsd,
  }));
}

/* ------------------------------------------------------------
 * 總覽
 * ------------------------------------------------------------ */
export interface DailyPoint {
  date: string; // YYYY-MM-DD（台灣時間）
  sessions: number;
  activeUsers: number;
  tokens: number;
  costUsd: number;
  errors: number;
}

/** 一段期間的總計，用來和「上一期」比較成長或衰退 */
async function periodTotals(start: Date, end: Date) {
  const match = { createdAt: { $gte: start, $lt: end } };
  const [agg, activeUsers, newUsers] = await Promise.all([
    UsageEventModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          sessions: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "interview_start"] }, "$ok"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "interview_report"] }, "$ok"] }, 1, 0] } },
          aiRequests: { $sum: { $cond: [{ $in: ["$type", AI_TYPES] }, 1, 0] } },
          aiErrors: { $sum: { $cond: [{ $and: [{ $in: ["$type", AI_TYPES] }, { $not: ["$ok"] }] }, 1, 0] } },
          clientErrors: { $sum: { $cond: [{ $eq: ["$type", "client_error"] }, 1, 0] } },
          downloadsPdf: { $sum: { $cond: [{ $eq: ["$type", "download_pdf"] }, 1, 0] } },
          downloadsPng: { $sum: { $cond: [{ $eq: ["$type", "download_png"] }, 1, 0] } },
          inputTokens: { $sum: "$inputTokens" },
          cachedInputTokens: { $sum: "$cachedInputTokens" },
          outputTokens: { $sum: "$outputTokens" },
          reasoningTokens: { $sum: "$reasoningTokens" },
          webSearchCalls: { $sum: "$webSearchCalls" },
          costUsd: { $sum: "$costUsd" },
          avgAiMs: { $avg: { $cond: [{ $in: ["$type", AI_TYPES] }, "$durationMs", null] } },
        },
      },
    ]),
    UsageEventModel.distinct("userId", { ...match, userId: { $ne: null } }),
    UserModel.countDocuments(match),
  ]);
  const t = agg[0] ?? {};
  const n = (k: string) => (t[k] as number | undefined) ?? 0;
  return {
    activeUsers: activeUsers.length,
    newUsers,
    sessions: n("sessions"),
    completed: n("completed"),
    aiRequests: n("aiRequests"),
    aiErrors: n("aiErrors"),
    errorRate: n("aiRequests") ? n("aiErrors") / n("aiRequests") : 0,
    clientErrors: n("clientErrors"),
    downloadsPdf: n("downloadsPdf"),
    downloadsPng: n("downloadsPng"),
    inputTokens: n("inputTokens"),
    cachedInputTokens: n("cachedInputTokens"),
    outputTokens: n("outputTokens"),
    reasoningTokens: n("reasoningTokens"),
    webSearchCalls: n("webSearchCalls"),
    tokens: n("inputTokens") + n("outputTokens"),
    costUsd: n("costUsd"),
    avgAiMs: n("avgAiMs"),
  };
}

export async function getOverview(days = 30) {
  await connectDB();
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY);
  const prevSince = new Date(now.getTime() - 2 * days * DAY);

  const [cur, prev, userCount, planAgg, suspended, guests, daily, dailyUsers, hourly, sessions, topUsersAgg, recentErrors, recentEvents] = await Promise.all([
    periodTotals(since, now),
    periodTotals(prevSince, since),
    UserModel.countDocuments(),
    UserModel.aggregate([{ $group: { _id: "$plan", n: { $sum: 1 } } }]),
    UserModel.countDocuments({ status: "suspended" }),
    UsageEventModel.distinct("clientId", { createdAt: { $gte: since }, userId: null, clientId: { $ne: "" } }),
    UsageEventModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          sessions: { $sum: { $cond: [{ $and: [{ $eq: ["$type", "interview_start"] }, "$ok"] }, 1, 0] } },
          tokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
          costUsd: { $sum: "$costUsd" },
          errors: { $sum: { $cond: ["$ok", 0, 1] } },
        },
      },
    ]),
    // 每日活躍會員（同一天同一人只算一次）
    UsageEventModel.aggregate([
      { $match: { createdAt: { $gte: since }, userId: { $ne: null } } },
      { $group: { _id: { d: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } }, u: "$userId" } } },
      { $group: { _id: "$_id.d", n: { $sum: 1 } } },
    ]),
    // 練習時段：開始面試的時間落在一天中的哪個小時（台灣時間）
    UsageEventModel.aggregate([
      { $match: { createdAt: { $gte: since }, type: "interview_start", ok: true } },
      { $group: { _id: { $hour: { date: "$createdAt", timezone: TZ } }, n: { $sum: 1 } } },
    ]),
    sessionRows({ createdAt: { $gte: since } }),
    UsageEventModel.aggregate([
      { $match: { createdAt: { $gte: since }, userId: { $ne: null } } },
      { $group: { _id: "$userId", costUsd: { $sum: "$costUsd" }, tokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } }, events: { $sum: 1 } } },
      { $sort: { costUsd: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
    ]),
    UsageEventModel.find({ ok: false, createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(5).lean(),
    UsageEventModel.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 8 },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ]),
  ]);

  // 補齊沒有資料的日期，圖表才不會斷掉
  const byDate = new Map(daily.map((d) => [d._id as string, d]));
  const usersByDate = new Map(dailyUsers.map((d) => [d._id as string, d.n as number]));
  const series: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY).toLocaleDateString("en-CA", { timeZone: TZ });
    const d = byDate.get(date);
    series.push({
      date,
      sessions: d?.sessions ?? 0,
      activeUsers: usersByDate.get(date) ?? 0,
      tokens: d?.tokens ?? 0,
      costUsd: d?.costUsd ?? 0,
      errors: d?.errors ?? 0,
    });
  }

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const h of hourly) hours[h._id as number].count = h.n;

  // 使用深度漏斗：成功開始 → 至少答一題 → 過半 → 完成（拿到診斷書）→ 下載
  const ok = sessions.filter((s) => s.startedOk);
  const funnel = [
    { label: "開始面試", value: ok.length },
    { label: "至少回答 1 題", value: ok.filter((s) => s.answered >= 1).length },
    { label: "回答過半", value: ok.filter((s) => s.totalQuestions > 0 && s.answered >= s.totalQuestions / 2).length },
    { label: "完成診斷書", value: ok.filter((s) => s.completed).length },
    { label: "下載診斷書", value: ok.filter((s) => s.downloads > 0).length },
  ];

  const withDuration = sessions.filter((s) => s.durationMs > 0);
  const scored = sessions.filter((s) => s.overallScore !== null);

  return {
    days,
    cur,
    prev,
    users: {
      total: userCount,
      guests: guests.length,
      suspended,
      byPlan: Object.fromEntries(planAgg.map((p) => [p._id, p.n])) as Partial<Record<Plan, number>>,
    },
    sessions: {
      started: ok.length,
      completed: ok.filter((s) => s.completed).length,
      avgDurationMs: withDuration.length ? withDuration.reduce((a, s) => a + s.durationMs, 0) / withDuration.length : 0,
      avgScore: scored.length ? scored.reduce((a, s) => a + (s.overallScore ?? 0), 0) / scored.length : null,
      avgCostUsd: sessions.length ? sessions.reduce((a, s) => a + s.costUsd, 0) / sessions.length : 0,
    },
    series,
    hours,
    funnel,
    topUsers: topUsersAgg.map((u) => ({
      id: String(u._id),
      email: u.user.email as string,
      name: u.user.name as string,
      picture: (u.user.picture as string) ?? "",
      costUsd: u.costUsd as number,
      tokens: u.tokens as number,
    })),
    recentErrors: recentErrors.map((e) => ({
      id: String(e._id),
      type: e.type,
      message: e.errorMessage,
      httpStatus: e.httpStatus ?? null,
      userId: e.userId ? String(e.userId) : null,
      createdAt: e.createdAt as Date,
    })),
    recentEvents: recentEvents.map((e) => ({
      id: String(e._id),
      type: e.type as string,
      ok: e.ok as boolean,
      userId: e.userId ? String(e.userId) : null,
      userName: (e.user?.name as string) || (e.user?.email as string) || "",
      company: (e.meta?.company as string) ?? "",
      questionNo: (e.meta?.questionNo as number) ?? null,
      tokens: (e.inputTokens as number) + (e.outputTokens as number),
      costUsd: e.costUsd as number,
      createdAt: e.createdAt as Date,
    })),
  };
}

/* ------------------------------------------------------------
 * 會員列表（含每人的使用統計）
 * ------------------------------------------------------------ */
export interface UserListFilter {
  id?: string;
  q?: string;
  role?: string;
  plan?: string;
  status?: string;
  sort?: string;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: Role;
  plan: Plan;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
  lastSeenAt: Date | null;
  sessions: number;
  completed: number;
  usageMs: number;
  downloads: number;
  errors: number;
  tokens: number;
  costUsd: number;
}

export async function getUserRows(filter: UserListFilter = {}): Promise<UserRow[]> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filter.id) query._id = filter.id;
  if (filter.q) {
    const re = new RegExp(filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ email: re }, { name: re }];
  }
  if (filter.role) query.role = filter.role;
  if (filter.plan) query.plan = filter.plan;
  if (filter.status) query.status = filter.status;

  const users = await UserModel.find(query).lean();
  const ids = users.map((u) => u._id);

  const [eventAgg, sessions] = await Promise.all([
    UsageEventModel.aggregate([
      { $match: { userId: { $in: ids } } },
      {
        $group: {
          _id: "$userId",
          downloads: { $sum: { $cond: [{ $in: ["$type", ["download_pdf", "download_png"]] }, 1, 0] } },
          errors: { $sum: { $cond: ["$ok", 0, 1] } },
          tokens: { $sum: { $add: ["$inputTokens", "$outputTokens"] } },
          costUsd: { $sum: "$costUsd" },
        },
      },
    ]),
    sessionRows({ userId: { $in: ids } }),
  ]);

  const ev = new Map(eventAgg.map((e) => [String(e._id), e]));
  const sess = new Map<string, { sessions: number; completed: number; usageMs: number }>();
  for (const s of sessions) {
    if (!s.userId) continue;
    const cur = sess.get(s.userId) ?? { sessions: 0, completed: 0, usageMs: 0 };
    cur.sessions += 1;
    cur.completed += s.completed ? 1 : 0;
    cur.usageMs += s.durationMs;
    sess.set(s.userId, cur);
  }

  const rows: UserRow[] = users.map((u) => {
    const id = String(u._id);
    const e = ev.get(id);
    const s = sess.get(id);
    return {
      id,
      email: u.email,
      name: u.name,
      picture: u.picture,
      // 擁有者一律顯示為管理員（資料庫可能要等他下次造訪才會同步）
      role: isOwnerEmail(u.email) ? "admin" : (u.role as Role),
      plan: u.plan as Plan,
      status: isOwnerEmail(u.email) ? "active" : (u.status as UserStatus),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt ?? null,
      lastSeenAt: u.lastSeenAt ?? null,
      sessions: s?.sessions ?? 0,
      completed: s?.completed ?? 0,
      usageMs: s?.usageMs ?? 0,
      downloads: e?.downloads ?? 0,
      errors: e?.errors ?? 0,
      tokens: e?.tokens ?? 0,
      costUsd: e?.costUsd ?? 0,
    };
  });

  const sorters: Record<string, (a: UserRow, b: UserRow) => number> = {
    newest: (a, b) => +b.createdAt - +a.createdAt,
    active: (a, b) => +(b.lastSeenAt ?? b.lastLoginAt ?? 0) - +(a.lastSeenAt ?? a.lastLoginAt ?? 0),
    sessions: (a, b) => b.sessions - a.sessions,
    cost: (a, b) => b.costUsd - a.costUsd,
    errors: (a, b) => b.errors - a.errors,
  };
  return rows.sort(sorters[filter.sort ?? ""] ?? sorters.active);
}

/* ------------------------------------------------------------
 * 單一會員
 * ------------------------------------------------------------ */
export async function getUserDetail(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const user = await UserModel.findById(id).lean();
  if (!user) return null;

  const [row] = await getUserRows({ id });
  const [sessions, events, logs] = await Promise.all([
    sessionRows({ userId: user._id }, 50),
    UsageEventModel.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    AdminLogModel.find({ targetId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  return {
    user: { ...row, adminNote: user.adminNote },
    sessions,
    events: events.map((e) => ({
      id: String(e._id),
      type: e.type,
      ok: e.ok,
      httpStatus: e.httpStatus ?? null,
      errorMessage: e.errorMessage,
      durationMs: e.durationMs,
      tokens: e.inputTokens + e.outputTokens,
      costUsd: e.costUsd,
      meta: (e.meta ?? {}) as Record<string, unknown>,
      createdAt: e.createdAt as Date,
    })),
    logs: logs.map((l) => ({
      id: String(l._id),
      actorEmail: l.actorEmail,
      changes: l.changes as Record<string, { from: unknown; to: unknown }>,
      createdAt: l.createdAt as Date,
    })),
  };
}

/* ------------------------------------------------------------
 * 錯誤紀錄：相同訊息合併成一組，方便看哪個 bug 最常發生
 * ------------------------------------------------------------ */
export async function getErrorGroups(days = 30) {
  await connectDB();
  const since = new Date(Date.now() - days * DAY);
  const groups = await UsageEventModel.aggregate([
    { $match: { ok: false, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { type: "$type", message: "$errorMessage", status: "$httpStatus" },
        count: { $sum: 1 },
        users: { $addToSet: "$userId" },
        guests: { $addToSet: { $cond: [{ $eq: ["$userId", null] }, "$clientId", "$$REMOVE"] } },
        firstAt: { $min: "$createdAt" },
        lastAt: { $max: "$createdAt" },
        where: { $addToSet: "$meta.where" },
      },
    },
    { $sort: { lastAt: -1 } },
  ]);
  return groups.map((g) => ({
    type: g._id.type as string,
    message: (g._id.message as string) || "（沒有錯誤訊息）",
    httpStatus: (g._id.status as number | undefined) ?? null,
    count: g.count as number,
    affectedUsers: (g.users as unknown[]).filter(Boolean).length,
    affectedGuests: (g.guests as unknown[]).filter(Boolean).length,
    where: (g.where as unknown[]).filter(Boolean).map(String),
    firstAt: g.firstAt as Date,
    lastAt: g.lastAt as Date,
  }));
}

/* ------------------------------------------------------------
 * 操作紀錄
 * ------------------------------------------------------------ */
export async function getAdminLogs(limit = 100) {
  await connectDB();
  const logs = await AdminLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  return logs.map((l) => ({
    id: String(l._id),
    actorEmail: l.actorEmail,
    action: l.action,
    targetId: l.targetId ? String(l.targetId) : null,
    targetEmail: l.targetEmail,
    changes: l.changes as Record<string, { from: unknown; to: unknown }>,
    createdAt: l.createdAt as Date,
  }));
}
