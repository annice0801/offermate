/**
 * 直條圖（單一數列，例如一天 24 小時的練習時段分布）
 * ------------------------------------------------------------
 * - 單一數列只用品牌色，標題就說明了它是什麼，不需要圖例
 * - 細長條 + 頂端 4px 圓角，條與條之間 2px 間隙
 * - 滑鼠移到任一欄（整欄都是感應區）或用 Tab 聚焦時顯示數值；最高的一欄直接標示
 * - 底下可展開數據表，不靠圖形也能讀出每個數字
 *
 * 從 Server Component 傳進來的 props 不能是函式，所以用 unit 字串指定單位。
 */
"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";

interface Props {
  data: { label: string; value: number }[];
  unit: string; // 例如「場」
  tickEvery?: number; // 每幾欄顯示一個 X 軸標籤
  height?: number;
}

export default function BarChart({ data, unit, tickEvery = 1, height = 120 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...data.map((d) => d.value), 1);
  const peak = data.findIndex((d) => d.value === max && d.value > 0);

  return (
    <figure>
      {/* pt-4：留空間給最高那一欄頂端的數值標籤 */}
      <div className="relative pt-4">
        <div className="flex items-end gap-[2px] border-b border-ink/15" style={{ height }} onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div
              key={d.label}
              className="relative flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${d.label}：${formatNumber(d.value)} ${unit}`}
            >
              <div
                className={`relative w-full rounded-t-[4px] transition-colors ${hover === i ? "bg-ink" : d.value ? "bg-accent" : "bg-ink/5"}`}
                style={{ height: d.value > 0 ? `max(${(d.value / max) * 100}%, 3px)` : 3 }}
              >
                {/* 數值標籤貼在長條頂端：hover 時顯示該欄，否則只標示最高的一欄 */}
                {(hover === i || (hover === null && i === peak)) && (
                  <span
                    className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md px-1.5 py-0.5 text-[10px] whitespace-nowrap tabular-nums ${
                      hover === i ? "bg-ink text-white shadow" : "text-muted"
                    }`}
                  >
                    {hover === i ? `${d.label}・${formatNumber(d.value)} ${unit}` : formatNumber(d.value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px] text-[10px] text-muted tabular-nums">
          {data.map((d, i) => (
            <span key={d.label} className="flex-1 text-center whitespace-nowrap">
              {i % tickEvery === 0 ? d.label : ""}
            </span>
          ))}
        </div>
      </div>

      <button onClick={() => setShowTable((v) => !v)} className="mt-2 text-xs text-accent hover:underline">
        {showTable ? "隱藏數據表" : "顯示數據表"}
      </button>
      {showTable && (
        <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-line/70 text-xs">
          <table className="w-full tabular-nums">
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-b border-line/50 last:border-0">
                  <td className="px-3 py-1 text-muted">{d.label}</td>
                  <td className="px-3 py-1 text-right">
                    {formatNumber(d.value)} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
