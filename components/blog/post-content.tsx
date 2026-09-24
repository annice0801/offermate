/**
 * 文章內文：把 posts.ts 的區塊（Block）陣列轉成排版好的 HTML
 * 每種區塊一種樣式，所有文章自動維持一致的閱讀體驗
 */
import Image from "next/image";
import type { Block } from "@/lib/posts";
import PhotoCredit from "./photo-credit";

export default function PostContent({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6 text-[17px] leading-[1.9] text-ink/85">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i}>{b.text}</p>;

          case "h2":
            // scroll-mt：點目錄跳轉時，標題不會被固定的 Header 擋住
            return (
              <h2 key={i} id={b.id} className="scroll-mt-24 pt-6 text-2xl leading-snug font-semibold tracking-tight text-ink sm:text-[1.7rem]">
                {b.text}
              </h2>
            );

          case "h3":
            return (
              <h3 key={i} className="pt-2 text-lg font-semibold text-ink">
                {b.text}
              </h3>
            );

          case "ul":
            return (
              <ul key={i} className="space-y-2.5">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-3 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={i} className="space-y-3">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent">
                      {j + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            );

          case "quote":
            return (
              <blockquote key={i} className="border-l-4 border-accent-bright py-2 pl-6 text-xl leading-relaxed font-medium text-ink sm:text-2xl">
                {b.text}
              </blockquote>
            );

          case "tip":
            return (
              <aside key={i} className="glass-strong rounded-2xl p-5 sm:p-6">
                <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-accent">
                  <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">!</span>
                  {b.title}
                </p>
                <p className="text-[15px] leading-relaxed">{b.text}</p>
              </aside>
            );

          case "image":
            // 內文配圖：左右稍微超出文字欄寬，形成節奏感；下方附圖說與授權標示
            return (
              <figure key={i} className="py-4 sm:-mx-6">
                <div className="relative aspect-[3/2] overflow-hidden rounded-3xl bg-ink/5 shadow-[0_30px_60px_-30px_rgba(14,34,51,0.45)]">
                  <Image src={b.photo.src} alt={b.photo.alt} fill unoptimized className="object-cover saturate-[.9]" style={{ objectPosition: b.photo.position }} />
                </div>
                <figcaption className="mt-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
                  {b.caption && <span className="text-sm text-ink/70">{b.caption}</span>}
                  <PhotoCredit credit={b.photo.credit} className="shrink-0" />
                </figcaption>
              </figure>
            );

          case "compare":
            // 回答前後對照：手機上下排、平板以上左右並排
            return (
              <div key={i} className="grid gap-3 text-[15px] leading-relaxed sm:grid-cols-2">
                <div className="rounded-2xl bg-bad-soft/80 p-5">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-bad">✕ 常見說法</p>
                  <p>「{b.bad}」</p>
                </div>
                <div className="rounded-2xl bg-good-soft/80 p-5">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-good">✓ 更好的說法</p>
                  <p>「{b.good}」</p>
                </div>
              </div>
            );
        }
      })}
    </div>
  );
}
