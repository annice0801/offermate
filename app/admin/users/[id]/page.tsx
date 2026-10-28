/**
 * /admin/users/:id 會員詳細
 * ------------------------------------------------------------
 *   左：基本資料、使用統計
 *   右：管理設定（等級 / 權限 / 停權 / 備註）
 *   中：總分變化（看練習有沒有進步）
 *   下：每一場練習、最近 50 筆事件、這位會員被修改過的紀錄
 */
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import BarChart from "@/components/admin/bar-chart";
import UserEditor from "@/components/admin/user-editor";
import { Avatar, EVENT_LABELS, EmptyState, Panel, PlanBadge, RoleBadge, StatTile, StatusBadge } from "@/components/admin/ui";
import { getUserDetail } from "@/lib/admin-stats";
import { getCurrentUser, isOwnerEmail } from "@/lib/auth";
import { formatDateTime, formatDuration, formatRelative, formatTokens, formatTwd, formatUsd } from "@/lib/format";
import { PLAN_LABELS, ROLE_LABELS, STATUS_LABELS, canEditAdmin, type Plan, type Role, type UserStatus } from "@/lib/roles";
import { getSettings } from "@/lib/settings";

const FIELD_LABELS: Record<string, string> = { role: "權限", plan: "會員等級", status: "狀態", adminNote: "備註" };
function describeValue(field: string, v: unknown) {
  if (field === "role") return ROLE_LABELS[v as Role] ?? String(v);
  if (field === "plan") return PLAN_LABELS[v as Plan] ?? String(v);
  if (field === "status") return STATUS_LABELS[v as UserStatus] ?? String(v);
  return String(v || "（空白）");
}

export default async function AdminUserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  await connection(); // 只在真正有請求時執行（見 app/admin/layout.tsx）
  const { id } = await params;
  const [detail, me, settings] = await Promise.all([getUserDetail(id), getCurrentUser(), getSettings()]);
  if (!detail || !me) notFound();
  const { user, sessions, events, logs } = detail;

  const lockAccess = user.id === me.id ? "不能修改自己的權限或狀態" : isOwnerEmail(user.email) ? "這是擁有者帳號（ADMIN_EMAILS），權限與狀態固定" : null;
  const completionRate = user.sessions ? Math.round((user.completed / user.sessions) * 100) : 0;
  const scored = sessions.filter((s) => s.overallScore !== null).reverse(); // 由舊到新

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" />
        會員列表
      </Link>

      <div className="admin-card mb-4 flex flex-wrap items-center gap-4 rounded-2xl p-4">
        <Avatar src={user.picture} name={user.name || user.email} size={12} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{user.name || "（未命名）"}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <PlanBadge plan={user.plan} />
          <RoleBadge role={user.role} />
          <StatusBadge status={user.status} />
        </div>
        <p className="w-full text-xs text-muted sm:w-auto">
          註冊 {formatDateTime(user.createdAt)}・最後登入 {formatRelative(user.lastLoginAt)}・最後使用 {formatRelative(user.lastSeenAt)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="模擬面試" value={`${user.sessions} 場`} hint={`完成 ${user.completed} 場（${completionRate}%）`} />
            <StatTile label="累計使用時間" value={user.usageMs ? formatDuration(user.usageMs) : "—"} />
            <StatTile label="下載診斷書" value={`${user.downloads} 次`} />
            <StatTile label="錯誤" value={`${user.errors} 次`} tone={user.errors ? "bad" : undefined} hint={user.errors ? "見下方事件紀錄" : "沒有遇到問題"} />
            <StatTile label="Token 用量" value={formatTokens(user.tokens)} />
            <StatTile label="估算成本" value={formatUsd(user.costUsd)} hint={`≈ ${formatTwd(user.costUsd, settings.usdToTwd)}`} />
          </div>

          {scored.length >= 2 && (
            <Panel title="總分變化（依練習順序）">
              <BarChart data={scored.map((s, i) => ({ label: `#${i + 1}`, value: s.overallScore ?? 0 }))} unit="分" tickEvery={Math.ceil(scored.length / 10)} height={110} />
              <p className="mt-1 text-xs text-muted">
                第一場 {scored[0].overallScore} 分 → 最近一場 {scored.at(-1)?.overallScore} 分
              </p>
            </Panel>
          )}

          <Panel title={`練習紀錄（最近 ${sessions.length} 場）`}>
            {sessions.length ? (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="px-2 py-2 font-medium">開始時間</th>
                      <th className="px-2 py-2 font-medium">公司／產業</th>
                      <th className="px-2 py-2 text-right font-medium">進度</th>
                      <th className="px-2 py-2 text-right font-medium">時間</th>
                      <th className="px-2 py-2 text-right font-medium">總分</th>
                      <th className="px-2 py-2 text-right font-medium">成本</th>
                      <th className="px-2 py-2 font-medium">狀況</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.sessionId} className="border-t border-ink/5">
                        <td className="px-2 py-2 text-xs whitespace-nowrap text-muted">{formatDateTime(s.startedAt)}</td>
                        <td className="px-2 py-2">
                          <span className="block max-w-48 truncate">{s.company || "—"}</span>
                          <span className="block max-w-48 truncate text-xs text-muted">{s.industry}</span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {s.answered}/{s.totalQuestions || "?"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{s.durationMs ? formatDuration(s.durationMs) : "—"}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{s.overallScore ?? "—"}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatUsd(s.costUsd)}</td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          {s.completed ? <span className="text-good">✓ 完成</span> : <span className="text-muted">未完成</span>}
                          {s.downloads > 0 && <span className="ml-1 text-muted">・下載 {s.downloads}</span>}
                          {s.errors > 0 && <span className="ml-1 text-bad">・錯誤 {s.errors}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>還沒有練習紀錄</EmptyState>
            )}
          </Panel>

          <Panel title="最近事件">
            {events.length ? (
              <ol className="-mr-2 max-h-[520px] space-y-1.5 overflow-y-auto pr-2">
                {events.map((e) => (
                  <li key={e.id} className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-xl px-3 py-2 text-sm ${e.ok ? "bg-white/50" : "bg-bad-soft/70"}`}>
                    <span className="w-28 shrink-0 text-xs text-muted tabular-nums">{formatDateTime(e.createdAt)}</span>
                    <span className={`font-medium ${e.ok ? "" : "text-bad"}`}>
                      {e.ok ? "" : "✕ "}
                      {EVENT_LABELS[e.type] ?? e.type}
                      {typeof e.meta.questionNo === "number" ? ` 第 ${e.meta.questionNo} 題` : ""}
                    </span>
                    {e.tokens > 0 && <span className="text-xs text-muted tabular-nums">{formatTokens(e.tokens)} tokens・{formatUsd(e.costUsd)}</span>}
                    {e.durationMs > 0 && <span className="text-xs text-muted tabular-nums">{formatDuration(e.durationMs)}</span>}
                    {!e.ok && <span className="w-full text-xs text-bad">{e.httpStatus ? `[${e.httpStatus}] ` : ""}{e.errorMessage}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState>還沒有任何事件</EmptyState>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="管理設定">
            <UserEditor
              userId={user.id}
              initial={{ role: user.role, plan: user.plan, status: user.status, adminNote: user.adminNote }}
              canEdit={canEditAdmin(me.role)}
              lockAccess={lockAccess}
            />
          </Panel>

          <Panel title="修改紀錄">
            {logs.length ? (
              <ol className="space-y-3 text-xs">
                {logs.map((l) => (
                  <li key={l.id}>
                    <p className="text-muted">
                      {formatDateTime(l.createdAt)}・{l.actorEmail}
                    </p>
                    {Object.entries(l.changes).map(([field, c]) => (
                      <p key={field} className="mt-0.5">
                        {FIELD_LABELS[field] ?? field}：<span className="text-muted line-through">{describeValue(field, c.from)}</span> → <span className="font-medium">{describeValue(field, c.to)}</span>
                      </p>
                    ))}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState>沒有修改紀錄</EmptyState>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
