/**
 * 後台側邊導覽（目前所在頁面會反白）
 * 手機 / 平板變成可橫向捲動的一排按鈕。
 */
"use client";

import { Bug, LayoutDashboard, ScrollText, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "總覽", Icon: LayoutDashboard },
  { href: "/admin/users", label: "會員管理", Icon: Users },
  { href: "/admin/errors", label: "錯誤紀錄", Icon: Bug },
  { href: "/admin/audit", label: "操作紀錄", Icon: ScrollText },
  { href: "/admin/settings", label: "系統設定", Icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
              active ? "bg-ink font-medium text-white shadow-sm" : "text-muted hover:bg-paper hover:text-ink"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
