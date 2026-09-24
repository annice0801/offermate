/**
 * 職缺描述（JD）範本
 * ------------------------------------------------------------
 * 使用者點選範本按鈕時，會一次帶入「產業 + 職缺描述」（產業必須是 industries.ts 裡的選項），
 * 讓沒有現成 JD 的人也能快速開始。公司名稱仍由使用者自行填寫。
 */
export interface JobTemplate {
  label: string; // 按鈕上顯示的名稱
  industry: string;
  jobDescription: string;
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    label: "前端工程師",
    industry: "軟體 / 網路服務",
    jobDescription: `【職稱】前端工程師（Frontend Engineer）
【工作內容】
- 使用 React / Next.js 開發與維護產品網頁
- 與設計師、後端工程師合作，將設計稿轉為高品質介面
- 優化網站效能（Core Web Vitals）與無障礙體驗
- 參與 Code Review，維護元件庫與前端架構
【條件要求】
- 2 年以上前端開發經驗，熟悉 TypeScript
- 熟悉 HTML、CSS、JavaScript 與瀏覽器運作原理
- 具備 RESTful API 串接、狀態管理經驗
【加分條件】
- 有 SSR / SSG、測試（Jest、Playwright）經驗
- 有大型流量產品或設計系統經驗`,
  },
  {
    label: "產品經理",
    industry: "電子商務",
    jobDescription: `【職稱】產品經理（Product Manager）
【工作內容】
- 負責產品功能規劃，撰寫 PRD 並排定開發優先順序
- 透過使用者訪談與數據分析找出問題與機會
- 與工程、設計、營運團隊協作，推動功能上線
- 定義並追蹤產品指標（轉換率、留存率等）
【條件要求】
- 3 年以上產品規劃經驗
- 熟悉 A/B Test、SQL 或數據分析工具
- 優秀的溝通與跨部門協調能力
【加分條件】
- 有電商、訂閱制或 B2B SaaS 產品經驗`,
  },
  {
    label: "數位行銷",
    industry: "廣告行銷 / 品牌",
    jobDescription: `【職稱】數位行銷專員（Digital Marketing Specialist）
【工作內容】
- 規劃與執行 Meta、Google 廣告投放，優化 ROAS
- 經營社群平台內容，制定內容行事曆
- 分析 GA4 數據，產出成效報告並提出優化建議
- 協助品牌活動企劃與 KOL 合作
【條件要求】
- 2 年以上數位行銷相關經驗
- 熟悉廣告後台與 GA4
- 具備文案撰寫與基本設計溝通能力`,
  },
  {
    label: "財務分析師",
    industry: "金融 / 銀行",
    jobDescription: `【職稱】財務分析師（Financial Analyst）
【工作內容】
- 編製月報、季報與預算，分析營運差異原因
- 建立財務模型，協助投資評估與決策
- 與各事業單位合作，提供財務建議
【條件要求】
- 財務、會計、經濟相關科系
- 熟悉 Excel 財務建模，具備報表分析能力
- 邏輯清晰，能將數字轉化為商業洞察
【加分條件】
- 具 CFA、CPA 證照或會計師事務所經驗`,
  },
];
