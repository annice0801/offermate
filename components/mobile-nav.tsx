/**
 * 手機 / 平板的導覽選單（漢堡按鈕 + 下拉面板）
 * ------------------------------------------------------------
 * 電腦版（lg 以上）直接在 Header 顯示導覽連結，這個元件會被隱藏。
 * 點連結後自動收合；路由改變或按 Esc 也會收合。
 */
"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 換頁時收合：記住「打開選單時的路徑」，路徑不同就視為已收合（不需要在 effect 裡 setState）
  const [openedAt, setOpenedAt] = useState(pathname);
  const isOpen = open && openedAt === pathname;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(!isOpen);
        }}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        aria-label={isOpen ? "關閉選單" : "開啟選單"}
        className="grid size-9 place-items-center rounded-full bg-white/60 transition hover:bg-white"
      >
        {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {isOpen && (
        <nav id="mobile-nav" className="animate-rise absolute inset-x-3 top-[calc(100%+0.5rem)] rounded-3xl border border-white bg-white/95 p-3 shadow-2xl shadow-ink/15 backdrop-blur-xl sm:inset-x-6">
          <ul className="grid gap-1 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 font-medium transition hover:bg-white/80"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
