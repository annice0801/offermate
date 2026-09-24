/**
 * 根版面（Root Layout）
 * ------------------------------------------------------------
 * App Router 中，app/layout.tsx 會包住「所有頁面」。
 * 把 Header 與 Footer 放在這裡，首頁和 /interview 就都會自動擁有它們。
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import "./globals.css";

// next/font 會在建置時下載字體並自行託管，不會向 Google 發出額外請求
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

// 網站的 <title> 與描述（SEO）
export const metadata: Metadata = {
  title: "OfferMate — 模擬最真實情境，讓每一次發言都精準命中 Offer",
  description:
    "OfferMate 是 AI 面試模擬器：依產業與公司的真實面經出題、追問與反問環節，逐題批改，並開立高管級面試戰力診斷書。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* 背景漂浮色塊：固定在最底層，毛玻璃面板透出的柔和色彩就是來自這裡 */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden">
          <div className="absolute -top-32 -left-24 size-[520px] animate-float rounded-full bg-accent-bright/30 blur-[110px]" />
          <div className="absolute top-1/3 -right-32 size-[560px] animate-float rounded-full bg-sky/45 blur-[120px] [animation-delay:-6s]" />
          <div className="absolute -bottom-40 left-1/3 size-[480px] animate-float rounded-full bg-lilac/40 blur-[120px] [animation-delay:-12s]" />
        </div>
        <SiteHeader />
        {/* flex-1 讓主內容撐開，Footer 永遠貼在頁面底部 */}
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
