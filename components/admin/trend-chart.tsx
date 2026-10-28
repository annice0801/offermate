/**
 * 使用趨勢面積圖（單一數列，可切換指標）
 * ------------------------------------------------------------
 * - 右上角切換：面試場數 / 活躍會員 / Token / 成本；一次只畫一個指標（不做雙 Y 軸）
 * - 2px 線 + 淡色漸層面積，Y 軸刻度取整數（1、2、5 × 10ⁿ）
 * - 滑鼠或方向鍵移動時顯示十字線 + 數值提示；底下可展開數據表
 * - SVG 寬度跟著容器走（ResizeObserver），線條不會被拉伸變形
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber, formatTokens, formatUsd } from "@/lib/format";

export interface TrendPoint {
  date: string;
  sessions: number;
  activeUsers: number;
  tokens: number;
  costUsd: number;
}

const METRICS = [
  { key: "sessions", label: "面試場數", fmt: formatNumber },
  { key: "activeUsers", label: "活躍會員", fmt: formatNumber },
  { key: "tokens", label: "Token", fmt: formatTokens },
  { key: "costUsd", label: "成本", fmt: formatUsd },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

const H = 240;
const PAD = { top: 16, right: 12, bottom: 26, left: 48 };

/** 讓 Y 軸最大值落在好讀的整數上：1、2、5 × 10ⁿ */
function niceStep(max: number, ticks = 4) {
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("sessions");
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [width, setWidth] = useState(640);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, entry.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = METRICS.find((x) => x.key === metric)!;
  const values = data.map((d) => d[metric]);
  const rawMax = Math.max(...values, 0);
  const step = niceStep(rawMax || (metric === "costUsd" ? 0.04 : 4));
  const yMax = Math.max(step * 4, step * Math.ceil(rawMax / step));
  const ticks = Array.from(
    { length: Math.round(yMax / step) + 1 },
    (_, i) => i * step,
  );

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left +
    (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const line = values
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join("");
  const area = `${line}L${x(values.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const labelEvery = Math.ceil(
    data.length / Math.max(2, Math.floor(innerW / 70)),
  );
  const short = (d: string) => d.slice(5).replace("-", "/");
  const total = values.reduce((a, v) => a + v, 0);

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHover(
      Math.max(
        0,
        Math.min(data.length - 1, Math.round(ratio * (data.length - 1))),
      ),
    );
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHover((h) => {
      const cur = h ?? data.length - 1;
      return Math.max(
        0,
        Math.min(data.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)),
      );
    });
  }

  const hv =
    hover !== null ? { i: hover, v: values[hover], d: data[hover] } : null;

  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">使用趨勢</p>
          <p className="text-xs text-muted tabular-nums">
            {m.label}・合計 {m.fmt(total)}
          </p>
        </div>
        <div
          className="flex rounded-full bg-paper p-1 text-xs"
          role="tablist"
          aria-label="切換指標"
        >
          {METRICS.map((x) => (
            <button
              key={x.key}
              role="tab"
              aria-selected={metric === x.key}
              onClick={() => setMetric(x.key)}
              className={`rounded-full px-3 py-1 transition ${metric === x.key ? "bg-white font-medium text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </figcaption>

      <div
        className="relative"
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        aria-label={`${m.label}每日趨勢，可用左右方向鍵查看每一天`}
      >
        {/* 量寬度的內層用 overflow-hidden：寬度由版面決定、不會被 SVG 撐開；提示框放在外層才不會被裁切 */}
        <div ref={boxRef} className="w-full overflow-hidden">
          <svg
            width={width}
            height={H}
            className="block overflow-visible"
            role="img"
            aria-hidden
          >
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-accent)"
                  stopOpacity="0.22"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-accent)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* 格線與 Y 軸刻度（淡色，不搶資料的焦點） */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--color-ink)"
                  strokeOpacity={t === 0 ? 0.18 : 0.06}
                />
                <text
                  x={PAD.left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted text-[10px] tabular-nums"
                >
                  {m.fmt(t)}
                </text>
              </g>
            ))}

            {/* X 軸日期 */}
            {data.map((d, i) =>
              // 每隔幾天標一次；最後一天一定標，但太靠近前一個標籤時把前一個省略，避免重疊
              (i % labelEvery === 0 && data.length - 1 - i >= labelEvery / 2) ||
              i === data.length - 1 ? (
                <text
                  key={d.date}
                  x={x(i)}
                  y={H - 6}
                  textAnchor="middle"
                  className="fill-muted text-[10px] tabular-nums"
                >
                  {short(d.date)}
                </text>
              ) : null,
            )}

            <path d={area} fill="url(#trend-fill)" />
            <path
              d={line}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {hv && (
              <g>
                <line
                  x1={x(hv.i)}
                  x2={x(hv.i)}
                  y1={PAD.top}
                  y2={y(0)}
                  stroke="var(--color-ink)"
                  strokeOpacity={0.35}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={x(hv.i)}
                  cy={y(hv.v)}
                  r={5}
                  fill="var(--color-accent)"
                  stroke="white"
                  strokeWidth={2}
                />
              </g>
            )}

            {/* 感應區：比線條大很多，滑鼠在圖上任何位置都能讀值 */}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            />
          </svg>
        </div>

        {hv && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-center text-xs whitespace-nowrap text-white shadow-lg"
            style={{
              left: Math.min(Math.max(x(hv.i), 50), width - 50),
              top: y(hv.v) - 12,
            }}
          >
            <span className="block font-semibold tabular-nums">
              {m.fmt(hv.v)}
            </span>
            <span className="block text-[10px] text-white/70">{hv.d.date}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowTable((v) => !v)}
        className="mt-2 text-xs text-accent hover:underline"
      >
        {showTable ? "隱藏數據表" : "顯示數據表"}
      </button>
      {showTable && (
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line/70 text-xs">
          <table className="w-full tabular-nums">
            <thead className="sticky top-0 bg-paper text-muted">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">日期</th>
                {METRICS.map((x) => (
                  <th
                    key={x.key}
                    className="px-3 py-1.5 text-right font-medium"
                  >
                    {x.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line/50">
                  <td className="px-3 py-1 text-muted">{d.date}</td>
                  {METRICS.map((x) => (
                    <td key={x.key} className="px-3 py-1 text-right">
                      {x.fmt(d[x.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
