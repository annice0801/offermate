/**
 * 部落格列表 + 分類篩選
 * ------------------------------------------------------------
 * 篩選在瀏覽器端完成（文章數量少，不需要重新向伺服器要資料），
 * 所以 /blog 頁面本身仍可在建置時產生成靜態 HTML。
 * 「全部」時第一篇（最新）以大卡片呈現，其餘排成格狀。
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, type BlogCategory, type Post } from "@/lib/posts";
import PostCover from "./post-cover";
import PostMeta from "./post-meta";

export default function BlogList({ posts }: { posts: Post[] }) {
  const [category, setCategory] = useState<BlogCategory | "全部">("全部");
  const filtered = category === "全部" ? posts : posts.filter((p) => p.category === category);
  const [featured, ...rest] = filtered;
  const showFeatured = category === "全部" && featured;
  const list = showFeatured ? rest : filtered; // 格狀區要顯示的文章

  return (
    <>
      {/* 分類篩選：手機可左右滑動 */}
      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="文章分類">
        {(["全部", ...CATEGORIES] as const).map((c) => {
          const count = c === "全部" ? posts.length : posts.filter((p) => p.category === c).length;
          const active = category === c;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                active ? "bg-ink text-white shadow-md" : "glass text-muted hover:text-ink"
              }`}
            >
              {c}
              <span className={`ml-1.5 font-mono text-xs ${active ? "text-white/60" : "text-muted/70"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* 精選文章（大卡片）：手機上下排、電腦左右排 */}
      {showFeatured && (
        <Link href={`/blog/${featured.slug}`} className="glass-strong group mb-6 grid overflow-hidden rounded-3xl transition hover:-translate-y-1 lg:grid-cols-2">
          <PostCover post={featured} size="lg" preload />
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <p className="font-mono text-xs tracking-widest text-accent">最新文章</p>
            <h2 className="mt-3 text-2xl leading-snug font-semibold tracking-tight text-balance transition-colors group-hover:text-accent sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-4 leading-relaxed text-muted">{featured.excerpt}</p>
            <PostMeta post={featured} className="mt-6" />
          </div>
        </Link>
      )}

      {/* 其餘文章：手機 1 欄、平板 2 欄、電腦 3 欄；剛好 2 或 4 篇時電腦也用 2 欄，避免最後一排只剩一張 */}
      <div className={`grid gap-6 sm:grid-cols-2 ${[2, 4].includes(list.length) ? "" : "lg:grid-cols-3"}`}>
        {list.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="glass group flex flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:bg-white/75"
          >
            <PostCover post={post} />
            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-lg leading-snug font-semibold transition-colors group-hover:text-accent">{post.title}</h3>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
              <PostMeta post={post} className="mt-5" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
