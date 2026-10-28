/**
 * 會員詳細頁的「管理設定」面板：會員等級、權限、停權、備註
 * ------------------------------------------------------------
 * 送出 → PATCH /api/admin/users/:id → 成功後 router.refresh() 重新讀取伺服器資料。
 * 伺服器才是最後把關的人；這裡的停用只是讓畫面更清楚。
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLANS, PLAN_LABELS, ROLES, ROLE_LABELS, type Plan, type Role, type UserStatus } from "@/lib/roles";

interface Props {
  userId: string;
  initial: { role: Role; plan: Plan; status: UserStatus; adminNote: string };
  canEdit: boolean; // 目前登入者是 admin
  lockAccess: string | null; // 不能改權限 / 狀態的原因（自己、擁有者），null 表示可以改
}

export default function UserEditor({ userId, initial, canEdit, lockAccess }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [state, setState] = useState<{ type: "idle" | "saving" | "ok" | "error"; message?: string }>({ type: "idle" });
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  async function save(next = form) {
    if (next.status === "suspended" && initial.status !== "suspended" && !confirm("確定要停權這位會員嗎？停權後對方會立即被登出，也無法使用模擬面試。")) return;
    setState({ type: "saving" });
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "儲存失敗");
      setState({ type: "ok", message: "已儲存" });
      router.refresh();
    } catch (err) {
      setState({ type: "error", message: err instanceof Error ? err.message : "儲存失敗" });
    }
  }

  const field = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-bright/50 disabled:opacity-60";
  const accessDisabled = !canEdit || !!lockAccess;

  return (
    <div className="space-y-4">
      {!canEdit && <p className="rounded-xl bg-sky/20 px-3 py-2 text-xs">你是客服（唯讀）權限，只能查看。</p>}

      <label className="block">
        <span className="mb-1 block text-xs text-muted">會員等級</span>
        <select value={form.plan} disabled={!canEdit} onChange={(e) => setForm({ ...form, plan: e.target.value as Plan })} className={field}>
          {PLANS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted">後台權限</span>
        <select value={form.role} disabled={accessDisabled} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={field}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <span className="mt-1 block text-[11px] text-muted">客服可以看後台但不能修改；管理員可以修改所有設定。</span>
      </label>

      <div>
        <span className="mb-1 block text-xs text-muted">帳號狀態</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-paper p-1">
          {(["active", "suspended"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={accessDisabled}
              onClick={() => setForm({ ...form, status: s })}
              className={`rounded-lg py-1.5 text-sm transition disabled:opacity-60 ${
                form.status === s ? (s === "suspended" ? "bg-bad text-white" : "bg-good text-white") : "text-muted hover:bg-white"
              }`}
            >
              {s === "active" ? "● 正常" : "⛔ 停權"}
            </button>
          ))}
        </div>
      </div>
      {lockAccess && canEdit && <p className="text-[11px] text-muted">🔒 {lockAccess}</p>}

      <label className="block">
        <span className="mb-1 block text-xs text-muted">管理員備註（只有後台看得到）</span>
        <textarea
          value={form.adminNote}
          disabled={!canEdit}
          onChange={(e) => setForm({ ...form, adminNote: e.target.value })}
          rows={3}
          maxLength={1000}
          placeholder="例如：企業方案試用到 12/31"
          className={field}
        />
      </label>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => save()}
            disabled={!dirty || state.type === "saving"}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-accent disabled:bg-ink/10 disabled:text-muted"
          >
            {state.type === "saving" ? "儲存中…" : "儲存變更"}
          </button>
          {dirty && <button onClick={() => setForm(initial)} className="text-sm text-muted hover:text-ink">取消</button>}
          {state.message && <span className={`text-sm ${state.type === "error" ? "text-bad" : "text-good"}`}>{state.message}</span>}
        </div>
      )}
    </div>
  );
}
