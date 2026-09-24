/**
 * 品牌 Logo：對話框圖示 + 產品名稱 OfferMate
 * 名稱用無襯線粗體，「Mate」以漸層色區隔，呈現俐落的高級感
 */
import Link from "next/link";

export default function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="OfferMate 首頁">
      {/* 圖示：圓角對話框，裡面一個代表「錄音中」的青綠圓點 */}
      <span
        className={`relative grid size-8 place-items-center rounded-[10px] rounded-bl-[3px] transition-transform group-hover:-rotate-6 ${
          inverted ? "bg-paper" : "bg-ink"
        }`}
      >
        <span className="size-2.5 rounded-full bg-accent-bright" />
      </span>
      <span className={`text-xl font-semibold tracking-tight ${inverted ? "text-paper" : "text-ink"}`}>
        Offer
        <span
          className={`bg-gradient-to-r bg-clip-text text-transparent ${inverted ? "from-accent-bright to-sky" : "from-accent to-[#3f7fd6]"}`}
        >
          Mate
        </span>
      </span>
    </Link>
  );
}
