/**
 * 設定頁的「你的履歷」區塊（選填）
 * ------------------------------------------------------------
 *   未登入 → 提示登入後才能上傳（履歷存在會員帳號裡）
 *   已登入 → 列出保存的履歷，可上傳 PDF、刪除、選一份給這場面試用
 *   選好之後 → 按「分析履歷」由 AI 讀履歷、對照職缺，列出面試官的追問重點
 *             使用者可以刪掉不想被問的重點；履歷或職缺改了會提示重新分析
 *
 * 履歷清單與上傳 / 刪除由這個元件自己處理；
 * 選了哪一份、分析結果（candidate）則交給父元件（SetupForm）保存，開始面試時一起送出。
 */
"use client";

import { FileText, Loader2, RefreshCw, Sparkles, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/lib/auth-client";
import { FOCUS_LABELS, type CandidateBrief, type FocusType } from "@/lib/types";

interface ResumeItem {
  id: string;
  fileName: string;
  pages: number;
  chars: number;
  createdAt: string;
}

interface Props {
  resumeId: string | null;
  onSelect: (id: string | null) => void;
  candidate: CandidateBrief | null;
  onCandidateChange: (c: CandidateBrief | null) => void;
  stale: boolean; // 分析之後履歷或職缺有改過
  analyzing: boolean;
  analyzeError: string | null;
  analyzeBlocker: string | null; // 不能分析的原因（例如還沒填職缺）；null 表示可以分析
  onAnalyze: () => void;
}

// 追問重點類型的顏色（文字標籤一律附上，不只靠顏色辨識）
const FOCUS_STYLE: Record<FocusType, string> = {
  highlight: "bg-accent-soft text-accent",
  verify: "bg-sky/30 text-ink",
  gap: "bg-warn-soft text-warn",
  mismatch: "bg-bad-soft text-bad",
  skill: "bg-lilac/40 text-ink",
};

export default function ResumePanel(props: Props) {
  const { resumeId, onSelect, candidate, onCandidateChange, stale, analyzing, analyzeError, analyzeBlocker, onAnalyze } = props;
  const user = useCurrentUser();
  const [resumes, setResumes] = useState<ResumeItem[] | null>(null);
  const [busy, setBusy] = useState<"upload" | string | null>(null); // 上傳中，或正在刪除的履歷 ID
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 登入狀態確定後才載入履歷清單
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/resumes", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => !cancelled && setResumes(json.resumes ?? []))
      .catch(() => !cancelled && setResumes([]));
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function upload(file: File) {
    setBusy("upload");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "上傳失敗");
      setResumes((list) => [json.resume, ...(list ?? [])]);
      onSelect(json.resume.id); // 上傳後直接選用
      onCandidateChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = ""; // 讓同一個檔案可以再選一次
    }
  }

  async function remove(item: ResumeItem) {
    if (!confirm(`確定要刪除「${item.fileName}」嗎？刪除後無法復原。`)) return;
    setBusy(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "刪除失敗");
      setResumes((list) => (list ?? []).filter((r) => r.id !== item.id));
      if (resumeId === item.id) {
        onSelect(null);
        onCandidateChange(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setBusy(null);
    }
  }

  function removeFocus(index: number) {
    if (!candidate) return;
    onCandidateChange({ ...candidate, focusPoints: candidate.focusPoints.filter((_, i) => i !== index) });
  }

  // ---------- 未登入 / 查詢中 ----------
  if (user === undefined) return <div className="h-16 animate-pulse rounded-2xl bg-ink/5" />;
  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-ink/15 px-4 py-3 text-sm">
        <span className="text-muted">登入後可以上傳履歷，面試官會依你的經歷出題。</span>
        <Link href="/login" className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-white hover:bg-accent">
          登入
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ---------- 履歷清單 ---------- */}
      <div className="space-y-2">
        {resumes === null ? (
          <div className="h-12 animate-pulse rounded-xl bg-ink/5" />
        ) : (
          resumes.map((r) => {
            const selected = r.id === resumeId;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  selected ? "border-accent bg-accent-soft/50" : "border-white bg-white/60 hover:bg-white"
                }`}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="resume"
                    checked={selected}
                    onChange={() => {
                      onSelect(r.id);
                      onCandidateChange(null);
                    }}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <FileText className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.fileName}</span>
                    <span className="block text-xs text-muted">
                      {r.pages} 頁・{r.chars.toLocaleString()} 字
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => remove(r)}
                  disabled={busy === r.id}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-bad-soft hover:text-bad"
                  aria-label={`刪除 ${r.fileName}`}
                >
                  {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </div>
            );
          })
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy === "upload" || (resumes?.length ?? 0) >= 5}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-medium transition hover:bg-white disabled:opacity-50"
          >
            {busy === "upload" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy === "upload" ? "讀取中…" : "上傳 PDF 履歷"}
          </button>
          {resumeId && (
            <button type="button" onClick={() => { onSelect(null); onCandidateChange(null); }} className="text-xs text-muted hover:text-ink">
              這次不使用履歷
            </button>
          )}
          <span className="text-xs text-muted">4MB 以內・最多 5 份・只保存文字，不保存原始檔</span>
        </div>
        {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
      </div>

      {/* ---------- 分析結果：面試官的追問重點 ---------- */}
      {resumeId && (
        <div className="rounded-2xl bg-white/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-accent" />
              面試官的追問重點
            </p>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={analyzing || !!analyzeBlocker}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-accent disabled:bg-ink/10 disabled:text-muted"
            >
              {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : candidate ? <RefreshCw className="size-3.5" /> : <Sparkles className="size-3.5" />}
              {analyzing ? "分析中…" : candidate ? "重新分析" : "分析履歷"}
            </button>
          </div>

          {analyzeBlocker && !candidate && <p className="mt-2 text-xs text-muted">{analyzeBlocker}</p>}
          {analyzeError && <p className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{analyzeError}</p>}
          {stale && candidate && (
            <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">職缺內容改過了，建議重新分析，追問重點才會對得上。</p>
          )}

          {candidate ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-muted">{candidate.summary}</p>
              {candidate.experience && (
                <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs">
                  <span className="font-medium">
                    總年資 {candidate.experience.totalYears} 年・相關年資 {candidate.experience.relevantYears} 年
                    {candidate.experience.careerChange && <span className="ml-1.5 rounded-full bg-warn-soft px-2 py-0.5 text-warn">轉換跑道</span>}
                  </span>
                  <span className="mt-0.5 block text-muted">{candidate.experience.note}（已帶入下方「你的年資」，可以修改）</span>
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {candidate.focusPoints.map((p, i) => (
                  <li key={`${p.title}-${i}`} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${FOCUS_STYLE[p.type]}`}>{FOCUS_LABELS[p.type]}</span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium">{p.title}</span>
                      <span className="block text-xs text-muted">{p.detail}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFocus(i)}
                      className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
                      aria-label="不要問這一點"
                      title="不要問這一點"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">不想被問的點可以按 × 刪除；想加的重點寫在下方「面試官規則」。</p>
            </>
          ) : (
            !analyzeBlocker && (
              <p className="mt-2 text-xs text-muted">
                AI 會讀你的履歷、對照職缺，列出面試官打算深挖的經歷、要驗證的數字、空窗期與職缺落差。沒有先分析的話，按「開始面試」時會自動分析。
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
