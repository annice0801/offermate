/**
 * /blog/[slug] — 單篇文章頁
 * ------------------------------------------------------------
 * [slug] 是「動態路由」：/blog/star-method-beyond-basics 的 slug 就是 "star-method-beyond-basics"。
 *
 * - generateStaticParams：建置時列出所有文章的 slug，每篇都先產生成靜態 HTML，載入最快
 * - dynamicParams = false：不在清單中的網址直接顯示 404
 * - generateMetadata：每篇文章有自己的 <title> 與描述（SEO、分享預覽）
 * - 這版 Next.js 的 params 是 Promise，需要 await 才能取得 slug
 *
 * 版面：電腦版左側內文、右側固定目錄；手機 / 平板目錄收合在內文上方。
 */
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostContent from "@/components/blog/post-content";
import PostCover from "@/components/blog/post-cover";
import PostMeta from "@/components/blog/post-meta";
import PhotoCredit from "@/components/blog/photo-credit";
import ReadingProgress from "@/components/blog/reading-progress";
import { POSTS, getPost, getRelated } from "@/lib/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — OfferMate 職涯專欄`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.date },
  };
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // 目錄：取出所有 h2 區塊
  const toc = post.content.filter((b) => b.type === "h2");
  const related = getRelated(post);

  // 本文用到的圖片：封面 + 內文配圖
  const photos = [
    { label: "封面", photo: post.photo },
    ...post.content.flatMap((b) => (b.type === "image" ? [{ label: "內文", photo: b.photo }] : [])),
  ];

  return (
    <>
      <ReadingProgress />

      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        {/* ---------- 麵包屑 ---------- */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted" aria-label="麵包屑">
          <Link href="/blog" className="hover:text-ink">
            職涯專欄
          </Link>
          <span>/</span>
          <span className="text-ink/70">{post.category}</span>
        </nav>

        {/* ---------- 標題區 ---------- */}
        <header className="animate-rise max-w-3xl">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">{post.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm font-medium">OfferMate 編輯部</span>
            <PostMeta post={post} />
          </div>
        </header>

        <div className="animate-rise mt-8 overflow-hidden rounded-3xl shadow-[0_40px_80px_-40px_rgba(14,34,51,0.5)] [animation-delay:100ms] md:mt-10">
          {/* 文章頁的封面是首屏最大的圖片，preload 讓它優先載入 */}
          <PostCover post={post} size="hero" preload />
        </div>

        <div className="mt-10 grid gap-10 md:mt-14 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
          <div className="min-w-0">
            {/* 手機 / 平板：可收合的目錄 */}
            {toc.length > 0 && (
              <details className="glass mb-8 rounded-2xl p-4 lg:hidden">
                <summary className="cursor-pointer text-sm font-semibold">本文目錄</summary>
                <TocList items={toc} className="mt-3" />
              </details>
            )}

            <div className="max-w-2xl">
              <PostContent blocks={post.content} />

              {/* 本文圖片來源：CC BY / CC BY-SA 要求標示作者與授權，集中放在文末，版面更乾淨 */}
              <section className="mt-12 rounded-2xl bg-white/50 px-5 py-4">
                <h2 className="text-xs font-semibold text-ink/70">本文圖片來源</h2>
                <ul className="mt-2 space-y-1">
                  {photos.map(({ label, photo }) => (
                    <li key={photo.src} className="flex flex-wrap gap-x-2">
                      <span className="text-[11px] text-ink/60">{label}｜{photo.alt}</span>
                      <PhotoCredit credit={photo.credit} />
                    </li>
                  ))}
                </ul>
              </section>

              {/* 標籤 */}
              <div className="mt-6 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <span key={t} className="rounded-full bg-white/70 px-3 py-1 text-xs text-muted">
                    #{t}
                  </span>
                ))}
              </div>

              {/* 行動呼籲：讀完文章直接去練習 */}
              <aside className="relative mt-10 overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8">
                <span className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-accent-bright/40 blur-3xl" />
                <p className="relative font-mono text-xs tracking-widest text-white/50">PRACTICE NOW</p>
                <h2 className="relative mt-2 text-xl font-semibold sm:text-2xl">讀完了，實際練一場吧</h2>
                <p className="relative mt-2 text-sm leading-relaxed text-white/70">
                  AI 面試官會依你的目標公司出題、追問，逐題指出回答的盲點。
                </p>
                <Link
                  href="/interview"
                  className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-accent-bright"
                >
                  開始模擬面試 <ArrowRight className="size-4" />
                </Link>
              </aside>
            </div>
          </div>

          {/* 電腦版：固定在右側的目錄 */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="glass sticky top-24 rounded-2xl p-5">
                <p className="mb-3 font-mono text-xs tracking-widest text-muted">目錄</p>
                <TocList items={toc} />
              </div>
            </aside>
          )}
        </div>

        {/* ---------- 延伸閱讀 ---------- */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-ink/10 pt-10 md:mt-20">
            <h2 className="mb-6 text-xl font-semibold">延伸閱讀</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="glass group grid overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:bg-white/75 md:grid-cols-[40%_1fr]"
                >
                  <PostCover post={p} />
                  <div className="p-5">
                    <h3 className="leading-snug font-semibold transition-colors group-hover:text-accent">{p.title}</h3>
                    <PostMeta post={p} className="mt-3" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

/** 目錄清單：點擊跳到對應的 h2（依靠 h2 的 id 與 scroll-mt） */
function TocList({ items, className = "" }: { items: { id: string; text: string }[]; className?: string }) {
  return (
    <ol className={`space-y-2 text-sm ${className}`}>
      {items.map((h, i) => (
        <li key={h.id} className="flex gap-2">
          <span className="font-mono text-xs leading-6 text-muted/70">{String(i + 1).padStart(2, "0")}</span>
          <a href={`#${h.id}`} className="leading-6 text-muted transition-colors hover:text-accent">
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}
