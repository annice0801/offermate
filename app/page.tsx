/**
 * 首頁（Landing Page）— OfferMate
 * ------------------------------------------------------------
 * 這是 Server Component（預設），HTML 在伺服器端產生，載入快、對 SEO 友善。
 * 需要互動的小元件（視差、雷達圖、聯絡表單）是 Client Component，
 * Next.js 會自動只把它們的程式碼送到瀏覽器。
 *
 * 區塊順序：
 *   Hero → 產業跑馬燈 → 關於我們（痛點 + 自我鏡像修正）→ 功能 → 診斷書展示
 *   → 運作方式 → 行動呼籲（面試官已經就位）→ 職涯專欄（最新 3 篇）→ 聯絡我們 / 功能建議 → FAQ
 *
 * 響應式斷點（Tailwind 預設）：
 *   手機 < 640px（預設樣式）｜ sm ≥ 640 ｜ 平板 md ≥ 768 ｜ 電腦 lg ≥ 1024
 */
import { ArrowRight, Bug, Check, Handshake, Lightbulb, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import Waveform from "@/components/waveform";
import RadarChart from "@/components/radar-chart";
import ContactForm from "@/components/contact-form";
import { Parallax, Reveal, ScrollColor } from "@/components/parallax";
import { COMPETENCIES } from "@/lib/types";
import { POSTS } from "@/lib/posts";
import PostCover from "@/components/blog/post-cover";
import PostMeta from "@/components/blog/post-meta";

/* ============================================================
 * 頁面資料：文案抽成陣列，JSX 只負責排版
 * ============================================================ */

const SLOGAN = "模擬最真實情境，讓每一次發言都精準命中 Offer";

const INDUSTRIES = ["半導體", "金融科技", "電子商務", "管理顧問", "遊戲開發", "SaaS 軟體", "生技醫療", "廣告行銷", "物流供應鏈", "新創公司"];

// 求職者最常見的痛點
const PAIN_POINTS = [
  { no: "01", title: "卡在目前的職位", body: "做了好幾年，職稱與薪水停在原地。想換跑道，卻不知道該從哪裡開始準備。" },
  { no: "02", title: "渴望更高的位置", body: "想跳一級挑戰主管職，面試官問的卻是策略、影響力與商業判斷。" },
  { no: "03", title: "總是差臨門一腳", body: "收到感謝函，卻沒有人告訴你——到底輸在哪一個回答。" },
  { no: "04", title: "沒有試錯的空間", body: "每一場真實面試都是一次性的機會，答壞了就回不去。" },
];

// 自我鏡像修正：OfferMate 會映照出的三種問題
const MIRRORS = [
  { title: "邏輯盲點", en: "Logic Gaps", body: "論點跳躍、因果不清、STAR 結構缺角——你以為說清楚了，面試官聽到的卻是另一回事。" },
  { title: "表達節奏", en: "Pacing", body: "冗長鋪陳、重點太晚出現、同一件事繞圈說明，逐題指出拖慢節奏的段落。" },
  { title: "回答漏洞", en: "Answer Holes", body: "缺少數據、個人貢獻模糊、答非所問，並直接示範一個更好的版本。" },
];

// 使用 OfferMate 之後能得到的改變
const OUTCOMES = [
  { title: "跳躍式提升職涯高度", body: "以高一階主管的標準練習，讓你的回答具備下一個職位需要的視野。" },
  { title: "無痛試錯", body: "在這裡答錯不會有任何代價。反覆練習，直到每個回答都經得起追問。" },
  { title: "調整回答結構", body: "每題都有示範改寫，把零散的經驗整理成有說服力的故事。" },
];

// wide: true 代表在電腦 / 平板版佔兩欄；排列成 2+1 / 1+2 / 2+1，剛好填滿 3x3 格線
const FEATURES = [
  {
    no: "01",
    title: "真實面經出題",
    body: "開場先上網搜尋目標公司的面試心得與常考題型；找不到時，自動綜合同產業、同類型公司的資料。",
    wide: true,
  },
  { no: "02", title: "專屬面試官角色", body: "依產業與公司生成面試官身分與風格，例如 Sarah, Senior Product Director。" },
  { no: "03", title: "像真人一樣追問", body: "答得含糊？面試官會順著你的回答深挖，逼出細節與數據。" },
  {
    no: "04",
    title: "反問環節",
    body: "最後一題換你提問。面試官會評估你提問的思考高度與品質——這常是面試中被忽略的決勝點。",
    wide: true,
  },
  { no: "05", title: "逐題專業批改", body: "每答完一題立刻打分，指出答錯與不足之處，並附上示範改寫。", wide: true },
];

const STEPS = [
  { title: "填寫目標職缺", body: "選擇產業、輸入公司與職缺描述，選擇 6／8／10 題。沒有 JD？套用內建範本即可。" },
  { title: "與 AI 面試官對談", body: "面試官依據面經出題、追問，最後一題進入反問環節。" },
  { title: "取得戰力診斷書", body: "六角雷達圖、關鍵字與附日期的行動計畫，一鍵存成 PDF 或圖片。" },
];

const FAQS = [
  {
    q: "面試題目是從哪裡來的？",
    a: "每場面試開始時，AI 會即時上網搜尋該公司的面試經驗分享（例如論壇心得、求職平台評論），整理出面試風格與常見題型再出題。若找不到該公司的資料，會改為綜合同產業類似公司的面試資料，並在介面上標示。",
  },
  {
    q: "什麼是反問環節？",
    a: "真實面試的最後，面試官幾乎都會問「你有什麼問題想問我們嗎？」。OfferMate 的最後一題固定是反問環節，面試官會回答你的提問，並評估你問題的深度——是否做過功課、是否關注職位的長期成功。",
  },
  {
    q: "為什麼需要自己的 OpenAI API Key？",
    a: "OfferMate 採用 BYOK（Bring Your Own Key）模式：金鑰只存在你的瀏覽器，費用直接計入你的 OpenAI 帳戶，我們的伺服器不保存金鑰，也不保存任何面試內容。",
  },
  {
    q: "我的面試紀錄會被保存嗎？",
    a: "伺服器不保存任何對話，紀錄只存在你目前的瀏覽器分頁中。面試結束後，你可以把診斷書下載成 PDF 或 PNG 圖片自行存檔。",
  },
];

// 診斷書展示用的範例分數（僅供示意）
const SAMPLE_SCORES = [8, 7, 6, 5, 8, 7];

/* ============================================================
 * 頁面元件
 * ============================================================ */
export default function Home() {
  return (
    <>
      {/* ================= Hero ================= */}
      <section className="relative overflow-hidden">
        {/* 視差背景：兩個同心圓環，捲動時比內容慢，營造景深 */}
        <Parallax speed={0.25} className="pointer-events-none absolute -top-24 -right-40 hidden md:block" innerClassName="relative size-[560px]">
          <span className="absolute inset-0 rounded-full border border-accent/15" />
          <span className="absolute inset-16 rounded-full border border-accent/10" />
          <span className="absolute inset-32 rounded-full border border-[#3f7fd6]/10" />
        </Parallax>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-28 lg:pb-28">
          {/* 左側：標語與按鈕 */}
          <div className="animate-rise text-center lg:text-left">
            <p className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] text-muted sm:text-xs">
              <span className="size-1.5 animate-pulse rounded-full bg-accent-bright" />
              OfferMate · AI Interview Clinic
            </p>
            <h1 className="text-[2.5rem] leading-[1.15] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              下一場面試，
              <br />
              先來這裡
              {/* 「健檢」：不用斜體，以捲動驅動的漸層流動做出色彩視差 */}
              <ScrollColor className="mx-1 font-bold">健檢</ScrollColor>
              一次。
            </h1>
            <p className="mt-6 text-lg font-medium tracking-wide text-ink/80 sm:text-xl">{SLOGAN}</p>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted lg:mx-0">
              輸入產業、公司與職缺，專屬 AI 面試官會搜尋真實面經，出題、追問、進行反問環節，最後開出一份
              <strong className="font-semibold text-ink">高管級面試戰力診斷書</strong>。
            </p>
            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Link
                href="/interview"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 font-medium text-white shadow-[0_12px_30px_-10px] shadow-ink/50 transition hover:-translate-y-0.5 hover:bg-accent"
              >
                免費開始模擬面試
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="#about" className="glass inline-flex justify-center rounded-full px-6 py-3.5 font-medium transition hover:bg-white/80">
                為什麼是 OfferMate
              </Link>
            </div>
            <p className="mt-6 font-mono text-xs text-muted">無需註冊 · 約 15 分鐘完成一場 · 繁體中文</p>
          </div>

          {/* 右側：產品畫面示意（比捲動稍快，浮在前景） */}
          <Parallax speed={-0.08} className="mx-auto w-full max-w-xl lg:max-w-none">
            <HeroPreview />
          </Parallax>
        </div>
      </section>

      {/* ================= 產業跑馬燈 ================= */}
      <section className="glass overflow-hidden border-x-0 py-4 sm:py-5" aria-label="支援的產業">
        {/* 內容複製兩份，搭配 translateX(-50%) 動畫形成無縫循環 */}
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap sm:gap-12">
          {[...INDUSTRIES, ...INDUSTRIES].map((name, i) => (
            <span key={i} className="flex items-center gap-8 text-base text-muted sm:gap-12 sm:text-xl">
              {name}
              <Sparkles className="size-4 text-accent-bright" aria-hidden />
            </span>
          ))}
        </div>
      </section>

      {/* ================= 關於我們：痛點 + 自我鏡像修正 ================= */}
      <section id="about" className="relative scroll-mt-20 overflow-hidden py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <SectionTitle eyebrow="About OfferMate" title="卡在現在的位置，還是渴望更高的舞台？" />
            <p className="mx-auto mt-5 max-w-2xl text-center leading-relaxed text-muted">
              多數人不是能力不夠，而是從來沒有機會看清楚：自己在面試官眼中，究竟是什麼樣子。
            </p>
          </Reveal>

          {/* 痛點卡片：手機 1 欄、平板 2 欄、電腦 4 欄 */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_POINTS.map((p, i) => (
              <Reveal key={p.no} delay={i * 100}>
                <article className="glass h-full rounded-3xl p-6 transition hover:-translate-y-1 hover:bg-white/75">
                  <span className="font-mono text-xs text-muted">{p.no}</span>
                  <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        {/* 水平視差大字：捲動時由右往左滑過，作為兩段內容之間的轉場 */}
        <Parallax speed={0.35} axis="x" max={400} className="pointer-events-none my-16 select-none md:my-24" innerClassName="whitespace-nowrap">
          <p aria-hidden className="text-center text-[15vw] leading-none font-bold tracking-tighter text-ink/[0.04] lg:text-[10rem]">
            SELF-MIRROR · 自我鏡像修正
          </p>
        </Parallax>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">Self-Mirror Correction</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              一面照見盲點的鏡子，
              <br className="hidden sm:block" />
              幫你完成<span className="text-gradient-brand">自我鏡像修正</span>
            </h2>
            <p className="mt-5 leading-relaxed text-muted">
              OfferMate 把你的每一個回答攤開檢視，映照出邏輯盲點、表達節奏與回答漏洞。在這裡無痛試錯、調整回答結構，打造出最完美的個人面試戰力。
            </p>
            <ul className="mt-8 space-y-4">
              {OUTCOMES.map((o) => (
                <li key={o.title} className="flex gap-3">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="font-semibold">{o.title}</span>
                    <span className="block text-sm leading-relaxed text-muted">{o.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* 三面「鏡子」：每張卡片以不同速度移動，形成錯落的層次 */}
          <div className="space-y-6">
            {MIRRORS.map((m, i) => (
              <Parallax key={m.title} speed={[0.03, -0.015, 0.045][i]} max={24}>
                <Reveal delay={i * 120}>
                  <article className="glass-strong group relative overflow-hidden rounded-3xl p-6 sm:p-8">
                    {/* 鏡面反光：斜向的白色光帶，滑鼠移上去時掃過 */}
                    <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-xl font-semibold">{m.title}</h3>
                      <span className="font-mono text-[11px] tracking-widest text-muted uppercase">{m.en}</span>
                    </div>
                    <p className="mt-3 leading-relaxed text-muted">{m.body}</p>
                  </article>
                </Reveal>
              </Parallax>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 功能（Bento 格狀排版） ================= */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-24">
        <Reveal>
          <SectionTitle eyebrow="Features" title="不只是題庫，而是一位會思考的面試官" />
        </Reveal>
        <div className="mt-12 grid gap-4 md:mt-14 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.no} delay={(i % 3) * 100} className={f.wide ? "md:col-span-2" : ""}>
              <article className="glass group h-full rounded-3xl p-6 transition hover:-translate-y-1 hover:bg-white/75 sm:p-8">
                <span className="inline-grid size-9 place-items-center rounded-xl bg-accent-soft font-mono text-xs text-accent">{f.no}</span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight sm:text-2xl">{f.title}</h3>
                <p className="mt-3 max-w-md leading-relaxed text-muted">{f.body}</p>
              </article>
            </Reveal>
          ))}
          {/* 第 6 格：深色 CTA 卡片，填滿格線 */}
          <Reveal delay={200}>
            <Link
              href="/interview"
              className="group relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-3xl bg-ink p-6 text-paper transition hover:-translate-y-1 sm:p-8"
            >
              <span className="absolute -right-10 -bottom-10 size-40 rounded-full bg-accent-bright/40 blur-3xl transition group-hover:scale-150" />
              <span className="relative font-mono text-xs text-paper/50">READY?</span>
              <span className="relative mt-10 text-2xl leading-tight font-semibold sm:text-3xl">
                現在就來
                <br />
                <span className="inline-flex items-center gap-2">
                  練一場 <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ================= 診斷書展示 ================= */}
      <section id="report" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-10 px-4 pb-20 sm:px-6 md:pb-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <Reveal>
          <SectionTitle eyebrow="Diagnosis Report" title="一份高管級的面試戰力診斷書" align="left" />
          <p className="mt-6 max-w-md leading-relaxed text-muted">
            面試結束後，AI 以高階主管的標準，從六個面向為你的表現做全面診斷，並開出附有實施日期的行動處方。
          </p>
          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {["六角形戰力雷達圖", "反問環節：思考高度與提問品質", "建議關鍵字與改進建議", "附實施日期的行動計畫", "一鍵存成 PDF / PNG"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
        <Parallax speed={-0.06}>
          <div className="glass-strong rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <span className="font-mono text-xs text-muted">COMPETENCY RADAR</span>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] text-accent">範例</span>
            </div>
            <RadarChart
              data={COMPETENCIES.map((c, i) => ({ label: c.zh, sublabel: c.en, score: SAMPLE_SCORES[i] }))}
              title="範例：六角形戰力雷達圖"
            />
          </div>
        </Parallax>
      </section>

      {/* ================= 運作方式 ================= */}
      <section id="how" className="glass scroll-mt-16 border-x-0">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <Reveal>
            <SectionTitle eyebrow="How it works" title="三個步驟，從 JD 到戰力診斷" />
          </Reveal>
          <div className="mt-12 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8 lg:gap-10">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="relative">
                  <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-accent to-[#3f7fd6] font-mono text-lg text-white shadow-lg shadow-accent/30">
                    {i + 1}
                  </span>
                  <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 行動呼籲：面試官已經就位 ================= */}
      <section className="px-4 pt-20 sm:px-6 md:pt-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center text-white sm:px-8 md:py-20">
          <Parallax speed={0.15} className="pointer-events-none absolute -top-20 left-1/4">
            <div className="size-72 rounded-full bg-accent-bright/40 blur-3xl" />
          </Parallax>
          <Parallax speed={-0.1} className="pointer-events-none absolute -right-10 -bottom-24">
            <div className="size-72 rounded-full bg-[#3f7fd6]/40 blur-3xl" />
          </Parallax>
          <Waveform active bars={48} className="relative mx-auto mb-10 h-10 max-w-xs sm:max-w-sm" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-5xl">面試官已經就位，你呢？</h2>
          <p className="relative mx-auto mt-5 max-w-md text-white/70">{SLOGAN}</p>
          <Link
            href="/interview"
            className="relative mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-medium text-ink transition hover:-translate-y-0.5 hover:bg-accent-bright"
          >
            開始模擬面試 <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ================= 職涯專欄：最新 3 篇 ================= */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 md:pt-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="Journal" title="職涯專欄" align="left" />
          <Link href="/blog" className="group inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            看全部文章 <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...POSTS]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
            .map((post, i) => (
              // 平板 2 欄時隱藏第 3 篇，避免落單
              <Reveal key={post.slug} delay={i * 100} className={i === 2 ? "sm:hidden lg:block" : ""}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="glass group flex h-full flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:bg-white/75"
                >
                  <PostCover post={post} />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="flex-1 leading-snug font-semibold transition-colors group-hover:text-accent">{post.title}</h3>
                    <PostMeta post={post} className="mt-4" />
                  </div>
                </Link>
              </Reveal>
            ))}
        </div>
      </section>

      {/* ================= 聯絡我們 / 功能建議回報 ================= */}
      <section id="contact" className="scroll-mt-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-20 sm:px-6 md:pt-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <Reveal>
            <SectionTitle eyebrow="Contact & Feedback" title="讓 OfferMate 變得更好" align="left" />
            <p className="mt-5 leading-relaxed text-muted">
              有想要的新功能、遇到問題，或想洽談合作？留下你的 Email 與內容，我們會仔細閱讀每一則回饋，並在需要時回覆你。
            </p>
            <ul className="mt-8 space-y-3 text-sm text-muted">
              {[
                { Icon: Lightbulb, text: "功能建議：想在面試中練習什麼？" },
                { Icon: Bug, text: "問題回報：哪個步驟出了狀況？" },
                { Icon: Handshake, text: "合作洽詢：學校、社群與企業合作" },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={100}>
            <ContactForm />
          </Reveal>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="scroll-mt-16">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-24">
          <Reveal>
            <SectionTitle eyebrow="FAQ" title="常見問題" />
          </Reveal>
          <div className="mt-12 space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                {/* 原生 <details> 就能做手風琴展開，不需要 JavaScript */}
                <details className="glass group rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium sm:text-lg">
                    {f.q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/70 transition group-open:rotate-45 group-open:bg-accent group-open:text-white">
                      <Plus className="size-4" />
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted sm:pr-10">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}

/* ============================================================
 * 子元件
 * ============================================================ */

/** 區塊標題：小字 eyebrow + 大標 */
function SectionTitle({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="font-mono text-xs tracking-widest text-accent uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
    </div>
  );
}

/** Hero 右側：面試畫面示意（純靜態，只有波形在動） */
function HeroPreview() {
  return (
    <div className="relative animate-rise [animation-delay:150ms]">
      <div className="glass-strong rounded-3xl p-4 sm:p-5">
        {/* 面試官資訊列 */}
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-bright to-[#3f7fd6] font-semibold text-white">
            S
            <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-good" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Sarah</p>
            <p className="truncate text-xs text-muted">Senior Product Director · Tech Unicorn</p>
          </div>
          <Waveform active bars={18} className="hidden h-8 w-24 sm:flex" />
        </div>

        <div className="mt-4 space-y-4 text-left text-sm">
          <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white/80 p-4">
            <p className="mb-1 font-mono text-[10px] text-accent">Q3 · 追問</p>
            你提到把轉換率提升了，具體是從多少到多少？當時你怎麼判斷是你的改動造成的，而不是季節性因素？
          </div>
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-ink p-4 text-paper">
            我們做了 A/B test，實驗組轉換率從 2.1% 提升到 2.8%，並用前一年同期資料排除季節影響…
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/60 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-good-soft font-mono text-sm font-semibold text-good">8</span>
            <p className="text-xs leading-relaxed text-muted">有具體數據與實驗設計，建議補充樣本數與顯著性判斷。</p>
          </div>
        </div>
      </div>
      {/* 浮動標籤：以不同速度移動，增加層次 */}
      <Parallax speed={-0.12} className="absolute -bottom-5 -left-2 sm:-left-4">
        <div className="glass rounded-2xl px-4 py-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-accent" /> 已參考 6 篇面試心得
          </span>
        </div>
      </Parallax>
    </div>
  );
}
