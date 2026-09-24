/**
 * 音訊波形動畫（Audio Waveform）
 * ------------------------------------------------------------
 * 由一排細長「音柱」組成，每根用 CSS 動畫（animate-wave）上下伸縮：
 *   active = true  → 音柱以不同速度與延遲跳動，看起來像有人在說話
 *   active = false → 音柱縮成一條平緩的線，代表安靜 / 聆聽中
 *
 * 純 CSS 動畫，不需要 JavaScript 計時器，也不會佔用麥克風。
 */
interface Props {
  active: boolean;
  bars?: number; // 音柱數量
  className?: string; // 外框尺寸，例如 "h-10 w-40"
}

export default function Waveform({ active, bars = 32, className = "h-10 w-full" }: Props) {
  return (
    <div className={`flex items-center gap-[3px] ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        // 用 sin 產生「看似隨機但每次渲染都一樣」的高度與速度，
        // 避免伺服器與瀏覽器渲染結果不同（hydration mismatch）
        const height = 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + 0.5)); // 30%~100%
        const duration = 0.75 + 0.6 * Math.abs(Math.sin(i * 2.3)); // 0.75s~1.35s
        return (
          <span
            key={i}
            className={`w-full min-w-[2px] origin-center rounded-full bg-gradient-to-t from-accent to-accent-bright transition-transform duration-500 ${
              active ? "animate-wave" : "scale-y-[0.12] opacity-50"
            }`}
            style={{
              height: `${height * 100}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${-i * 0.09}s`, // 負延遲：一開始就處在不同相位，波浪自然錯開
            }}
          />
        );
      })}
    </div>
  );
}
