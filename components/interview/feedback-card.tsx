/**
 * 單題回饋卡片：分數、總評、優點、需修改之處、示範改寫
 * 面試進行中與診斷書的逐題回顧都會用到
 * 反問環節（reverse）時，標題改為評估「提問品質」，示範改寫改為「更有高度的提問」
 */
import type { AnswerFeedback } from "@/lib/types";

/** 依分數決定顏色：8 分以上綠、5~7 分琥珀、4 分以下紅 */
export function scoreTone(score: number) {
  if (score >= 8) return "bg-good-soft text-good";
  if (score >= 5) return "bg-warn-soft text-warn";
  return "bg-bad-soft text-bad";
}

interface Props {
  feedback: AnswerFeedback;
  reverse?: boolean;
  defaultOpen?: boolean;
}

export default function FeedbackCard({ feedback, reverse = false, defaultOpen = true }: Props) {
  return (
    <div className="glass animate-rise rounded-3xl p-5">
      {/* 分數 + 一句話總評 */}
      <div className="flex items-start gap-4">
        <div className={`grid size-14 shrink-0 place-items-center rounded-2xl ${scoreTone(feedback.score)}`}>
          <span className="font-mono text-2xl font-semibold">{feedback.score}</span>
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-widest text-muted uppercase">
            {reverse ? "提問品質評估 · /10" : "面試官回饋 · /10"}
          </p>
          <p className="mt-1 leading-relaxed font-medium">{feedback.verdict}</p>
        </div>
      </div>

      {/* 優點 / 需要修改 並排 */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PointList title="做得好" items={feedback.strengths} tone="good" />
        <PointList title="需要修改" items={feedback.issues} tone="bad" />
      </div>

      {/* 示範改寫：可收合，避免畫面太長 */}
      <details open={defaultOpen} className="group mt-3 rounded-2xl bg-white/60 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          {reverse ? "更有高度的提問示範" : "示範改寫"}
          <span className="text-muted transition group-open:rotate-180">⌄</span>
        </summary>
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink/80">{feedback.improvedAnswer}</p>
      </details>
    </div>
  );
}

function PointList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  const styles = tone === "good" ? "bg-good-soft/70 text-good" : "bg-bad-soft/70 text-bad";
  return (
    <div className={`rounded-2xl p-4 ${styles}`}>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-ink/50">—</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-ink/80">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0">{tone === "good" ? "+" : "−"}</span>
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
