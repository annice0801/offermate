/**
 * 圖片來源標示：作者 · 授權 · Wikimedia Commons
 * CC BY / CC BY-SA 授權要求標示作者、授權條款並提供來源連結；CC0 與公有領域雖不強制，仍一併標示
 */
import type { PhotoCredit as Credit } from "@/lib/posts";

export default function PhotoCredit({ credit, className = "" }: { credit: Credit; className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-muted/80 ${className}`}>
      圖片：
      <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
        {credit.author}
      </a>
      {" · "}
      {credit.licenseUrl ? (
        <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline-offset-2 hover:text-ink hover:underline">
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
      {" · Wikimedia Commons"}
    </p>
  );
}
