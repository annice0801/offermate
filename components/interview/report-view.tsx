/**
 * 階段 3：高管級面試戰力診斷書
 * ------------------------------------------------------------
 * 內容：
 *   1. 診斷書抬頭（編號、日期、應試職位、主診面試官）
 *   2. 總分圓環 + 錄取建議 + 總評
 *   3. 六角形戰力雷達圖 + 六大能力明細表
 *   4. 反問環節洞察（思考高度與提問品質）
 *   5. 面試過程建議（優勢 / 改進）
 *   6. 關鍵字 + 行動處方（含實施日期）
 *   7. 逐題回顧
 *
 * 存檔方式：
 *   - 下載 PDF：呼叫瀏覽器列印，globals.css 的 @media print 只印出 #diagnosis-report
 *   - 下載 PNG：用 html-to-image 把診斷書 DOM 轉成圖片後下載
 */
"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { COMPETENCIES, type FinalReport, type Interviewer, type InterviewSetup, type Turn } from "@/lib/types";
import FeedbackCard, { scoreTone } from "./feedback-card";
import RadarChart from "@/components/radar-chart";

interface Props {
  setup: InterviewSetup;
  interviewer: Interviewer;
  report: FinalReport;
  history: Turn[];
  onRestart: () => void;
}

// 錄取建議對應的顏色
const RECOMMENDATION_STYLE: Record<FinalReport["recommendation"], string> = {
  強烈推薦錄取: "bg-good text-white",
  推薦錄取: "bg-good-soft text-good",
  待考慮: "bg-warn-soft text-warn",
  不推薦: "bg-bad-soft text-bad",
};

/** 今天的日期字串 YYYY-MM-DD */
function today() {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ReportView({ setup, interviewer, report, history, onRestart }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  // 診斷書編號與日期：只在第一次渲染時產生（useState 的初始化函式只執行一次）
  const [meta] = useState(() => ({
    date: today(),
    no: `OM-${today().replaceAll("-", "")}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
  }));

  const fileBase = `面試戰力診斷書_${setup.company}_${meta.date}`;

  /** 下載 PNG：把診斷書區塊轉成 2 倍解析度的圖片 */
  async function downloadPng() {
    if (!reportRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        backgroundColor: "#edf3f7",
        // 排除標記為 data-export-ignore 的元素（例如收合按鈕）
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore !== undefined),
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${fileBase}.png`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("圖片產生失敗，請改用「下載 PDF」。");
    } finally {
      setSaving(false);
    }
  }

  /** 下載 PDF：暫時把網頁標題改成檔名，列印對話框預設的 PDF 檔名就會是它 */
  function downloadPdf() {
    const original = document.title;
    document.title = fileBase;
    window.print();
    document.title = original;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* ---------- 存檔工具列（列印時隱藏） ---------- */}
      <div className="glass mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 pl-5 print:hidden">
        <p className="text-sm text-muted">診斷書已開立，可以下載存檔 ↓</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadPdf} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white transition hover:bg-accent">
            下載 PDF
          </button>
          <button
            onClick={downloadPng}
            disabled={saving}
            className="rounded-full bg-white/80 px-5 py-2 text-sm font-medium transition hover:bg-white disabled:opacity-50"
          >
            {saving ? "產生中…" : "下載 PNG 圖片"}
          </button>
          <button onClick={onRestart} className="rounded-full px-5 py-2 text-sm font-medium text-accent transition hover:bg-white/60">
            再練一場
          </button>
        </div>
      </div>

      {/* ================= 診斷書本體（這個 id 會被列印樣式與 PNG 匯出使用） ================= */}
      <article id="diagnosis-report" ref={reportRef} className="glass-strong animate-rise overflow-hidden rounded-[2rem]">
        {/* ---------- 1. 抬頭 ---------- */}
        <header className="relative overflow-hidden bg-ink px-6 py-8 text-white sm:px-10">
          <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-accent-bright/40 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] text-white/50">EXECUTIVE INTERVIEW DIAGNOSIS</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">高管級面試戰力診斷書</h1>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs text-white/70">
              <dt className="text-white/40">編號</dt>
              <dd>{meta.no}</dd>
              <dt className="text-white/40">日期</dt>
              <dd>{meta.date}</dd>
            </dl>
          </div>
          <dl className="relative mt-6 grid gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-white/40">應試公司</dt>
              <dd className="mt-0.5 font-medium">{setup.company}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/40">產業</dt>
              <dd className="mt-0.5 font-medium">{setup.industry}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/40">主診面試官</dt>
              <dd className="mt-0.5 font-medium">
                {interviewer.name} <span className="text-white/50">· {interviewer.title}</span>
              </dd>
            </div>
          </dl>
        </header>

        <div className="space-y-10 p-6 sm:p-10">
          {/* ---------- 2. 總分 + 3. 雷達圖 ---------- */}
          <section className="grid items-center gap-8 md:grid-cols-[0.85fr_1.15fr]">
            <div className="text-center md:text-left">
              <ScoreRing score={report.overallScore} />
              <span className={`mt-5 inline-block rounded-full px-3 py-1 text-sm font-medium ${RECOMMENDATION_STYLE[report.recommendation]}`}>
                面試官建議：{report.recommendation}
              </span>
              <p className="mt-4 text-sm leading-relaxed text-ink/80">{report.summary}</p>
            </div>
            <div className="rounded-3xl bg-white/60 p-4">
              <p className="mb-1 px-2 font-mono text-[11px] tracking-widest text-muted">COMPETENCY RADAR</p>
              <RadarChart
                data={COMPETENCIES.map((c) => ({
                  label: c.zh,
                  sublabel: c.en,
                  score: report.competencies[c.key].score,
                  comment: report.competencies[c.key].comment,
                }))}
              />
            </div>
          </section>

          {/* 六大能力明細：雷達圖的文字版，也方便閱讀評語 */}
          <section>
            <SectionHeading en="Competency Breakdown">六大能力明細</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMPETENCIES.map((c) => {
                const d = report.competencies[c.key];
                return (
                  <div key={c.key} className="rounded-2xl bg-white/60 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {c.zh} <span className="font-mono text-[10px] text-muted">{c.en}</span>
                      </span>
                      <span className="font-mono text-lg font-semibold">
                        {d.score}
                        <span className="text-xs font-normal text-muted">/10</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-bright" style={{ width: `${d.score * 10}%` }} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{d.comment}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------- 4. 反問環節洞察 ---------- */}
          <section className="rounded-3xl border border-lilac bg-gradient-to-br from-white/80 to-lilac/25 p-6">
            <p className="font-mono text-[11px] tracking-widest text-[#6c5ce7]">REVERSE QUESTION INSIGHT</p>
            <h3 className="mt-1 font-semibold">反問環節：思考高度與提問品質</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{report.reverseQuestionInsight}</p>
          </section>

          {/* ---------- 5. 面試過程建議 ---------- */}
          <section className="grid gap-3 md:grid-cols-2">
            <ListCard title="整體優勢" items={report.strengths} marker="+" tone="text-good" />
            <ListCard title="過程改進建議" items={report.improvements} marker="−" tone="text-bad" />
          </section>

          {/* ---------- 6. 關鍵字 + 行動處方 ---------- */}
          <section>
            <SectionHeading en="Power Keywords">建議關鍵字</SectionHeading>
            <div className="flex flex-wrap gap-2">
              {report.powerKeywords.map((k) => (
                <span key={k} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
                  #{k}
                </span>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading en="Action Plan">行動處方</SectionHeading>
            {/* 時間軸：左側日期、中間圓點與連線、右側內容 */}
            <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[5.75rem] before:w-px before:bg-ink/10 sm:before:left-[6.75rem]">
              {report.actionPlan.map((item, i) => (
                <li key={i} className="relative grid grid-cols-[5rem_1fr] gap-6 sm:grid-cols-[6rem_1fr]">
                  <div className="pt-0.5 text-right">
                    <p className="font-mono text-xs font-semibold">{item.date.slice(5).replace("-", "/")}</p>
                    <p className="font-mono text-[10px] text-muted">{item.date.slice(0, 4)}</p>
                  </div>
                  <span className="absolute top-1.5 left-[5.4rem] size-3 rounded-full border-2 border-white bg-accent sm:left-[6.4rem]" />
                  <div className="rounded-2xl bg-white/60 p-4">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.keywords.map((k) => (
                        <span key={k} className="rounded-md bg-ink/5 px-2 py-0.5 font-mono text-[11px] text-ink/70">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ---------- 7. 逐題回顧 ---------- */}
          <section>
            <SectionHeading en="Question Review">逐題回顧</SectionHeading>
            <div className="space-y-2">
              {history.map((t, i) => (
                <details key={i} className="group rounded-2xl bg-white/60">
                  <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl font-mono font-semibold ${scoreTone(t.feedback.score)}`}>
                      {t.feedback.score}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[11px] text-muted">
                        Q{i + 1} · {t.question.kind === "follow-up" ? "追問" : t.question.kind === "reverse" ? "反問環節" : t.question.category}
                      </span>
                      <span className="line-clamp-1 text-sm font-medium">{t.question.text}</span>
                    </span>
                    <span data-export-ignore className="text-muted transition group-open:rotate-180">
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-ink/10 p-4">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-muted">{t.question.kind === "reverse" ? "你的提問" : "你的回答"}</p>
                      <p className="rounded-xl bg-white/70 p-4 text-sm leading-relaxed whitespace-pre-line">{t.answer}</p>
                    </div>
                    {t.feedback.interviewerReply && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">{interviewer.name} 的回答</p>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{t.feedback.interviewerReply}</p>
                      </div>
                    )}
                    <FeedbackCard feedback={t.feedback} reverse={t.question.kind === "reverse"} defaultOpen={false} />
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* 簽名欄 */}
          <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-ink/10 pt-6 text-xs text-muted">
            <p>本診斷書由 AI 依模擬面試內容產生，僅供練習參考，不代表實際錄取結果。</p>
            <p className="text-right">
              主診面試官
              <span className="ml-2 font-serif text-xl text-ink italic">{interviewer.name}</span>
              <span className="block font-mono text-[10px]">OfferMate AI Interview Clinic</span>
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}

/* ---------- 子元件 ---------- */

/** 總分圓環：用 SVG 圓的 stroke-dasharray 畫出進度 */
function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r; // 圓周長
  const offset = circumference * (1 - score / 100); // 沒填滿的長度
  return (
    <div className="relative mx-auto size-40 md:mx-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <defs>
          <linearGradient id="score-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2cc7c0" />
            <stop offset="100%" stopColor="#3f7fd6" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-ink/10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="url(#score-gradient)"
          className="transition-[stroke-dashoffset] duration-1000"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <span className="font-mono text-5xl font-semibold tracking-tight">{score}</span>
          <span className="block font-mono text-[10px] tracking-widest text-muted">OVERALL / 100</span>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children, en }: { children: React.ReactNode; en: string }) {
  return (
    <h2 className="mb-4 flex items-baseline gap-3">
      <span className="text-lg font-semibold">{children}</span>
      <span className="font-mono text-[11px] tracking-widest text-muted uppercase">{en}</span>
    </h2>
  );
}

function ListCard({ title, items, marker, tone }: { title: string; items: string[]; marker: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-white/60 p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 leading-relaxed">
            <span className={`shrink-0 font-semibold ${tone}`}>{marker}</span>
            <span className="text-ink/80">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
