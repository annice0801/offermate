/**
 * 系統設定表單
 * ------------------------------------------------------------
 *   - 需要登入才能面試（開關）
 *   - 模型價格表：每 100 萬 token 的美元價格，可新增 / 刪除模型
 *   - 網路搜尋單價、匯率
 * 送出 → PUT /api/admin/settings
 */
"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "./ui";

interface Price {
  model: string;
  inputPerM: number;
  cachedInputPerM: number;
  outputPerM: number;
}
interface Settings {
  requireLogin: boolean;
  pricing: Price[];
  webSearchPerCallUsd: number;
  usdToTwd: number;
}

export default function SettingsForm({ initial, currentModel, canEdit }: { initial: Settings; currentModel: string; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [state, setState] = useState<{ type: "idle" | "saving" | "ok" | "error"; message?: string }>({ type: "idle" });
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const hasCurrentModel = form.pricing.some((p) => p.model.trim() === currentModel);

  function setPrice(i: number, patch: Partial<Price>) {
    setForm({ ...form, pricing: form.pricing.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  }

  async function save() {
    setState({ type: "saving" });
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "儲存失敗");
      setState({ type: "ok", message: "已儲存" });
      router.refresh();
    } catch (err) {
      setState({ type: "error", message: err instanceof Error ? err.message : "儲存失敗" });
    }
  }

  const input = "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-accent-bright/50 disabled:opacity-60";
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-4">
      {!canEdit && <p className="rounded-xl bg-sky/20 px-3 py-2 text-sm">你是客服（唯讀）權限，只能查看設定。</p>}

      <Panel title="使用權限">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.requireLogin}
            disabled={!canEdit}
            onChange={(e) => setForm({ ...form, requireLogin: e.target.checked })}
            className="mt-1 size-4 accent-[var(--color-accent)]"
          />
          <span>
            <span className="block text-sm font-medium">需要登入才能開始模擬面試</span>
            <span className="block text-xs text-muted">關閉時訪客也能使用（以匿名 ID 統計）；開啟後可以完整追蹤每位使用者，也能用會員等級做限制。</span>
          </span>
        </label>
      </Panel>

      <Panel title="成本估算價格（美元）">
        <p className="mb-3 text-xs text-muted">
          每 100 萬 token 的價格，請以 OpenAI 官網公告為準。修改後只影響之後的紀錄，過去的成本不會重算。
        </p>
        {!hasCurrentModel && (
          <p className="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">⚠ 價格表沒有目前使用的模型「{currentModel}」，新的使用紀錄只會計算網路搜尋費用。</p>
        )}
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-1 py-1 font-medium">模型</th>
                <th className="px-1 py-1 font-medium">輸入</th>
                <th className="px-1 py-1 font-medium">快取輸入</th>
                <th className="px-1 py-1 font-medium">輸出</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {form.pricing.map((p, i) => (
                <tr key={i}>
                  <td className="px-1 py-1">
                    <input value={p.model} disabled={!canEdit} onChange={(e) => setPrice(i, { model: e.target.value })} className={`${input} font-mono`} aria-label="模型名稱" />
                  </td>
                  {(["inputPerM", "cachedInputPerM", "outputPerM"] as const).map((k) => (
                    <td key={k} className="px-1 py-1">
                      <input type="number" min={0} step="0.001" value={p[k]} disabled={!canEdit} onChange={(e) => setPrice(i, { [k]: num(e.target.value) })} className={input} aria-label={k} />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    {canEdit && (
                      <button onClick={() => setForm({ ...form, pricing: form.pricing.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad" aria-label="刪除這個模型">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <button
            onClick={() => setForm({ ...form, pricing: [...form.pricing, { model: "", inputPerM: 0, cachedInputPerM: 0, outputPerM: 0 }] })}
            className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <Plus className="size-4" />
            新增模型
          </button>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">網路搜尋每次呼叫（USD）</span>
            <input type="number" min={0} step="0.001" value={form.webSearchPerCallUsd} disabled={!canEdit} onChange={(e) => setForm({ ...form, webSearchPerCallUsd: num(e.target.value) })} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">美元兌新台幣匯率</span>
            <input type="number" min={0} step="0.01" value={form.usdToTwd} disabled={!canEdit} onChange={(e) => setForm({ ...form, usdToTwd: num(e.target.value) })} className={input} />
          </label>
        </div>
      </Panel>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={!dirty || state.type === "saving"} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent disabled:bg-ink/10 disabled:text-muted">
            {state.type === "saving" ? "儲存中…" : "儲存設定"}
          </button>
          {dirty && <button onClick={() => setForm(initial)} className="text-sm text-muted hover:text-ink">取消</button>}
          {state.message && <span className={`text-sm ${state.type === "error" ? "text-bad" : "text-good"}`}>{state.message}</span>}
        </div>
      )}
    </div>
  );
}
