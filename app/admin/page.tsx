/**
 * /admin 總覽
 * ------------------------------------------------------------
 *   第 1 排：四張指標卡（活躍會員、面試場數、估算成本、錯誤率），都和「上一期」比較
 *   第 2 排：使用趨勢面積圖（可切換指標）＋ 使用深度（完成率環 + 漏斗）
 *   第 3 排：會員等級環形圖、練習時段直條圖、其他指標
 *   第 4 排：最近活動、用量最高的會員、最近的錯誤
 * 右上角可切換統計區間（7 / 30 / 90 天）。
 *
 * 成本說明：目前是 BYOK（使用者用自己的 OpenAI 金鑰），費用由使用者負擔；
 * 這裡的成本是「使用者實際花在 OpenAI 的估算金額」，可以拿來評估之後改成平台付費時的定價。
 */
import { connection } from "next/server";
import { AlertTriangle, Coins, Download, Info, MessagesSquare, Settings, Users } from "lucide-react";
import Link from "next/link";
import BarChart from "@/components/admin/bar-chart";
import DonutChart from "@/components/admin/donut-chart";
import ProgressRing from "@/components/admin/progress-ring";
import TrendChart from "@/components/admin/trend-chart";
import { Avatar, EVENT_LABELS, EmptyState, KpiCard, Panel, changeOf } from "@/components/admin/ui";
import { getOverview } from "@/lib/admin-stats";
import { formatDateTime, formatDuration, formatNumber, formatRelative, formatTokens, formatTwd, formatUsd } from "@/lib/format";
import { PLAN_LABELS, type Plan } from "@/lib/roles";
import { getSettings } from "@/lib/settings";

const RANGES = [7, 30, 90];

// 會員等級的固定顏色（經過色盲安全驗證的三色組；同一個等級永遠同一色）
const PLAN_COLORS: Record<Plan, string> = { free: "#2a78d6", pro: "#eb6834", enterprise: "#1baf7a" };

export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  await connection(); // 只在真正有請求時執行（見 app/admin/layout.tsx）
  const { days: daysParam } = await searchParams;
  const days = RANGES.includes(Number(daysParam)) ? Number(daysParam) : 30;
  const [o, settings] = await Promise.all([getOverview(days), getSettings()]);
  const { cur, prev } = o;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const errorPoints = (cur.errorRate - prev.errorRate) * 100; // 錯誤率變化用「百分點」比較
  const completionRate = o.sessions.started ? o.sessions.completed / o.sessions.started : 0;
  const funnelTop = o.funnel[0]?.value || 0;
  const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <>
      {/* ---------- 標題列 ---------- */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{today}</p>
          <h1 className="text-2xl font-semibold">總覽</h1>
        </div>
        <div className="admin-card flex rounded-full p-1 text-sm">
          {RANGES.map((d) => (
            <Link
              key={d}
              href={`/admin?days=${d}`}
              className={`rounded-full px-3.5 py-1 transition ${d === days ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {d} 天
            </Link>
          ))}
        </div>
      </div>

      {/* ---------- 第 1 排：指標卡 ---------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard Icon={Users} label="活躍會員" value={formatNumber(cur.activeUsers)} change={changeOf(cur.activeUsers, prev.activeUsers)} hint={`新註冊 ${cur.newUsers} 人`} />
        <KpiCard Icon={MessagesSquare} label="模擬面試" value={`${formatNumber(cur.sessions)} 場`} change={changeOf(cur.sessions, prev.sessions)} hint={`完成 ${cur.completed} 場`} />
        <KpiCard
          Icon={Coins}
          label="估算成本"
          value={formatUsd(cur.costUsd)}
          change={changeOf(cur.costUsd, prev.costUsd)}
          goodWhenUp={false}
          hint={`≈ ${formatTwd(cur.costUsd, settings.usdToTwd)}`}
        />
        <KpiCard
          Icon={AlertTriangle}
          label="AI 請求錯誤率"
          value={pct(cur.errorRate)}
          change={Math.abs(errorPoints) < 0.05 ? 0 : Math.sign(errorPoints)}
          changeText={`${Math.abs(errorPoints).toFixed(1)} 個百分點`}
          goodWhenUp={false}
          hint={`${cur.aiErrors} / ${cur.aiRequests} 次`}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted">▲▼ 與前 {days} 天比較</p>

      {/* ---------- 第 2 排：趨勢 + 使用深度 ---------- */}
      <div className="mt-3 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <TrendChart data={o.series} />
        </Panel>

        <Panel title="使用深度">
          <div className="flex items-center gap-4">
            <ProgressRing value={completionRate} label="完成率" />
            <dl className="space-y-1.5 text-sm">
              {[
                ["平均每場", o.sessions.avgDurationMs ? formatDuration(o.sessions.avgDurationMs) : "—"],
                ["平均總分", o.sessions.avgScore !== null ? String(Math.round(o.sessions.avgScore)) : "—"],
                ["每場成本", formatUsd(o.sessions.avgCostUsd)],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 漏斗：每一步還剩多少比例的練習 */}
          <ol className="mt-5 space-y-2.5">
            {o.funnel.map((f, i) => {
              const ratio = funnelTop ? f.value / funnelTop : 0;
              return (
                <li key={f.label}>
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span>
                      <span className="mr-1.5 text-muted tabular-nums">{i + 1}</span>
                      {f.label}
                    </span>
                    <span className="tabular-nums">
                      {f.value}
                      {i > 0 && <span className="ml-1.5 text-muted">{pct(ratio)}</span>}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(ratio * 100, f.value ? 2 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      {/* ---------- 第 3 排：會員等級、練習時段、其他指標 ---------- */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="會員等級分布" actions={<Link href="/admin/users" className="text-xs text-accent hover:underline">管理</Link>}>
          <DonutChart
            centerLabel="位會員"
            slices={(Object.keys(PLAN_COLORS) as Plan[]).map((p) => ({ key: p, label: PLAN_LABELS[p], value: o.users.byPlan[p] ?? 0, color: PLAN_COLORS[p] }))}
          />
          <p className="mt-4 text-xs text-muted">
            停權 {o.users.suspended} 人・未登入訪客 {o.users.guests} 人（{days} 天內）
          </p>
        </Panel>

        <Panel title="練習時段（台灣時間）">
          <BarChart data={o.hours.map((h) => ({ label: `${h.hour}時`, value: h.count }))} unit="場" tickEvery={6} />
          <p className="mt-1 text-xs text-muted">開始模擬面試的時間，適合用來安排公告或維護時段</p>
        </Panel>

        <Panel title="其他指標" className="md:col-span-2 xl:col-span-1">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 xl:grid-cols-2">
            {[
              ["會員總數", `${formatNumber(o.users.total)} 人`],
              ["診斷書下載", `${cur.downloadsPdf + cur.downloadsPng} 次`],
              ["PDF／PNG", `${cur.downloadsPdf}／${cur.downloadsPng}`],
              ["平均 AI 回應", cur.avgAiMs ? formatDuration(cur.avgAiMs) : "—"],
              ["輸入 Token", formatTokens(cur.inputTokens)],
              ["輸出 Token", formatTokens(cur.outputTokens)],
              ["快取命中率", cur.inputTokens ? pct(cur.cachedInputTokens / cur.inputTokens) : "—"],
              ["網路搜尋", `${cur.webSearchCalls} 次`],
              ["前端錯誤", `${cur.clientErrors} 次`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/70 pt-4 text-xs">
            {/* 下載檔案要整頁請求 API，不能用 <Link> 的前端路由 */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/users/export" className={QUICK}>
              <QuickIcon Icon={Download} />
              匯出會員
            </a>
            <Link href="/admin/errors" className={QUICK}>
              <QuickIcon Icon={AlertTriangle} />
              錯誤紀錄
            </Link>
            <Link href="/admin/settings" className={QUICK}>
              <QuickIcon Icon={Settings} />
              系統設定
            </Link>
          </div>
        </Panel>
      </div>

      {/* ---------- 第 4 排：最近活動、用量排行、最近錯誤 ---------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="最近活動" className="xl:col-span-2">
          {o.recentEvents.length ? (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-2 pb-2 font-medium">時間</th>
                    <th className="px-2 pb-2 font-medium">使用者</th>
                    <th className="px-2 pb-2 font-medium">事件</th>
                    <th className="px-2 pb-2 font-medium">公司</th>
                    <th className="px-2 pb-2 text-right font-medium">成本</th>
                  </tr>
                </thead>
                <tbody>
                  {o.recentEvents.map((e) => (
                    <tr key={e.id} className="border-t border-line/50">
                      <td className="px-2 py-2 text-xs whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</td>
                      <td className="max-w-40 truncate px-2 py-2">
                        {e.userId ? (
                          <Link href={`/admin/users/${e.userId}`} className="hover:text-accent">
                            {e.userName}
                          </Link>
                        ) : (
                          <span className="text-muted">訪客</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${e.ok ? "bg-accent-soft text-accent" : "bg-bad-soft text-bad"}`}>
                          {e.ok ? "" : "✕ "}
                          {EVENT_LABELS[e.type] ?? e.type}
                          {e.questionNo ? ` #${e.questionNo}` : ""}
                        </span>
                      </td>
                      <td className="max-w-40 truncate px-2 py-2 text-muted">{e.company || "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{e.costUsd ? formatUsd(e.costUsd) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>還沒有任何活動，去跑一場模擬面試試試看吧</EmptyState>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="用量最高的會員" actions={<Link href="/admin/users?sort=cost" className="text-xs text-accent hover:underline">全部</Link>}>
            {o.topUsers.length ? (
              <ul className="space-y-1">
                {o.topUsers.map((u) => (
                  <li key={u.id}>
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition hover:bg-paper">
                      <Avatar src={u.picture} name={u.name || u.email} />
                      <span className="min-w-0 flex-1 truncate">{u.name || u.email}</span>
                      <span className="shrink-0 text-right text-xs tabular-nums">
                        {formatUsd(u.costUsd)}
                        <span className="block text-muted">{formatTokens(u.tokens)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>這段期間還沒有會員使用</EmptyState>
            )}
          </Panel>

          <Panel title="最近的錯誤" actions={<Link href="/admin/errors" className="text-xs text-accent hover:underline">全部</Link>}>
            {o.recentErrors.length ? (
              <ul className="space-y-2">
                {o.recentErrors.map((e) => (
                  <li key={e.id} className="rounded-xl bg-bad-soft/60 px-3 py-2 text-xs">
                    <p className="flex justify-between gap-2 text-muted">
                      <span>
                        {EVENT_LABELS[e.type] ?? e.type}
                        {e.httpStatus ? `・${e.httpStatus}` : ""}
                      </span>
                      <span>{formatRelative(e.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-bad">{e.message || "（沒有錯誤訊息）"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>這段期間沒有錯誤 🎉</EmptyState>
            )}
          </Panel>
        </div>
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-muted">
        <Info className="mt-px size-4 shrink-0 text-accent" />
        目前是 BYOK 模式，OpenAI 費用由使用者自己的金鑰支付；估算成本可作為日後平台代付時的定價參考。價格可到「系統設定」調整。
      </p>
    </>
  );
}

const QUICK = "flex flex-col items-center gap-1.5 rounded-xl py-2 text-muted transition hover:bg-paper hover:text-ink";

function QuickIcon({ Icon }: { Icon: typeof Download }) {
  return (
    <span className="grid size-8 place-items-center rounded-xl border border-line/70">
      <Icon className="size-4" />
    </span>
  );
}
