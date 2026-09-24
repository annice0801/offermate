/**
 * API Key 設定（Header 右上角的按鈕 + 設定視窗）
 * ------------------------------------------------------------
 * 流程：輸入金鑰 → 按「測試並儲存」→ 後端用這把金鑰向 OpenAI 做一次輕量驗證
 *      → 成功才存進 localStorage。
 */
"use client";

import { useEffect, useState } from "react";
import { API_KEY_HEADER, maskKey, onOpenApiKeySettings, saveApiKey, useApiKey } from "@/lib/api-key";

export default function ApiKeySettings() {
  const apiKey = useApiKey(); // 目前已儲存的金鑰（會隨儲存 / 清除自動更新）
  const [open, setOpen] = useState(false);

  // 讓其他元件可以透過 openApiKeySettings() 打開這個視窗
  useEffect(() => onOpenApiKeySettings(() => setOpen(true)), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-sm text-muted transition hover:bg-white hover:text-ink"
        aria-label="API Key 設定"
      >
        <span className={`size-2 rounded-full ${apiKey ? "bg-good" : "animate-pulse bg-warn"}`} />
        <span className="hidden sm:inline">{apiKey ? "API Key 已設定" : "設定 API Key"}</span>
        <span className="sm:hidden">Key</span>
      </button>

      {/* 條件渲染：關閉時整個視窗卸載，下次打開時輸入框狀態自動重置 */}
      {open && <SettingsDialog savedKey={apiKey} onClose={() => setOpen(false)} />}
    </>
  );
}

function SettingsDialog({ savedKey, onClose }: { savedKey: string; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "testing" | "ok" | "error"; message?: string }>({ type: "idle" });

  // 按 Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** 先向後端驗證金鑰，成功才儲存 */
  async function testAndSave() {
    const key = input.trim();
    if (!key) return;
    setStatus({ type: "testing" });
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json", [API_KEY_HEADER]: key },
        body: JSON.stringify({ action: "verify" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "驗證失敗");
      saveApiKey(key);
      setInput("");
      setStatus({ type: "ok", message: `驗證成功，已儲存（模型：${json.model}）` });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "驗證失敗" });
    }
  }

  return (
    // 半透明遮罩，點擊遮罩關閉
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-title"
        onClick={(e) => e.stopPropagation()} // 點視窗內部不要觸發遮罩的關閉
        className="glass-strong animate-rise w-full max-w-md rounded-3xl p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-widest text-accent">BRING YOUR OWN KEY</p>
            <h2 id="api-key-title" className="mt-1 text-xl font-semibold">OpenAI API Key 設定</h2>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full text-muted hover:bg-white" aria-label="關閉">
            ✕
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          OfferMate 使用你自己的 OpenAI 金鑰進行面試，費用直接計入你的 OpenAI 帳戶。還沒有金鑰？到{" "}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent underline">
            OpenAI 後台
          </a>{" "}
          建立一把。
        </p>

        {/* 目前狀態 */}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${savedKey ? "bg-good" : "bg-warn"}`} />
            {savedKey ? (
              <>
                已設定 <code className="font-mono text-xs text-muted">{maskKey(savedKey)}</code>
              </>
            ) : (
              "尚未設定"
            )}
          </span>
          {savedKey && (
            <button
              onClick={() => {
                saveApiKey("");
                setStatus({ type: "idle" });
              }}
              className="text-xs text-bad hover:underline"
            >
              清除
            </button>
          )}
        </div>

        {/* 輸入框 */}
        <label htmlFor="api-key-input" className="mt-5 mb-2 block text-sm font-medium">
          {savedKey ? "更換金鑰" : "輸入金鑰"}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="api-key-input"
              type={reveal ? "text" : "password"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && testAndSave()}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-white bg-white/80 py-2.5 pr-14 pl-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent-bright/50"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted hover:bg-ink/5"
            >
              {reveal ? "隱藏" : "顯示"}
            </button>
          </div>
          <button
            onClick={testAndSave}
            disabled={!input.trim() || status.type === "testing"}
            className="shrink-0 rounded-xl bg-ink px-4 text-sm font-medium text-white transition hover:bg-accent disabled:bg-ink/10 disabled:text-muted"
          >
            {status.type === "testing" ? "驗證中…" : "測試並儲存"}
          </button>
        </div>

        {status.message && (
          <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${status.type === "ok" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            {status.message}
          </p>
        )}

        {/* 隱私說明 */}
        <ul className="mt-5 space-y-1.5 border-t border-ink/10 pt-4 text-xs leading-relaxed text-muted">
          <li>🔒 金鑰只儲存在這個瀏覽器的 localStorage，不會上傳到任何資料庫。</li>
          <li>↗ 每次面試請求會透過 HTTPS 帶給伺服器轉呼叫 OpenAI，伺服器不保存、不記錄。</li>
          <li>⚠ 請勿在公用電腦上儲存金鑰；使用完畢可按「清除」。</li>
        </ul>
      </div>
    </div>
  );
}
