/**
 * 前後端共用的型別定義
 * ------------------------------------------------------------
 * 前端（app/interview）與後端（app/api/interview）都會 import 這支檔案，
 * 確保雙方對「資料長什麼樣子」有一致的認知，TypeScript 也能幫我們抓錯。
 */

/**
 * BYOK：前端把使用者的 OpenAI 金鑰放在這個 HTTP 標頭送給後端
 * 放在這支「純型別 / 常數」檔案，前後端都能安全 import
 *（lib/api-key.ts 用到 React Hook，不能被後端 API Route import）
 */
export const API_KEY_HEADER = "X-OpenAI-Key";

/** 使用者在設定頁填寫的面試條件 */
export interface InterviewSetup {
  industry: string; // 產業，例如「金融科技」
  company: string; // 公司名稱，例如「LINE Bank」
  jobDescription: string; // 職缺描述（JD）
  totalQuestions: 6 | 8 | 10; // 總題數（含追問）
}

/**
 * 題目類型
 *   new       → 全新題目
 *   follow-up → 針對上一題的追問
 *   reverse   → 反問環節：換求職者向面試官提問（固定是最後一題）
 */
export type QuestionKind = "new" | "follow-up" | "reverse";

/** AI 面試官的角色設定：依使用者填的產業 / 公司動態產生 */
export interface Interviewer {
  name: string; // 例如「Sarah」
  title: string; // 例如「Senior Product Director」
  organization: string; // 例如「Tech Unicorn」或使用者填的公司名稱
  style: string; // 面試風格，一句話，例如「重視數據與決策脈絡」
}

/** 一道面試題 */
export interface Question {
  kind: QuestionKind;
  category: string; // 題目面向，例如「行為面試」「技術深度」「情境題」
  text: string; // 題目內容
  intent: string; // 面試官出這題想考察什麼（給使用者參考）
}

/** 面試官針對「單一回答」給的即時回饋 */
export interface AnswerFeedback {
  score: number; // 1~10 分
  verdict: string; // 一句話總評
  strengths: string[]; // 回答得好的地方
  issues: string[]; // 回答錯誤、不足或需要修改的地方
  improvedAnswer: string; // 建議的改寫版本（示範怎麼答更好）；反問環節則是「更好的提問」示範
  /** 只有反問環節才有：面試官對求職者提問的回答 */
  interviewerReply?: string;
}

/** 對話紀錄中的一輪：題目 + 使用者回答 + 回饋 */
export interface Turn {
  question: Question;
  answer: string;
  feedback: AnswerFeedback;
}

/** 開場時透過網路搜尋整理出的公司 / 產業面試情報 */
export interface Research {
  /** 是否找到「這間公司」本身的面試資料；false 代表改用同業資料綜合 */
  companyDataFound: boolean;
  summary: string; // 情報摘要
  focusAreas: string[]; // 這間公司 / 產業常考的重點
  sources: { title: string; url: string }[]; // 參考來源
}

/** 六角雷達圖的六個固定能力面向（key 固定，方便畫圖與對照） */
export const COMPETENCIES = [
  { key: "structure", zh: "邏輯結構性", en: "STAR Structure" },
  { key: "hardSkills", zh: "專業硬實力", en: "Hard Skills" },
  { key: "composure", zh: "情緒穩定與抗壓性", en: "Composure" },
  { key: "businessAcumen", zh: "商業視野", en: "Business Acumen" },
  { key: "articulation", zh: "溝通表達流暢度", en: "Articulation" },
  { key: "cultureFit", zh: "文化契合度", en: "Culture Fit" },
] as const;

export type CompetencyKey = (typeof COMPETENCIES)[number]["key"];

/** 行動計畫的一項：建議 + 關鍵字 + 實施日期 */
export interface ActionItem {
  title: string; // 建議標題
  detail: string; // 具體怎麼做
  keywords: string[]; // 相關關鍵字（練習時要掌握 / 面試時可以使用的詞）
  date: string; // 實施日期 YYYY-MM-DD（由伺服器依模型給的天數換算）
}

/** 面試結束後的「高管級面試戰力診斷書」 */
export interface FinalReport {
  overallScore: number; // 0~100 總分
  recommendation: "強烈推薦錄取" | "推薦錄取" | "待考慮" | "不推薦";
  summary: string; // 面試官的整體評語
  competencies: Record<CompetencyKey, { score: number; comment: string }>; // 六大能力（1~10）
  reverseQuestionInsight: string; // 反問環節評語：思考高度與提問品質
  strengths: string[]; // 整體優勢
  improvements: string[]; // 針對面試過程的改進建議
  powerKeywords: string[]; // 建議在下次面試中主動使用的關鍵字
  actionPlan: ActionItem[]; // 行動計畫（含實施日期）
}

/* ------------------------------------------------------------
 * API 請求與回應格式
 * /api/interview 只有一個 POST 端點，用 action 欄位區分動作：
 *   verify → 驗證使用者提供的 OpenAI API Key（BYOK）
 *   start  → 搜尋情報 + 產生面試官角色 + 出第一題
 *   answer → 評分這一題的回答 + 出下一題（追問 / 新題 / 反問環節）
 *   report → 產生「高管級面試戰力診斷書」
 * ------------------------------------------------------------ */

export type InterviewRequest =
  | { action: "verify" } // 只驗證使用者的 API Key 是否可用
  | { action: "start"; setup: InterviewSetup }
  | {
      action: "answer";
      setup: InterviewSetup;
      interviewer: Interviewer;
      research: Research;
      history: Turn[]; // 之前已完成的每一輪
      currentQuestion: Question; // 目前正在回答的題目
      answer: string; // 使用者這次的回答
    }
  | { action: "report"; setup: InterviewSetup; interviewer: Interviewer; research: Research; history: Turn[] };

export interface VerifyResponse {
  ok: true;
  model: string;
}

export interface StartResponse {
  interviewer: Interviewer;
  research: Research;
  question: Question;
}

export interface AnswerResponse {
  feedback: AnswerFeedback;
  /** 下一題；若已達總題數則為 null，前端就會接著呼叫 report */
  nextQuestion: Question | null;
}

export interface ReportResponse {
  report: FinalReport;
}

/* ------------------------------------------------------------
 * 功能建議回報 / 聯絡我們（/api/feedback）
 * ------------------------------------------------------------ */
export const FEEDBACK_TYPES = ["功能建議", "問題回報", "合作洽詢", "其他"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export interface FeedbackRequest {
  type: FeedbackType;
  email: string;
  name: string; // 稱呼（選填）
  message: string;
  website: string; // 蜜罐欄位：正常使用者看不到、不會填
}

