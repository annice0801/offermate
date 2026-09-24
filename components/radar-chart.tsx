/**
 * 六角形戰力雷達圖（Competency Radar）
 * ------------------------------------------------------------
 * 用原生 SVG 繪製，不依賴圖表套件：
 *   1. 6 條軸線從中心放射，每條間隔 60°，第一條朝正上方
 *   2. 5 圈六角形格線，代表 2、4、6、8、10 分
 *   3. 把每個面向的分數換算成「離中心的距離」，連起來就是戰力多邊形
 *
 * 滑鼠移到頂點上會顯示該面向的分數與評語（tooltip）。
 */
"use client";

import { useState } from "react";

export interface RadarDatum {
  label: string; // 中文名稱，例如「邏輯結構性」
  sublabel: string; // 英文名稱，例如「STAR Structure」
  score: number; // 0~10
  comment?: string; // 滑鼠移上去時顯示的評語
}

const MAX = 10; // 滿分
const W = 440; // SVG 畫布寬
const H = 320; // SVG 畫布高
const CX = W / 2; // 中心點 x
const CY = H / 2; // 中心點 y
const R = 104; // 滿分時的半徑
const LABEL_R = R + 20; // 標籤離中心的距離

/** 第 i 個軸、距離中心 r 的座標。-90° 讓第一個軸朝上，之後順時針每 60° 一個 */
function point(i: number, r: number, total: number) {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

/** 把一組點轉成 SVG polygon 需要的 "x1,y1 x2,y2 ..." 字串 */
function toPoints(pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export default function RadarChart({ data, title = "六角形戰力雷達圖" }: { data: RadarDatum[]; title?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;

  const rings = [2, 4, 6, 8, 10].map((v) => toPoints(data.map((_, i) => point(i, (R * v) / MAX, n))));
  const valuePts = data.map((d, i) => point(i, (R * Math.max(0, Math.min(MAX, d.score))) / MAX, n));

  return (
    <figure className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
        <title>{title}</title>

        {/* 格線：刻意用很淡的顏色，讓資料多邊形成為主角 */}
        {rings.map((pts, i) => (
          <polygon key={i} points={pts} fill={i === rings.length - 1 ? "rgb(255 255 255 / 0.5)" : "none"} className="stroke-ink/10" strokeWidth={1} />
        ))}
        {data.map((_, i) => {
          const p = point(i, R, n);
          return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} className="stroke-ink/10" strokeWidth={1} />;
        })}

        {/* 資料多邊形：半透明填色 + 2px 外框 */}
        <polygon points={toPoints(valuePts)} className="fill-accent-bright/25 stroke-accent" strokeWidth={2} strokeLinejoin="round" />

        {/* 頂點標記：白色外圈讓點在格線上也清楚 */}
        {valuePts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 6.5 : 4.5} className="fill-accent stroke-white transition-all" strokeWidth={2} />
        ))}

        {/* 軸標籤：中文 + 分數 / 英文 */}
        {data.map((d, i) => {
          const p = point(i, LABEL_R, n);
          const dx = p.x - CX;
          // 左側文字靠右對齊、右側靠左、正上下置中，避免文字壓到圖
          const anchor = Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end";
          // 上方標籤往上長、下方標籤往下長
          const dy = p.y < CY - R * 0.9 ? -16 : p.y > CY + R * 0.9 ? 6 : -4;
          return (
            <text key={i} x={p.x} y={p.y + dy} textAnchor={anchor} className={`transition-opacity ${hover !== null && hover !== i ? "opacity-40" : ""}`}>
              <tspan x={p.x} className="fill-ink text-[12px] font-semibold">
                {d.label} <tspan className="fill-accent font-mono">{d.score}</tspan>
              </tspan>
              <tspan x={p.x} dy={14} className="fill-muted font-mono text-[9.5px] tracking-wide">
                {d.sublabel}
              </tspan>
            </text>
          );
        })}

        {/* 透明的大圓當作滑鼠感應區，比頂點本身大，比較好指到 */}
        {valuePts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={18}
            fill="transparent"
            className="cursor-pointer print:hidden"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            aria-label={`${data[i].label} ${data[i].score} 分`}
          />
        ))}
      </svg>

      {/* Tooltip：用百分比定位在頂點旁邊，隨 SVG 縮放 */}
      {hover !== null && (
        <div
          className="glass-strong pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-xl p-3 text-xs print:hidden"
          style={{ left: `${(valuePts[hover].x / W) * 100}%`, top: `${(valuePts[hover].y / H) * 100 + 5}%` }}
        >
          <p className="flex items-baseline justify-between font-semibold">
            {data[hover].label}
            <span className="font-mono text-sm text-accent">{data[hover].score}/10</span>
          </p>
          {data[hover].comment && <p className="mt-1 leading-relaxed text-muted">{data[hover].comment}</p>}
        </div>
      )}
    </figure>
  );
}
