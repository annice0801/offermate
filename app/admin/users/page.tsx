/**
 * /admin/users 會員管理
 * ------------------------------------------------------------
 * 篩選條件放在網址（?q=&role=&plan=&status=&sort=），重新整理或分享連結都會保留。
 * 篩選表單是一般的 GET 表單，不需要 JavaScript 也能用。
 * 「匯出 CSV」會帶上同樣的篩選條件。
 */
import { connection } from "next/server";
import { Download } from "lucide-react";
import Link from "next/link";
import { Avatar, EmptyState, PageHeader, PlanBadge, RoleBadge, StatusBadge } from "@/components/admin/ui";
import { getUserRows } from "@/lib/admin-stats";
import { formatDate, formatDuration, formatRelative, formatTokens, formatUsd } from "@/lib/format";
import { PLANS, PLAN_LABELS, ROLES, ROLE_LABELS, STATUS_LABELS, USER_STATUSES } from "@/lib/roles";

const SORTS = [
  { value: "active", label: "最近活躍" },
  { value: "newest", label: "最新註冊" },
  { value: "sessions", label: "練習最多" },
  { value: "cost", label: "成本最高" },
  { value: "errors", label: "錯誤最多" },
];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await connection(); // 只在真正有請求時執行（見 app/admin/layout.tsx）
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const filter = { q: one(sp.q), role: one(sp.role), plan: one(sp.plan), status: one(sp.status), sort: one(sp.sort) };
  const rows = await getUserRows(filter);
  const exportQuery = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString();

  const select = "rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-bright/50";

  return (
    <>
      <PageHeader
        title="會員管理"
        description={`共 ${rows.length} 位會員${filter.q || filter.role || filter.plan || filter.status ? "（已套用篩選）" : ""}`}
        actions={
          <a href={`/api/admin/users/export${exportQuery ? `?${exportQuery}` : ""}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-sm font-medium transition hover:bg-white">
            <Download className="size-4" />
            匯出 CSV
          </a>
        }
      />

      <form className="admin-card mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <input name="q" defaultValue={filter.q} placeholder="搜尋 Email 或名字" className={`${select} min-w-0 flex-1 basis-48`} />
        <select name="plan" defaultValue={filter.plan ?? ""} className={select} aria-label="會員等級">
          <option value="">所有等級</option>
          {PLANS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <select name="role" defaultValue={filter.role ?? ""} className={select} aria-label="權限">
          <option value="">所有權限</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select name="status" defaultValue={filter.status ?? ""} className={select} aria-label="狀態">
          <option value="">所有狀態</option>
          {USER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select name="sort" defaultValue={filter.sort ?? "active"} className={select} aria-label="排序">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-accent">套用</button>
        {exportQuery && <Link href="/admin/users" className="px-2 text-sm text-muted hover:text-ink">清除</Link>}
      </form>

      {rows.length ? (
        <div className="admin-card overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">會員</th>
                <th className="px-3 py-3 font-medium">等級／權限</th>
                <th className="px-3 py-3 font-medium">狀態</th>
                <th className="px-3 py-3 text-right font-medium">練習（完成）</th>
                <th className="px-3 py-3 text-right font-medium">使用時間</th>
                <th className="px-3 py-3 text-right font-medium">下載</th>
                <th className="px-3 py-3 text-right font-medium">錯誤</th>
                <th className="px-3 py-3 text-right font-medium">Tokens／成本</th>
                <th className="px-4 py-3 font-medium">最後活動</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-ink/5 transition last:border-0 hover:bg-white/50">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <Avatar src={u.picture} name={u.name || u.email} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:text-accent">{u.name || "（未命名）"}</span>
                        <span className="block truncate text-xs text-muted">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <PlanBadge plan={u.plan} />
                      {u.role !== "user" && <RoleBadge role={u.role} />}
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={u.status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {u.sessions}
                    <span className="text-xs text-muted">（{u.completed}）</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.usageMs ? formatDuration(u.usageMs) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.downloads}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${u.errors ? "font-medium text-bad" : ""}`}>{u.errors}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatTokens(u.tokens)}
                    <span className="block text-xs text-muted">{formatUsd(u.costUsd)}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {formatRelative(u.lastSeenAt ?? u.lastLoginAt)}
                    <span className="block">註冊 {formatDate(u.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>找不到符合條件的會員</EmptyState>
      )}
    </>
  );
}
