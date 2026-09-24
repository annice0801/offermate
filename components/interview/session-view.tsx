/**
 * 階段 2：面試進行中
 * ------------------------------------------------------------
 * 頂部：AI 面試官角色資訊 + 音訊波形 + 進度條
 * 左側：對話串（題目 → 回答 → 回饋），底部是作答輸入框
 * 右側：開場搜尋到的面試情報
 *
 * 最後一題固定是「反問環節」：換求職者提問，面試官回答並評估提問品質。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { Interviewer, InterviewSetup, Question, Research, Turn } from "@/lib/types";
import type { Loading } from "./interview-app";
import FeedbackCard from "./feedback-card";
import Waveform from "@/components/waveform";

interface Props {
  setup: InterviewSetup;
  interviewer: Interviewer;
  research: Research;
  history: Turn[];
  currentQuestion: Question | null;
  pendingAnswer: string | null;
  loading: Loading;
  error: string | null;
  onAnswer: (answer: string) => void;
  onRetry: () => void;
  onRestart: () => void;
}

export default function SessionView(props: Props) {
  const { setup, interviewer, research, history, currentQuestion, pendingAnswer, loading, error, onAnswer, onRetry, onRestart } = props;
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentNo = Math.min(history.length + 1, setup.totalQuestions);
  const busy = loading !== null;
  const canSend = draft.trim().length > 0 && !busy && !!currentQuestion && !pendingAnswer;
  const isReverse = currentQuestion?.kind === "reverse";

  /*
   * 面試官「說話中」的狀態：新題目出現後，波形跳動一段時間（依題目長度，約 2~6 秒）
   * 作法：記錄「已經講完的題目」，當 currentQuestion 還不是它時就代表正在講
   * （計時結束才 setState，避免在 effect 裡同步 setState 造成多一次渲染）
   */
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const speaking = !!currentQuestion && spokenText !== currentQuestion.text && !pendingAnswer;
  useEffect(() => {
    if (!currentQuestion) return;
    const text = currentQuestion.text;
    const ms = Math.min(6000, Math.max(2000, text.length * 90));
    const id = setTimeout(() => setSpokenText(text), ms);
    return () => clearTimeout(id);
  }, [currentQuestion]);

  // 面試官目前狀態：思考中 / 說話中 / 聆聽中
  const status = busy
    ? { label: "思考中", active: true, dot: "bg-warn" }
    : speaking
      ? { label: "提問中", active: true, dot: "bg-accent-bright" }
      : { label: "聆聽中", active: false, dot: "bg-good" };

  // 對話更新時自動捲到最下面
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, currentQuestion, pendingAnswer, loading]);

  function send() {
    if (!canSend) return;
    onAnswer(draft.trim());
    setDraft("");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* ================= 頂部：面試官角色資訊 ================= */}
      <header className="glass-strong z-30 mb-6 rounded-3xl p-4 sm:mb-8 sm:p-5 lg:sticky lg:top-20">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={interviewer.name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{interviewer.name}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] text-muted">
                <span className={`size-1.5 rounded-full ${status.dot} ${status.active ? "animate-pulse" : ""}`} />
                {status.label}
              </span>
            </div>
            <p className="truncate text-sm text-muted">
              {interviewer.title} <span className="text-ink/30">at</span> {interviewer.organization}
            </p>
            <p className="mt-0.5 hidden truncate text-xs text-muted/80 sm:block">風格：{interviewer.style}</p>
          </div>
          {/* 音訊波形：說話 / 思考時跳動，聆聽時變平 */}
          <Waveform active={status.active} bars={36} className="h-10 w-full sm:w-56" />
        </div>

        {/* 進度條：每格一題，最後一格（反問環節）用不同樣式標示 */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {Array.from({ length: setup.totalQuestions }).map((_, i) => {
              const isReverseSlot = i === setup.totalQuestions - 1;
              const done = i < history.length;
              const now = i === history.length;
              return (
                <span
                  key={i}
                  title={isReverseSlot ? "反問環節" : `第 ${i + 1} 題`}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    done ? "bg-accent" : now ? "animate-pulse bg-accent-bright" : isReverseSlot ? "bg-lilac" : "bg-ink/10"
                  }`}
                />
              );
            })}
          </div>
          <span className="shrink-0 font-mono text-xs text-muted">
            {isReverse ? "反問環節" : `${String(currentNo).padStart(2, "0")} / ${String(setup.totalQuestions).padStart(2, "0")}`}
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* ================= 左側：對話 ================= */}
        <section className="min-w-0">
          <div className="space-y-6">
            {history.map((turn, i) => (
              <div key={i} className="space-y-4">
                <QuestionBubble no={i + 1} question={turn.question} interviewer={interviewer} />
                <AnswerBubble text={turn.answer} />
                {/* 反問環節：面試官先回答求職者的提問 */}
                {turn.feedback.interviewerReply && <ReplyBubble text={turn.feedback.interviewerReply} interviewer={interviewer} />}
                {/* 只有最新一題的示範改寫預設展開 */}
                <FeedbackCard feedback={turn.feedback} reverse={turn.question.kind === "reverse"} defaultOpen={i === history.length - 1} />
              </div>
            ))}

            {currentQuestion && <QuestionBubble no={history.length + 1} question={currentQuestion} interviewer={interviewer} />}
            {pendingAnswer && <AnswerBubble text={pendingAnswer} />}

            {loading === "answer" && <Thinking text={isReverse ? `${interviewer.name} 正在回答你的問題並評估提問品質…` : `${interviewer.name} 正在評分並思考下一題…`} />}
            {loading === "report" && <Thinking text="面試結束，正在開立「高管級面試戰力診斷書」…" />}
            {error && (
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-bad-soft px-5 py-4 text-sm text-bad">
                <span>{error}</span>
                <button onClick={onRetry} className="shrink-0 rounded-full bg-bad px-4 py-1.5 font-medium text-white hover:bg-ink">
                  重試
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 作答輸入框：固定在視窗底部 */}
          {currentQuestion && !pendingAnswer && (
            <div className="sticky bottom-4 mt-8">
              <div className={`glass-strong rounded-3xl p-3 ${isReverse ? "ring-2 ring-lilac" : "focus-within:ring-2 focus-within:ring-accent-bright/50"}`}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // ⌘/Ctrl + Enter 送出；isComposing 避免中文輸入法選字時誤送
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={4}
                  disabled={busy}
                  placeholder={
                    isReverse
                      ? "換你提問了！提出 1–3 個想問面試官的問題，例如這個職位前 90 天的成功標準、團隊目前最大的挑戰…"
                      : "輸入你的回答…建議用 STAR（情境、任務、行動、結果）結構作答"
                  }
                  className="w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-relaxed outline-none placeholder:text-muted/60"
                />
                <div className="flex items-center justify-between px-2">
                  <span className="font-mono text-[11px] text-muted">{draft.length} 字 · ⌘/Ctrl + Enter 送出</span>
                  <button
                    onClick={send}
                    disabled={!canSend}
                    className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white transition hover:bg-accent disabled:bg-ink/10 disabled:text-muted"
                  >
                    {isReverse ? "送出提問" : "送出回答"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ================= 右側：情報側欄 ================= */}
        <aside className="space-y-4 lg:sticky lg:top-60 lg:self-start">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs tracking-widest text-muted uppercase">面試情報</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  research.companyDataFound ? "bg-good-soft text-good" : "bg-warn-soft text-warn"
                }`}
              >
                {research.companyDataFound ? "公司面經" : "同業綜合"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">{research.summary}</p>

            <h3 className="mt-5 mb-2 text-xs font-semibold">常考重點</h3>
            <div className="flex flex-wrap gap-1.5">
              {research.focusAreas.map((f) => (
                <span key={f} className="rounded-full bg-white/80 px-2.5 py-1 text-xs">
                  {f}
                </span>
              ))}
            </div>

            {research.sources.length > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-xs font-semibold">參考來源</h3>
                <ul className="space-y-1.5">
                  {research.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-baseline gap-2 text-xs text-muted hover:text-ink"
                      >
                        <span className="text-accent">↗</span>
                        <span className="line-clamp-1 group-hover:underline">{s.title || hostname(s.url)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <button
            onClick={() => {
              if (confirm("確定要放棄這場面試並重新開始嗎？")) onRestart();
            }}
            className="glass w-full rounded-full py-2.5 text-sm text-muted transition hover:text-ink"
          >
            放棄並重新開始
          </button>
        </aside>
      </div>
    </div>
  );
}

/* ---------- 子元件 ---------- */

/** 面試官頭像：取名字第一個字，漸層圓形 + 右下角在線綠點 */
function Avatar({ name, size = "size-14 text-xl" }: { name: string; size?: string }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-bright to-[#3f7fd6] font-semibold text-white shadow-lg shadow-accent/25 ${size}`}
    >
      {name.trim().charAt(0).toUpperCase()}
      <span className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-white bg-good" />
    </span>
  );
}

function QuestionBubble({ no, question, interviewer }: { no: number; question: Question; interviewer: Interviewer }) {
  const reverse = question.kind === "reverse";
  return (
    <div className="animate-rise flex gap-3">
      <Avatar name={interviewer.name} size="size-9 text-sm" />
      <div
        className={`max-w-[90%] rounded-3xl rounded-tl-md p-5 ${
          reverse ? "border border-lilac bg-gradient-to-br from-white/90 to-lilac/30 shadow-lg shadow-lilac/30" : "glass"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
          <span>{reverse ? "FINAL" : `Q${no}`}</span>
          <span>·</span>
          <span>{question.category}</span>
          {question.kind === "follow-up" && <span className="rounded-full bg-accent px-2 py-0.5 text-white">追問</span>}
          {reverse && <span className="rounded-full bg-[#6c5ce7] px-2 py-0.5 text-white">反問環節 · 換你提問</span>}
        </div>
        <p className="text-[16px] leading-relaxed">{question.text}</p>
        <p className="mt-3 border-t border-ink/10 pt-3 text-xs text-muted">
          <span className="font-medium text-ink/70">考察重點：</span>
          {question.intent}
        </p>
      </div>
    </div>
  );
}

function AnswerBubble({ text }: { text: string }) {
  return (
    <div className="animate-rise flex justify-end">
      <p className="max-w-[85%] rounded-3xl rounded-tr-md bg-ink px-5 py-4 text-[15px] leading-relaxed whitespace-pre-line text-paper shadow-lg shadow-ink/15">
        {text}
      </p>
    </div>
  );
}

/** 反問環節中，面試官對求職者提問的回答 */
function ReplyBubble({ text, interviewer }: { text: string; interviewer: Interviewer }) {
  return (
    <div className="animate-rise flex gap-3">
      <Avatar name={interviewer.name} size="size-9 text-sm" />
      <div className="glass max-w-[90%] rounded-3xl rounded-tl-md p-5">
        <p className="mb-2 font-mono text-[11px] text-muted">{interviewer.name} 的回答</p>
        <p className="text-[15px] leading-relaxed whitespace-pre-line">{text}</p>
      </div>
    </div>
  );
}

function Thinking({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 pl-12 text-sm text-muted" role="status">
      <Waveform active bars={8} className="h-5 w-10" />
      {text}
    </div>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
