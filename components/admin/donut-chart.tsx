/**
 * 環形圖（部分佔整體，例如會員等級分布）
 * ------------------------------------------------------------
 * - 顏色由呼叫端依「類別」固定指定（同一個等級永遠同一色，不會因排序改變）
 * - 色塊之間留 2px 白色間隙；中央顯示總數，滑鼠移到色塊或圖例時改顯示該類別
 * - 圖例一律列出數量與百分比（直接標示），不用只靠顏色辨認
 */
"use client";

import { useState } from "react";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

const SIZE = 148;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 2; // 色塊間隙（px）

export default function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const visible = slices.filter((s) => s.value > 0);
  const pct = (v: number) => (total ? `${Math.round((v / total) * 100)}%` : "0%");
  const focus = slices.find((s) => s.key === active);

  // 每段弧的起點 = 前面所有段的長度加總
  const gap = visible.length > 1 ? GAP : 0;
  const lengths = visible.map((s) => (s.value / total) * C);
  const arcs = visible.map((s, i) => ({
    ...s,
    dash: Math.max(0, lengths[i] - gap),
    offset: lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" role="img" aria-label={slices.map((s) => `${s.label} ${s.value}（${pct(s.value)}）`).join("、")}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-paper)" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.key ? STROKE + 4 : STROKE}
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={-a.offset}
              onMouseEnter={() => setActive(a.key)}
              onMouseLeave={() => setActive(null)}
              className="cursor-default transition-[stroke-width]"
              opacity={active && active !== a.key ? 0.45 : 1}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{focus ? focus.value : total}</p>
            <p className="text-[11px] text-muted">{focus ? `${focus.label}・${pct(focus.value)}` : centerLabel}</p>
          </div>
        </div>
      </div>

      <ul className="min-w-36 flex-1 space-y-2 text-sm">
        {slices.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-center gap-2 rounded-lg px-1.5 py-0.5 transition ${active === s.key ? "bg-paper" : ""}`}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="tabular-nums">{s.value}</span>
            <span className="w-10 text-right text-xs text-muted tabular-nums">{pct(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
