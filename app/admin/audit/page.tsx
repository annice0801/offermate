/**
 * /admin/audit 操作紀錄
 * ------------------------------------------------------------
 * 後台的每一次修改（會員等級、權限、停權、備註、系統設定）都會留下紀錄，
 * 之後有多位管理員時，可以查到是誰在什麼時候改了什麼。
 */
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { getAdminLogs } from "@/lib/admin-stats";
import { formatDateTime } from "@/lib/format";
import { PLAN_LABELS, ROLE_LABELS, STATUS_LABELS, type Plan, type Role, type UserStatus } from "@/lib/roles";

const ACTION_LABELS: Record<string, string> = { "user.update": "修改會員", "settings.update": "修改系統設定" };
const FIELD_LABELS: Record<string, string> = {
  role: "權限",
  plan: "會員等級",
  status: "狀態",
  adminNote: "備註",
  requireLogin: "需要登入才能面試",
  pricing: "模型價格表",
  webSearchPerCallUsd: "網路搜尋價格",
  usdToTwd: "匯率",
};

function show(field: string, v: unknown) {
  if (field === "role") return ROLE_LABELS[v as Role] ?? String(v);
  if (field === "plan") return PLAN_LABELS[v as Plan] ?? String(v);
  if (field === "status") return STATUS_LABELS[v as UserStatus] ?? String(v);
  if (field === "requireLogin") return v ? "開啟" : "關閉";
  if (field === "pricing") return "（已更新）";
  return String(v ?? "") || "（空白）";
}

export default async function AdminAuditPage() {
  const logs = await getAdminLogs(200);

  return (
    <>
      <PageHeader title="操作紀錄" description="最近 200 筆後台修改" />
      {logs.length ? (
        <div className="admin-card overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">時間</th>
                <th className="px-3 py-3 font-medium">操作者</th>
                <th className="px-3 py-3 font-medium">動作</th>
                <th className="px-3 py-3 font-medium">對象</th>
                <th className="px-4 py-3 font-medium">變更內容</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-ink/5 align-top last:border-0">
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">{formatDateTime(l.createdAt)}</td>
                  <td className="px-3 py-2.5 text-xs">{l.actorEmail}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{ACTION_LABELS[l.action] ?? l.action}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {l.targetId ? <Link href={`/admin/users/${l.targetId}`} className="text-accent hover:underline">{l.targetEmail}</Link> : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {Object.entries(l.changes).map(([field, c]) => (
                      <p key={field}>
                        {FIELD_LABELS[field] ?? field}：<span className="text-muted line-through">{show(field, c.from)}</span> → <span className="font-medium">{show(field, c.to)}</span>
                      </p>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>還沒有任何後台修改紀錄</EmptyState>
      )}
    </>
  );
}
