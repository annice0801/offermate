/**
 * 文章資訊列：日期 · 閱讀時間（列表頁與文章頁共用）
 */
import { readingMinutes, type Post } from "@/lib/posts";

export default function PostMeta({ post, className = "" }: { post: Post; className?: string }) {
  return (
    <p className={`flex items-center gap-2 font-mono text-xs text-muted ${className}`}>
      <time dateTime={post.date}>{post.date.replaceAll("-", ".")}</time>
      <span>·</span>
      <span>約 {readingMinutes(post)} 分鐘閱讀</span>
    </p>
  );
}
