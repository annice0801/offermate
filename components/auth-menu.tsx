/**
 * Header 右上角的會員狀態
 * ------------------------------------------------------------
 *   查詢中 → 佔位（避免「登入」按鈕閃一下又變成 Email）
 *   未登入 → 「登入」連結
 *   已登入 → Google 頭像按鈕，點開顯示名字、Email 與「登出」；管理員 / 客服多一個「管理後台」
 */
"use client";

import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout, useCurrentUser } from "@/lib/auth-client";
import { canViewAdmin } from "@/lib/roles";

export default function AuthMenu() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 點選單外面或按 Esc 收合
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (user === undefined) return <span className="size-9 rounded-full bg-white/40" aria-hidden />;

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-white/60 px-2.5 py-2 text-sm text-muted transition hover:bg-white hover:text-ink sm:px-3"
      >
        登入
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="會員選單"
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-accent-soft text-sm font-semibold text-accent uppercase ring-2 ring-white transition hover:ring-accent-bright"
      >
        {user.picture ? (
          // Google 頭像是外部網址且尺寸固定，用一般 <img> 即可；no-referrer 避免 Google 擋圖
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          (user.name || user.email)[0]
        )}
      </button>

      {open && (
        <div className="animate-rise absolute top-[calc(100%+0.5rem)] right-0 w-64 rounded-2xl border border-white bg-white/95 p-2 shadow-2xl shadow-ink/15 backdrop-blur-xl">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <UserRound className="size-4 shrink-0 text-muted" />
            <div className="min-w-0">
              {user.name && <p className="truncate font-medium">{user.name}</p>}
              <p className="truncate text-muted">{user.email}</p>
            </div>
          </div>
          {canViewAdmin(user.role) && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-accent-soft hover:text-accent"
            >
              <LayoutDashboard className="size-4" />
              管理後台
            </Link>
          )}
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-bad-soft hover:text-bad"
          >
            <LogOut className="size-4" />
            登出
          </button>
        </div>
      )}
    </div>
  );
}
