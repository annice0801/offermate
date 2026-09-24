/**
 * 全站頁尾：深色背景，放品牌標語與連結欄位
 * 響應式：手機時品牌資訊在上、兩欄連結並排；電腦時三欄並排
 */
import Link from "next/link";
import Logo from "./logo";

const COLUMNS = [
  {
    title: "產品",
    links: [
      { href: "/interview", label: "開始模擬面試" },
      { href: "/#features", label: "功能介紹" },
      { href: "/#report", label: "戰力診斷書" },
      { href: "/#how", label: "運作方式" },
    ],
  },
  {
    title: "關於",
    links: [
      { href: "/#about", label: "關於我們" },
      { href: "/blog", label: "職涯專欄" },
      { href: "/#faq", label: "常見問題" },
      { href: "/#contact", label: "功能建議回報" },
      { href: "/#contact", label: "聯絡我們" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-ink text-paper print:hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr] md:py-16">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-paper/60">模擬最真實情境，讓每一次發言都精準命中 Offer。</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 font-mono text-xs tracking-widest text-paper/40 uppercase">{col.title}</h3>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-paper/80 transition-colors hover:text-accent-bright">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 底部版權列 */}
      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-paper/40 sm:flex-row sm:justify-between sm:px-6">
          <span>© 2026 OfferMate. All rights reserved.</span>
          <span>AI 產生的內容僅供練習參考，請以實際面試為準。</span>
        </div>
      </div>
    </footer>
  );
}
