/**
 * /admin/errors 錯誤紀錄
 * ------------------------------------------------------------
 * 相同類型 + 相同訊息的錯誤合併成一組，依「最後發生時間」排序，
 * 一眼看出哪個問題最常出現、影響多少人、是不是還在發生。
 *
 * 常見類型：
 *   401 / 429 → 使用者的 OpenAI 金鑰或額度問題（不是網站的 bug）
 *   5xx       → 伺服器或 OpenAI 服務問題，需要處理
 *   前端錯誤  → 網路中斷、PNG 匯出失敗等瀏覽器端問題
 */
import { connection } from "next/server";
import Link from "next/link";
import { EVENT_LABELS, EmptyState, PageHeader } from "@/components/admin/ui";
import { getErrorGroups } from "@/lib/admin-stats";
import { formatDateTime, formatRelative } from "@/lib/format";

const RANGES = [7, 30, 90];

/** 依 HTTP 狀態碼判斷是「使用者端問題」還是「需要處理的 bug」 */
function classify(type: string, status: number | null) {
  if (status === 401 || status === 403 || status === 429) return { label: "使用者金鑰／額度", cls: "bg-warn-soft text-warn" };
  if (type === "client_error") return { label: "前端", cls: "bg-sky/30 text-ink" };
  return { label: "需要處理", cls: "bg-bad-soft text-bad" };
}

export default async function AdminErrorsPage({ searchParams }: PageProps<"/admin/errors">) {
  await connection(); // 只在真正有請求時執行（見 app/admin/layout.tsx）
  const { days: daysParam } = await searchParams;
  const days = RANGES.includes(Number(daysParam)) ? Number(daysParam) : 30;
  const groups = await getErrorGroups(days);
  const total = groups.reduce((a, g) => a + g.count, 0);

  return (
    <>
      <PageHeader
        title="錯誤紀錄"
        description={`最近 ${days} 天共 ${total} 次錯誤，合併為 ${groups.length} 種`}
        actions={
          <div className="admin-card flex rounded-full p-1 text-sm">
            {RANGES.map((d) => (
              <Link key={d} href={`/admin/errors?days=${d}`} className={`rounded-full px-3 py-1 transition ${d === days ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                {d} 天
              </Link>
            ))}
          </div>
        }
      />

      {groups.length ? (
        <ul className="space-y-3">
          {groups.map((g, i) => {
            const c = classify(g.type, g.httpStatus);
            return (
              <li key={i} className="admin-card rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${c.cls}`}>{c.label}</span>
                  <span className="text-muted">{EVENT_LABELS[g.type] ?? g.type}</span>
                  {g.httpStatus && <span className="font-mono text-muted">HTTP {g.httpStatus}</span>}
                  {g.where.length > 0 && <span className="font-mono text-muted">@ {g.where.join(", ")}</span>}
                  <span className="ml-auto text-muted">最後發生 {formatRelative(g.lastAt)}</span>
                </div>
                <p className="mt-2 font-mono text-sm break-all">{g.message}</p>
                <p className="mt-2 text-xs text-muted">
                  <span className="font-semibold text-ink tabular-nums">{g.count}</span> 次・影響會員 {g.affectedUsers} 人・訪客 {g.affectedGuests} 人・首次 {formatDateTime(g.firstAt)}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState>這段期間沒有錯誤 🎉</EmptyState>
      )}
    </>
  );
}
