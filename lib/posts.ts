/**
 * 職涯專欄（/blog）的文章資料
 * ------------------------------------------------------------
 * 文章內容用「區塊（Block）」陣列描述，而不是直接寫 HTML：
 *   - 頁面元件依區塊類型決定怎麼排版，所有文章風格一致
 *   - h2 區塊自帶 id，文章頁可以自動產生「目錄」並支援錨點跳轉
 * 新增文章：在 POSTS 陣列加一筆即可，/blog 與 /blog/[slug] 會自動出現。
 *
 * 圖片：皆來自 Wikimedia Commons 的自由授權圖片（CC0 / 公有領域 / CC BY / CC BY-SA），
 * 下載後放在 public/blog/（封面另有 800px 的 -thumb 縮圖）。CC BY 系列授權要求標示作者與授權條款，
 * 所以每張圖都記錄 credit，並在各篇文章文末的「本文圖片來源」顯示。
 */

/** 圖片授權資訊 */
export interface PhotoCredit {
  author: string;
  license: string; // 例如「CC BY 2.0」
  licenseUrl: string; // 授權條款網址（公有領域可為空字串）
  source: string; // Wikimedia Commons 原始檔案頁面
}

export interface Photo {
  src: string; // public 資料夾內的路徑，例如 /blog/xxx-cover.jpg
  alt: string; // 替代文字（無障礙與 SEO）
  thumb?: string; // 封面的小尺寸版本（列表卡片使用），沒有時用 src
  position?: string; // 裁切時的對焦位置（CSS object-position），例如 "center 70%"；預設置中
  credit: PhotoCredit;
}

export type BlogCategory = "面試技巧" | "產業選擇" | "職涯解析";

export type Block =
  | { type: "p"; text: string } // 一般段落
  | { type: "h2"; id: string; text: string } // 小標題（會出現在目錄）
  | { type: "h3"; text: string } // 次標題
  | { type: "ul"; items: string[] } // 項目清單
  | { type: "ol"; items: string[] } // 編號清單
  | { type: "quote"; text: string } // 引言
  | { type: "tip"; title: string; text: string } // 重點提示框
  | { type: "compare"; bad: string; good: string } // 回答前後對照
  | { type: "image"; photo: Photo; caption?: string }; // 內文配圖

export interface Post {
  slug: string; // 網址：/blog/{slug}
  title: string;
  excerpt: string; // 列表頁摘要
  category: BlogCategory;
  date: string; // YYYY-MM-DD
  tags: string[];
  cover: [string, string]; // 封面漸層的兩個顏色（照片載入前的底色，也用於色調濾鏡）
  photo: Photo; // 封面照片
  content: Block[];
}

/** 依文章字數估算閱讀時間（中文約每分鐘 400 字） */
export function readingMinutes(post: Post) {
  const chars = post.content
    .map((b) => {
      if ("text" in b) return b.text;
      if ("items" in b) return b.items.join("");
      if (b.type === "compare") return b.bad + b.good;
      return "";
    })
    .join("").length;
  return Math.max(1, Math.round(chars / 400));
}

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}

/** 同分類優先、其次最新的其他文章，作為「延伸閱讀」 */
export function getRelated(post: Post, count = 2) {
  return POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category) || b.date.localeCompare(a.date))
    .slice(0, count);
}

export const CATEGORIES: BlogCategory[] = ["面試技巧", "產業選擇", "職涯解析"];

/* ============================================================
 * 文章
 * ============================================================ */
export const POSTS: Post[] = [
  /* ---------------------------------------------------------- */
  {
    slug: "star-method-beyond-basics",
    title: "STAR 法則不只是公式：讓行為面試回答真正有說服力的 4 個細節",
    excerpt: "多數人都聽過 STAR，卻還是答得像流水帳。問題通常不在結構，而在「行動」不夠具體、「結果」沒有被量化。",
    category: "面試技巧",
    date: "2026-09-18",
    tags: ["STAR", "行為面試", "回答結構"],
    cover: ["#2cc7c0", "#3f7fd6"],
    photo: {
      src: "/blog/star-method-beyond-basics-cover.jpg",
      thumb: "/blog/star-method-beyond-basics-thumb.jpg", // 列表卡片用的 800px 縮圖
      alt: "玻璃會議桌前的面試對談",
      credit: {
        author: "amtec_photos",
        license: "CC BY-SA 2.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
        source: "https://commons.wikimedia.org/wiki/File:Man_on_a_Interview_-_38141062434.jpg",
      },
    },
    content: [
      {
        type: "p",
        text: "「請分享一次你解決困難問題的經驗。」這類行為面試題幾乎出現在每一場面試。多數求職者都知道要用 STAR（Situation 情境、Task 任務、Action 行動、Result 結果）來回答，但實際說出口時，往往還是變成一段冗長的故事：背景講了兩分鐘，真正重要的「你做了什麼」只用一句帶過。",
      },
      {
        type: "p",
        text: "STAR 是骨架，不是答案本身。以下四個細節，決定了你的回答是「有結構」，還是「有說服力」。",
      },
      { type: "h2", id: "ratio", text: "細節一：把時間花在 Action，而不是 Situation" },
      {
        type: "p",
        text: "面試官想評估的是「你」的能力，而情境只是讓他理解問題的背景。一個實用的比例是：情境與任務合計約兩成，行動約六成，結果約兩成。如果你發現自己花了一半時間在描述公司、專案與同事，代表重點放錯了地方。",
      },
      {
        type: "tip",
        title: "自我檢查",
        text: "把你的回答寫下來，用螢光筆標出所有「我」開頭的句子。如果標起來的部分不到一半，就需要重寫。",
      },
      {
        type: "image",
        caption: "把「我們」換成「我」，讓面試官看見你真正的貢獻。",
        photo: {
          src: "/blog/star-method-beyond-basics-inline.jpg",
          alt: "辦公室中兩位商務人士握手",
          credit: {
            author: "perzon seo",
            license: "CC BY 2.0",
            licenseUrl: "https://creativecommons.org/licenses/by/2.0",
            source: "https://commons.wikimedia.org/wiki/File:Business_man_and_woman_handshake_in_work_office.jpg",
          },
        },
      },
      { type: "h2", id: "we-vs-i", text: "細節二：把「我們」換成「我」" },
      {
        type: "p",
        text: "團隊合作是美德，但在面試中大量使用「我們」，會讓面試官無法判斷你的貢獻。這不代表要搶功，而是清楚區分團隊的目標，以及你在其中扮演的角色。",
      },
      {
        type: "compare",
        bad: "我們團隊後來重新設計了結帳流程，轉換率就提升了。",
        good: "我負責分析結帳流程的流失數據，發現六成使用者在填寫地址時離開，於是提出把地址欄位改為自動完成，並說服工程團隊先做 A/B 測試。",
      },
      { type: "h2", id: "quantify", text: "細節三：結果要量化，沒有數字也要有對照" },
      {
        type: "p",
        text: "「後來效果很好」是面試中最常見、也最沒有資訊量的結尾。能量化就量化：提升了多少百分比、節省了多少時間、影響了多少使用者。如果真的沒有數字，也可以用「前後對照」呈現改變，例如「原本每週需要人工處理的客訴，改為系統自動分類後，團隊可以把時間投入在高風險案件」。",
      },
      {
        type: "ul",
        items: [
          "效率類：處理時間、交付週期、人力成本",
          "成長類：營收、轉換率、留存率、使用者數",
          "品質類：錯誤率、客訴數、滿意度",
          "影響範圍：涉及幾個部門、多少使用者、多大預算",
        ],
      },
      { type: "h2", id: "reflection", text: "細節四：多加一個 R——反思（Reflection）" },
      {
        type: "p",
        text: "資深的面試官常會追問：「如果重來一次，你會怎麼做？」與其等著被問，不如主動在結尾補上一句反思。這能展現你的學習能力與自我覺察，也是區分初階與資深候選人的關鍵。",
      },
      {
        type: "quote",
        text: "好的行為面試回答，是讓面試官在腦中看見你工作的樣子。",
      },
      { type: "h2", id: "practice", text: "如何練習" },
      {
        type: "ol",
        items: [
          "準備 5～7 個核心故事，涵蓋領導、衝突、失敗、創新、跨部門合作等常見主題。",
          "每個故事都寫出 STAR 的逐字稿，再刪減到 2 分鐘內能講完的長度。",
          "練習同一個故事回答不同題目：一個好故事通常能應對 2～3 種問題。",
          "找人（或 AI 面試官）針對你的回答追問，確認細節經得起深挖。",
        ],
      },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    slug: "reverse-questions-last-five-minutes",
    title: "「你有什麼問題想問我們嗎？」面試最後 5 分鐘，決定面試官對你的印象",
    excerpt: "反問環節不是禮貌性的收尾，而是你展現思考高度的最後機會。這篇整理好問題、地雷問題，以及依面試官身分調整提問的方法。",
    category: "面試技巧",
    date: "2026-09-10",
    tags: ["反問環節", "面試收尾", "提問技巧"],
    cover: ["#7b6cf0", "#3f7fd6"],
    photo: {
      src: "/blog/reverse-questions-last-five-minutes-cover.jpg",
      thumb: "/blog/reverse-questions-last-five-minutes-thumb.jpg", // 列表卡片用的 800px 縮圖
      alt: "簡約白色系會議室",
      credit: {
        author: "Breather breather",
        license: "CC0",
        licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        source: "https://commons.wikimedia.org/wiki/File:Minimalist_meeting_room_(Unsplash).jpg",
      },
    },
    content: [
      {
        type: "p",
        text: "幾乎每一場面試的最後，面試官都會問：「你有什麼問題想問我們嗎？」很多人把它當成結束前的客套，回答「目前沒有，謝謝」。但從面試官的角度，這是觀察你「是否真的想要這份工作」以及「用什麼層次思考工作」最直接的時刻。",
      },
      { type: "h2", id: "why", text: "為什麼反問環節這麼重要" },
      {
        type: "ul",
        items: [
          "展現準備程度：你的問題會透露你對公司、產品與產業做了多少功課。",
          "展現思考高度：關注的是「我能得到什麼」，還是「我該如何做出成果」。",
          "蒐集判斷資訊：面試是雙向的，你也需要資訊判斷這份工作是否適合你。",
        ],
      },
      {
        type: "image",
        caption: "反問環節，是面試中少數由你主導對話的時刻。",
        photo: {
          src: "/blog/reverse-questions-last-five-minutes-inline.jpg",
          alt: "明亮的共享辦公空間",
          credit: {
            author: "Espacecwt",
            license: "CC BY-SA 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
            source: "https://commons.wikimedia.org/wiki/File:Espace_de_Coworking_Toulousain.JPG",
          },
        },
      },
      { type: "h2", id: "good-questions", text: "三類值得問的好問題" },
      { type: "h3", text: "1. 關於成功標準" },
      {
        type: "ul",
        items: [
          "這個職位在前 90 天，您會用什麼標準判斷一個人做得好？",
          "過去在這個職位表現最好的人，有什麼共同特質？",
        ],
      },
      { type: "h3", text: "2. 關於團隊與挑戰" },
      {
        type: "ul",
        items: ["團隊目前面臨最大的挑戰是什麼？這個職位可以在其中扮演什麼角色？", "這個職位主要會和哪些部門密切合作？"],
      },
      { type: "h3", text: "3. 關於策略與方向" },
      {
        type: "ul",
        items: [
          "我注意到公司最近在（某產品或市場）有新的布局，這會如何影響這個團隊明年的重點？",
          "從您的角度，這個部門未來一兩年最重要的目標是什麼？",
        ],
      },
      {
        type: "tip",
        title: "讓問題更有份量",
        text: "在問題前加上一句你觀察到的事實，例如「我看到貴公司上季開始拓展東南亞市場」，能立刻讓面試官知道你做過研究。",
      },
      { type: "h2", id: "avoid", text: "盡量避免的問題" },
      {
        type: "ul",
        items: [
          "官網或職缺描述上就查得到答案的問題。",
          "在第一輪面試就把重心放在薪資、休假、加班——這些很重要，但更適合在後段或 HR 面談時討論。",
          "「我表現得怎麼樣？」——容易讓面試官感到尷尬，也很難得到真實的回答。",
          "完全沒有問題——這通常會被解讀為興趣不高或準備不足。",
        ],
      },
      { type: "h2", id: "by-interviewer", text: "依面試官身分調整問題" },
      {
        type: "p",
        text: "同一個問題不一定適合所有面試官。人資較了解流程與文化，未來的直屬主管最清楚工作內容與期待，而高階主管則適合討論策略與方向。事先準備 5～6 個問題，依照面試官的角色挑選 2～3 個最合適的來問。",
      },
      {
        type: "compare",
        bad: "請問這個職位需要加班嗎？",
        good: "想了解團隊平常的工作節奏，例如產品上線前後，大家通常怎麼分工與安排時間？",
      },
      {
        type: "quote",
        text: "你問的問題，就是你思考工作的方式。",
      },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    slug: "how-to-evaluate-an-industry",
    title: "轉職前先做功課：用 5 個面向評估一個產業值不值得進入",
    excerpt: "選對產業，有時比選對公司更重要。從成長性、獲利模式、職能需求到個人適配，一套可以自己動手做的產業評估框架。",
    category: "產業選擇",
    date: "2026-08-28",
    tags: ["產業分析", "轉職", "職涯規劃"],
    cover: ["#0b8a87", "#9cc9ff"],
    photo: {
      src: "/blog/how-to-evaluate-an-industry-cover.jpg",
      thumb: "/blog/how-to-evaluate-an-industry-thumb.jpg", // 列表卡片用的 800px 縮圖
      alt: "白天的倫敦泰晤士河畔天際線",
      credit: {
        author: "Diego Delso",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        source: "https://commons.wikimedia.org/wiki/File:Ayuntamiento_y_Shard,_Londres,_Inglaterra,_2014-08-11,_DD_076.JPG",
      },
    },
    content: [
      {
        type: "p",
        text: "考慮轉職時，多數人會先比較公司與薪資，卻很少花時間思考「產業」本身。但產業決定了你未來幾年能累積什麼樣的經驗、市場上有多少機會，以及你的能力在景氣變化時是否依然被需要。",
      },
      {
        type: "p",
        text: "以下五個面向，可以幫你在投遞履歷之前，先對一個產業有結構化的認識。",
      },
      { type: "h2", id: "growth", text: "面向一：成長性——這個產業正在擴張還是收縮？" },
      {
        type: "ul",
        items: [
          "觀察產業新聞與上市公司財報中對未來的展望。",
          "留意人力銀行上相關職缺數量的變化趨勢。",
          "思考驅動這個產業的長期趨勢是什麼，例如人口結構、法規或技術變革。",
        ],
      },
      {
        type: "image",
        caption: "評估產業，就像從高處俯瞰一座城市的運作。",
        photo: {
          src: "/blog/how-to-evaluate-an-industry-inline.jpg",
          alt: "白天的上海陸家嘴天際線",
          credit: {
            author: "Mstyslav Chernov",
            license: "CC BY-SA 3.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
            source: "https://commons.wikimedia.org/wiki/File:Shanghai_skyline_at_daytime,_panoramic._China,_East_Asia.jpg",
          },
        },
      },
      { type: "h2", id: "business-model", text: "面向二：獲利模式——公司怎麼賺錢？" },
      {
        type: "p",
        text: "了解產業的獲利模式，能幫你判斷哪些職位是公司的核心。例如訂閱制軟體重視客戶留存，零售業重視周轉與毛利，專案型產業則高度仰賴業務與交付能力。離公司賺錢的核心越近的職位，通常擁有越多資源與發展機會。",
      },
      { type: "h2", id: "roles", text: "面向三：職能需求——你的能力在這裡被怎麼看待？" },
      {
        type: "p",
        text: "同樣是「行銷」，在快消品產業可能以品牌與通路為主，在科技業則更偏向數據與成長。閱讀 10～20 則目標產業的職缺描述，把反覆出現的技能與關鍵字整理出來，就能看出這個產業真正重視什麼。",
      },
      {
        type: "tip",
        title: "實用做法",
        text: "把職缺描述中的條件分成「我已具備」「可以補足」「差距很大」三欄。第三欄太多時，可以先考慮相鄰產業作為跳板。",
      },
      { type: "h2", id: "culture", text: "面向四：工作型態與文化" },
      {
        type: "ul",
        items: [
          "工作節奏：專案週期長短、是否有明顯的旺季。",
          "決策方式：數據導向、經驗導向，還是由上而下。",
          "組織型態：大型企業分工細緻，新創需要一人多工。",
        ],
      },
      { type: "h2", id: "fit", text: "面向五：個人適配——這是你想累積的經驗嗎？" },
      {
        type: "p",
        text: "最後，回到自己身上：三到五年後，你希望自己具備什麼樣的能力與經歷？一個產業即使前景看好，如果它能讓你累積的經驗與你的長期方向不一致，也未必是最好的選擇。",
      },
      { type: "h2", id: "sources", text: "資訊從哪裡來" },
      {
        type: "ol",
        items: [
          "上市公司的年報與法說會資料：了解產業現況與公司策略最直接的來源。",
          "產業研究報告與專業媒體：掌握趨勢與競爭格局。",
          "在該產業工作的人：一場 30 分鐘的咖啡聊天，常勝過數小時的網路搜尋。",
          "面試本身：用反問環節驗證你對產業的假設。",
        ],
      },
      {
        type: "quote",
        text: "產業是你的舞台，公司是你的角色，而能力是你能帶走的東西。",
      },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    slug: "from-specialist-to-manager-interview",
    title: "從專員到主管：晉升面試中，面試官在意的事情完全不同",
    excerpt: "想跳一級應徵主管職，卻還在用執行者的語言回答問題？從「我做了什麼」到「我讓團隊做到什麼」，是晉升面試的關鍵轉換。",
    category: "職涯解析",
    date: "2026-08-15",
    tags: ["主管職", "晉升", "領導力"],
    cover: ["#3f7fd6", "#0e2233"],
    photo: {
      src: "/blog/from-specialist-to-manager-interview-cover.jpg",
      thumb: "/blog/from-specialist-to-manager-interview-thumb.jpg", // 列表卡片用的 800px 縮圖
      alt: "仰望倒映雲朵的玻璃帷幕大樓",
      credit: {
        author: "Samuel Zeller samuelzeller",
        license: "CC0",
        licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
        source: "https://commons.wikimedia.org/wiki/File:Clouds_in_a_tall_glass_facade_(Unsplash).jpg",
      },
    },
    content: [
      {
        type: "p",
        text: "許多人在職涯中期會遇到同一個瓶頸：專業能力已經很扎實，想挑戰主管職位，卻在面試中屢屢碰壁。原因往往不是能力不足，而是回答的「視角」還停留在執行者。",
      },
      { type: "h2", id: "shift", text: "面試官評估的重點轉移了" },
      {
        type: "p",
        text: "應徵專員職位時，面試官想知道「你能不能把事情做好」；應徵主管職位時，面試官想知道「你能不能透過別人把事情做好」，以及「你能不能判斷什麼事情值得做」。",
      },
      {
        type: "ul",
        items: [
          "從個人產出 → 團隊產出",
          "從解決問題 → 定義問題與排定優先順序",
          "從執行計畫 → 制定策略並爭取資源",
          "從專業判斷 → 商業判斷",
        ],
      },
      {
        type: "image",
        caption: "晉升不是多做一點，而是換一個高度看事情。",
        photo: {
          src: "/blog/from-specialist-to-manager-interview-inline.jpg",
          alt: "極簡白色辦公桌",
          credit: {
            author: "Roman Bozhko romanbozhko",
            license: "CC0",
            licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
            source: "https://commons.wikimedia.org/wiki/File:Clean_minimalist_office_(Unsplash).jpg",
          },
        },
      },
      { type: "h2", id: "language", text: "換一種語言說你的經驗" },
      {
        type: "p",
        text: "即使你還沒有正式的主管頭銜，過去的經驗中很可能已經有領導的成分：帶新人、協調跨部門專案、推動一項流程改變。關鍵是用主管的語言重新描述它們。",
      },
      {
        type: "compare",
        bad: "我熬夜把報表系統重寫了一遍，讓大家每週省下很多時間。",
        good: "我發現團隊每週花大量時間在手動整理報表，於是提出自動化方案、說服主管投入兩週開發時間，並帶著兩位同事分工完成，之後把省下的時間轉投入客戶分析。",
      },
      { type: "h2", id: "common-questions", text: "主管職面試常見的題型" },
      {
        type: "ul",
        items: [
          "團隊中有一位表現不佳的成員，你會怎麼處理？",
          "資源有限時，你如何決定專案的優先順序？",
          "請分享一次你需要說服上級或其他部門支持你的經驗。",
          "你如何衡量一個團隊的成功？",
          "上任後的前 90 天，你會做哪些事？",
        ],
      },
      {
        type: "tip",
        title: "回答主管題的關鍵",
        text: "展現「判斷的過程」而不只是「結論」：你考慮了哪些選項、依據什麼做取捨、如何兼顧人與目標。",
      },
      { type: "h2", id: "business", text: "補上商業視野" },
      {
        type: "p",
        text: "主管需要把團隊的工作和公司的目標連結起來。準備面試時，試著回答這些問題：這個部門如何為公司創造價值？它最重要的指標是什麼？如果預算減少兩成，你會先保留哪些工作？能自然地談論這些，面試官就更容易想像你坐在那個位置上的樣子。",
      },
      {
        type: "quote",
        text: "晉升面試考的不是你過去有多努力，而是你能不能看得更遠。",
      },
    ],
  },

  /* ---------------------------------------------------------- */
  {
    slug: "signs-your-career-has-stalled",
    title: "卡在目前的職位？職涯停滯的 5 個訊號，以及下一步該怎麼走",
    excerpt: "工作沒有不好，但總覺得少了什麼。從學習曲線、影響力到市場價值，檢視你是否正處在職涯停滯期，以及轉換前該準備的事。",
    category: "職涯解析",
    date: "2026-07-30",
    tags: ["職涯停滯", "轉職", "自我評估"],
    cover: ["#2cc7c0", "#c9bdff"],
    photo: {
      src: "/blog/signs-your-career-has-stalled-cover.jpg",
      thumb: "/blog/signs-your-career-has-stalled-thumb.jpg", // 列表卡片用的 800px 縮圖
      alt: "紐約街頭過馬路的行人",
      credit: {
        author: "Billie Grace Ward from New York, USA",
        license: "CC BY 2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0",
        source: "https://commons.wikimedia.org/wiki/File:Crosswalk_Stare_(29867440903).jpg",
      },
    },
    content: [
      {
        type: "p",
        text: "職涯停滯很少是突然發生的。它通常是一種慢慢累積的感覺：工作能應付，但不再有挑戰；考績不差，但也說不出自己這一年成長了什麼。以下五個訊號，可以幫你更具體地檢視自己的狀態。",
      },
      { type: "h2", id: "signals", text: "五個常見的停滯訊號" },
      { type: "h3", text: "1. 學習曲線變平了" },
      {
        type: "p",
        text: "你已經能在不太需要思考的情況下完成大部分工作。熟練是好事，但如果超過半年都沒有接觸新的技能或問題，成長可能已經停下來。",
      },
      { type: "h3", text: "2. 你的職責範圍一直沒有擴大" },
      {
        type: "p",
        text: "兩三年來，你負責的事情與剛進公司時差不多，沒有更大的專案、更多的決策權，或需要帶領的人。",
      },
      { type: "h3", text: "3. 很難說出最近的成就" },
      {
        type: "p",
        text: "如果現在要你更新履歷，你是否很難寫出過去一年具體、可量化的成果？這往往代表你的工作內容缺乏能被看見的影響力。",
      },
      { type: "h3", text: "4. 組織中看不到下一步" },
      {
        type: "p",
        text: "你的上一層職位短期內沒有空缺，或晉升標準不透明，而公司也沒有提供其他的發展路徑。",
      },
      { type: "h3", text: "5. 你對市場行情越來越陌生" },
      {
        type: "p",
        text: "你不確定自己的能力在市場上值多少，也不清楚同職位的人現在需要具備哪些技能。",
      },
      {
        type: "tip",
        title: "先別急著離職",
        text: "停滯不一定要靠換工作解決。先試著和主管討論新的職責、爭取跨部門專案，或在公司內部轉換角色，這些都是成本較低的選項。",
      },
      {
        type: "image",
        caption: "換一條路走走，常會看見原本沒注意到的風景。",
        photo: {
          src: "/blog/signs-your-career-has-stalled-inline.jpg",
          alt: "魁北克舊城區的行人徒步街",
          credit: {
            author: "Magpieturtle",
            license: "CC BY 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by/4.0",
            source: "https://commons.wikimedia.org/wiki/File:Rue_du_Petit-Champlain_in_Quebec_City,_a_pedestrian_shopping_street.jpg",
          },
        },
      },
      { type: "h2", id: "next-steps", text: "準備轉換之前，可以先做的事" },
      {
        type: "ol",
        items: [
          "盤點成就：把過去兩三年的工作成果整理成 STAR 格式，順便看清自己真正擅長什麼。",
          "了解市場：瀏覽目標職位的職缺描述，找出你的能力與市場需求之間的落差。",
          "補足落差：針對最關鍵的一兩項能力，透過專案、課程或副業累積證明。",
          "先練習面試：在正式投遞前，用模擬面試找出回答中的盲點，避免把真實機會當成練習。",
        ],
      },
      {
        type: "p",
        text: "職涯不是一條直線。察覺停滯本身就是一個好的開始——它代表你開始對下一個階段有所期待。",
      },
      {
        type: "quote",
        text: "當你開始問「接下來呢？」，就是準備好往前走的時候。",
      },
    ],
  },
];
