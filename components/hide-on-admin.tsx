/**
 * 在 /admin 底下不顯示包住的內容（用來隱藏全站 Header / Footer，後台有自己的側邊欄外框）
 * children 可以是 Server Component，這裡只決定要不要渲染。
 */
"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : children;
}
