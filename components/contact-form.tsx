/**
 * 功能建議回報 / 聯絡我們 表單
 * ------------------------------------------------------------
 * 送出到 /api/feedback，內容包含：回報類型、Email、稱呼（選填）、內容。
 * 送出成功後顯示感謝訊息，並可以再寫一則。
 */
"use client";

import { useState } from "react";
import { FEEDBACK_TYPES, type FeedbackRequest, type FeedbackType } from "@/lib/types";

const MAX = 2000;

export default function ContactForm() {
  const [type, setType] = useState<FeedbackType>("功能建議");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // 蜜罐欄位（隱藏）
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const body: FeedbackRequest = { type, email, name, message, website };
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "送出失敗");
      setStatus("sent");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "送出失敗");
    }
  }

  // ---------- 送出成功畫面 ----------
  if (status === "sent") {
    return (
      <div className="glass-strong flex flex-col items-center rounded-3xl px-6 py-14 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-full bg-good-soft text-2xl text-good">✓</span>
        <h3 className="mt-5 text-xl font-semibold">已收到，謝謝你！</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          我們會仔細閱讀每一則回饋，必要時會透過 <span className="font-medium text-ink">{email}</span> 與你聯繫。
        </p>
        <button onClick={() => setStatus("idle")} className="mt-6 rounded-full bg-white/80 px-5 py-2 text-sm font-medium hover:bg-white">
          再寫一則
        </button>
      </div>
    );
  }

  // ---------- 表單 ----------
  return (
    <form onSubmit={handleSubmit} className="glass-strong space-y-5 rounded-3xl p-6 sm:p-8">
      {/* 回報類型：分段按鈕 */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">回報類型</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEEDBACK_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                type === t ? "bg-ink text-white shadow-md" : "bg-white/60 text-muted hover:bg-white hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">
            Email <span className="text-bad">*</span>
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">
            稱呼 <span className="font-normal text-muted">（選填）</span>
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="怎麼稱呼你？" autoComplete="name" className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 flex justify-between text-sm font-medium">
          <span>
            內容 <span className="text-bad">*</span>
          </span>
          <span className={`font-mono text-xs font-normal ${message.length > MAX ? "text-bad" : "text-muted"}`}>
            {message.length} / {MAX}
          </span>
        </span>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === "問題回報" ? "發生了什麼事？在哪個步驟？瀏覽器 / 裝置是？" : "希望 OfferMate 增加什麼功能，或有什麼想法想告訴我們？"
          }
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </label>

      {/* 蜜罐欄位：用 CSS 移出畫面，真人看不到也不會填；tabIndex=-1 讓鍵盤也跳過它 */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] size-px opacity-0"
        aria-hidden
      />

      {status === "error" && <p className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending" || message.length > MAX}
        className="w-full rounded-full bg-ink py-3.5 font-medium text-white transition hover:bg-accent disabled:bg-ink/10 disabled:text-muted sm:w-auto sm:px-10"
      >
        {status === "sending" ? "送出中…" : "送出"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-white bg-white/60 px-4 py-3 text-[15px] outline-none transition placeholder:text-muted/60 focus:bg-white focus:ring-4 focus:ring-accent-bright/20";
