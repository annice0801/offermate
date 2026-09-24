/**
 * /blog — 職涯專欄列表頁
 * ------------------------------------------------------------
 * Server Component：在伺服器端讀取文章資料並產生 HTML（對 SEO 友善），
 * 分類篩選的互動交給 Client Component <BlogList />。
 */
import type { Metadata } from "next";
import BlogList from "@/components/blog/blog-list";
import { POSTS } from "@/lib/posts";

export const metadata: Metadata = {
  title: "職涯專欄 — OfferMate",
  description: "面試技巧、產業選擇與職涯解析：幫助你在下一場面試中精準命中 Offer 的實戰文章。",
};

export default function BlogPage() {
  // 依日期由新到舊排序
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <header className="animate-rise mb-10 max-w-2xl md:mb-12">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">OfferMate Journal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
          職涯<span className="text-gradient-brand">專欄</span>
        </h1>
        <p className="mt-4 leading-relaxed text-muted sm:text-lg">
          面試技巧、產業選擇與職涯解析。每一篇都是能直接帶進下一場面試的實戰觀點。
        </p>
      </header>

      <BlogList posts={posts} />
    </div>
  );
}
