/**
 * /admin 後台外框
 * ------------------------------------------------------------
 * 這裡就是後台的大門：每次進入任何 /admin 頁面都會在伺服器檢查身分，
 *   未登入、一般會員 → 404（不讓外人知道後台存在）
 *   support / admin  → 可以進入；support 只能看，修改按鈕會停用
 * 後台的 API（/api/admin/*）另外各自檢查權限，不依賴這裡。
 *
 * 版面：左側白色側邊欄（Logo、導覽、目前登入者）＋ 右側內容區；
 * 全站 Header / Footer 在 /admin 底下會隱藏（見 components/hide-on-admin.tsx）。
 */
import { connection } from "next/server";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminNav from "@/components/admin/admin-nav";
import { Avatar } from "@/components/admin/ui";
import Logo from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS, canViewAdmin } from "@/lib/roles";

export const metadata: Metadata = {
  title: "管理後台 — OfferMate",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // 後台每次都要依「目前登入者」即時產生，不能在建置時預先產生成靜態頁
  await connection();
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canViewAdmin(user.role)) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-4 p-3 sm:p-4 lg:flex-row">
      <aside className="admin-card shrink-0 rounded-3xl p-4 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-60 lg:flex-col">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Logo />
          <p className="font-mono text-[10px] tracking-widest text-muted lg:mt-1 lg:pl-10">ADMIN CONSOLE</p>
        </div>

        <div className="mt-4 lg:mt-8">
          <AdminNav />
        </div>

        <div className="mt-auto hidden space-y-3 lg:block">
          <Link href="/" className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-paper hover:text-ink">
            回到網站
            <ArrowUpRight className="size-4" />
          </Link>
          <div className="flex items-center gap-3 rounded-2xl bg-paper p-3">
            <Avatar src={user.picture} name={user.name || user.email} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name || user.email}</p>
              <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 py-2 lg:px-2">{children}</div>
    </div>
  );
}
