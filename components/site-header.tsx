/**
 * 全站頁首
 * ------------------------------------------------------------
 * sticky + 毛玻璃背景（半透明白 + backdrop-blur），捲動時固定在上方。
 * 響應式：
 *   電腦（lg 以上） → Logo ｜ 導覽連結 ｜ API Key + 開始面試
 *   手機 / 平板     → Logo ｜ API Key + 開始 + 漢堡選單
 * 導覽連結使用 /#about 這種寫法，在 /interview 頁點擊也能跳回首頁對應區塊。
 */
import Link from "next/link";
import Logo from "./logo";
import ApiKeySettings from "./api-key-settings";
import MobileNav from "./mobile-nav";

const NAV = [
  { href: "/#about", label: "關於我們" },
  { href: "/#features", label: "功能" },
  { href: "/#report", label: "診斷書" },
  { href: "/#faq", label: "常見問題" },
  { href: "/#contact", label: "聯絡我們" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/45 backdrop-blur-xl backdrop-saturate-150 print:hidden">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm text-muted lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* BYOK：使用者自己的 OpenAI 金鑰設定（Client Component） */}
          <ApiKeySettings />
          <Link
            href="/interview"
            className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-accent"
          >
            <span className="hidden sm:inline">開始模擬面試</span>
            <span className="sm:hidden">開始</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
