/**
 * GET /api/admin/users/export — 下載會員清單 CSV（admin / support 都可以）
 * ------------------------------------------------------------
 * 套用和會員列表相同的篩選條件（?q=&role=&plan=&status=&sort=）。
 * 開頭加 BOM，Excel 打開中文才不會變亂碼。
 */
import { requireAdmin } from "@/lib/auth";
import { getUserRows } from "@/lib/admin-stats";
import { formatDateTime } from "@/lib/format";
import { PLAN_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/roles";

export async function GET(request: Request) {
  const actor = await requireAdmin("view");
  if (actor instanceof Response) return actor;

  const p = new URL(request.url).searchParams;
  const rows = await getUserRows({
    q: p.get("q") ?? undefined,
    role: p.get("role") ?? undefined,
    plan: p.get("plan") ?? undefined,
    status: p.get("status") ?? undefined,
    sort: p.get("sort") ?? undefined,
  });

  const header = ["Email", "名字", "權限", "會員等級", "狀態", "註冊時間", "最後登入", "最後使用", "練習場數", "完成場數", "使用分鐘", "下載次數", "錯誤次數", "Tokens", "估算成本(USD)"];
  const lines = rows.map((r) => [
    r.email,
    r.name,
    ROLE_LABELS[r.role],
    PLAN_LABELS[r.plan],
    STATUS_LABELS[r.status],
    formatDateTime(r.createdAt),
    formatDateTime(r.lastLoginAt),
    formatDateTime(r.lastSeenAt),
    r.sessions,
    r.completed,
    Math.round(r.usageMs / 60000),
    r.downloads,
    r.errors,
    r.tokens,
    r.costUsd.toFixed(4),
  ]);

  // 欄位含逗號、引號或換行時要用引號包起來；開頭是 = + - @ 的加單引號，避免被 Excel 當成公式執行
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [header, ...lines].map((line) => line.map(cell).join(",")).join("\n");
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offermate-users-${date}.csv"`,
    },
  });
}
