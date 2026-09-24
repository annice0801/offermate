/**
 * 滾動視差（Parallax）相關元件
 * ------------------------------------------------------------
 *   <Parallax speed={0.2}>      → 捲動時以不同速度位移，製造前後景的景深感
 *   <Parallax axis="x">         → 水平方向位移（例如大字標語從側邊滑過）
 *   <Reveal>                    → 進入畫面時淡入上浮
 *   <ScrollColor>               → 捲動時更新 --scroll-progress，讓「色彩視差文字」流動
 *
 * 效能重點：
 *   - 捲動事件用 requestAnimationFrame 節流，每個畫面最多計算一次
 *   - 只改 transform（交給 GPU），不改 top/left，不會觸發重新排版
 *   - 量測「外層」位置、位移「內層」，避免位移後量到的位置又影響計算造成抖動
 *   - 使用者開啟「減少動態效果」時，全部停用
 */
"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** 是否應該停用動畫（尊重作業系統的「減少動態效果」設定） */
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 訂閱捲動與視窗縮放，並用 requestAnimationFrame 節流；回傳取消訂閱的函式 */
function onScrollFrame(update: () => void) {
  let raf = 0;
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };
  update(); // 先算一次初始位置
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}

interface ParallaxProps {
  children?: ReactNode;
  /** 位移倍率：正數 = 比捲動慢（遠景），負數 = 比捲動快（近景）。建議 -0.3 ~ 0.3 */
  speed?: number;
  axis?: "x" | "y";
  /** 最大位移（px），避免元素離畫面中央很遠時位移過大、和其他區塊重疊 */
  max?: number;
  className?: string; // 外層 class（決定位置、尺寸）
  innerClassName?: string; // 內層 class（實際位移的元素）
}

export function Parallax({ children, speed = 0.15, axis = "y", max = 120, className = "", innerClassName = "" }: ParallaxProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    return onScrollFrame(() => {
      if (!outer.current || !inner.current) return;
      const rect = outer.current.getBoundingClientRect();
      // 元素中心與視窗中心的距離：元素在畫面正中央時位移為 0
      const distance = rect.top + rect.height / 2 - window.innerHeight / 2;
      const offset = Math.max(-max, Math.min(max, -distance * speed));
      inner.current.style.transform = axis === "y" ? `translate3d(0, ${offset.toFixed(1)}px, 0)` : `translate3d(${offset.toFixed(1)}px, 0, 0)`;
    });
  }, [speed, axis, max]);

  return (
    <div ref={outer} className={className}>
      <div ref={inner} className={`will-change-transform ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}

/** 進入畫面時淡入上浮；delay 可讓同一排的卡片依序出現 */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // IntersectionObserver：瀏覽器原生 API，元素進入視窗時通知我們，比監聽 scroll 省效能
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-shown", "");
          io.disconnect(); // 只播放一次
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

/**
 * 色彩視差：把「頁面捲動進度」寫進 CSS 變數 --scroll-progress（0~1），
 * 搭配 globals.css 的 text-parallax，漸層會隨捲動在文字內流動。
 * distance：捲動多少像素會跑完一整輪漸層
 */
export function ScrollColor({ children, distance = 900, className = "" }: { children: ReactNode; distance?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    return onScrollFrame(() => {
      const progress = Math.min(1, window.scrollY / distance);
      ref.current?.style.setProperty("--scroll-progress", progress.toFixed(3));
    });
  }, [distance]);

  return (
    <span ref={ref} className={`text-parallax ${className}`}>
      {children}
    </span>
  );
}
