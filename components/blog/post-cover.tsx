/**
 * 文章封面：Wikimedia Commons 照片 + 品牌色調處理
 * ------------------------------------------------------------
 * 每張照片來源、色調不同，直接並排會很雜亂。這裡疊上三層處理，讓整體風格一致：
 *   1. 輕微降低飽和度，讓照片不搶戲
 *   2. 文章設定的兩個品牌色做成漸層，以 soft-light 混合，統一色調
 *   3. 底部淡淡的暗角，讓左上角的分類標籤在任何照片上都清楚
 *
 * 圖片直接以 public/blog/ 的靜態檔提供（unoptimized），不經過 Next.js 的即時壓縮服務：
 *   - 已事先準備好兩種尺寸：卡片用 800px 的 -thumb、大圖用 1600px 的原檔
 *   - 少一個會出錯的環節，任何瀏覽器（含 Safari）都能穩定顯示
 */
import Image from "next/image";
import type { Post } from "@/lib/posts";

interface Props {
  post: Post;
  size?: "md" | "lg" | "hero"; // md 卡片｜lg 列表精選大圖｜hero 文章頁頂部寬幅
  preload?: boolean; // 首屏大圖設為 true，優先載入（Next 16 以 preload 取代舊的 priority）
}

export default function PostCover({ post, size = "md", preload = false }: Props) {
  const [from, to] = post.cover;
  // 小卡片用縮圖，大圖用原檔
  const src = size === "md" ? (post.photo.thumb ?? post.photo.src) : post.photo.src;

  return (
    <div
      className={`relative overflow-hidden ${
        size === "lg" ? "aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-80" : size === "hero" ? "aspect-[16/10] md:aspect-[21/9]" : "aspect-[16/9]"
      }`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <Image
        src={src}
        alt={post.photo.alt}
        fill
        unoptimized
        preload={preload}
        title={`圖片：${post.photo.credit.author}（${post.photo.credit.license}，Wikimedia Commons）`}
        className="object-cover saturate-[.9] transition-transform duration-700 group-hover:scale-105"
        style={{ objectPosition: post.photo.position }}
      />
      {/* 品牌色調（明亮照片用較輕的混合，保留簡白質感） */}
      <div className="absolute inset-0 opacity-30 mix-blend-soft-light" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
      {/* 底部淡暗角，讓標籤與照片分層 */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-transparent" />
      <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink backdrop-blur-md">{post.category}</span>
    </div>
  );
}
