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
  /** 選填：使用的履歷 ID（只給前端記住選了哪一份，伺服器出題不會用到） */
  resumeId?: string;
  /** 選填：AI 讀履歷後整理的候選人摘要與追問重點（使用者可在開始前刪改） */
  candidate?: CandidateBrief | null;
  /** 選填：使用者勾選的面試官規則（RULE_PRESETS 的 key） */
  presets?: RulePresetKey[];
  /** 選填：使用者自己寫的面試官規則 */
  customRules?: string[];
  /** 選填：練習第幾關（STAGES）；沒有指定 = 舊版「不分關」的綜合面試 */
  stage?: StageNo;
  /** 選填：連續闖關時，前面幾關的重點紀錄（下一關面試官會讀到） */
  previousRounds?: RoundSummary[];
  /** 選填：候選人的年資與目前薪資，用來算「你的薪資估值」（分析履歷時會自動帶入年資） */
  profile?: CandidateProfile;
}

/** 年資資訊：轉職者的「總年資」和「這個職務的相關年資」差很多，薪資要分開看 */
export interface CandidateProfile {
  totalYears?: number; // 總工作年資
  relevantYears?: number; // 和應徵職務直接相關的年資
  currentSalary?: string; // 目前或上一份的薪資，自由填寫，例如「年薪 85 萬」
}

/* ------------------------------------------------------------
 * 面試關卡：真實面試通常分三關，每關的面試官、重點、深度都不一樣
 *   maxFollowUps → 同一主題最多連續追問幾次（伺服器強制，控制「深度」）
 *   defaultQuestions → 設定頁選這一關時預設的題數
 *   opening → 第一題固定是自我介紹，各關重點不同
 *   rules → 這一關的出題規則（放進提示詞）
 *   grading → 這一關的評分重點（放進診斷書的提示詞）
 * ------------------------------------------------------------ */
export type StageNo = 1 | 2 | 3;

export const STAGES = [
  {
    no: 1,
    name: "初篩面試",
    interviewer: "HR／招募專員",
    summary: "動機、現職經歷、轉職原因、基本條件",
    defaultQuestions: 6,
    maxFollowUps: 1,
    persona: "公司的 HR 或招募專員（Talent Acquisition），title 用 HR 相關英文職稱，不是用人部門主管",
    opening: "請候選人自我介紹，大約 1–2 分鐘。",
    rules: [
      "第一題是自我介紹（題目已指定）。",
      "第二題起，先針對履歷上「最近一份或目前的工作」提問：負責什麼、做出什麼成果、為什麼想離開或轉換；沒有履歷時就請候選人說明。依回答狀況追問，不清楚、前後不一或避重就輕就追問一次。",
      "接著確認：應徵動機（為什麼是這間公司、這個職缺）、對職缺的理解、期望薪資與可到職日、工作地點或加班等基本條件。",
      "題目以廣度為主，不深入專業技術細節；履歷題約佔三分之一，快速掃過主要經歷。",
      "語氣友善但專業，像真的初篩電話或視訊面試。",
    ],
    grading: "評估能否通過基本門檻：自我介紹的完整度與條理、動機是否清楚合理、離職原因是否得體、溝通表達、條件是否符合。專業深度不是這關重點。",
  },
  {
    no: 2,
    name: "專業面試",
    interviewer: "用人主管（未來直屬主管）",
    summary: "專業能力、履歷深挖、情境題與 STAR 行為題",
    defaultQuestions: 8,
    maxFollowUps: 2,
    persona: "這個職缺的用人主管（未來的直屬主管），title 比職缺高 1–2 階並屬於同一職能",
    opening: "請候選人簡短自我介紹，並挑一個最能代表自己專業能力的專案說明。",
    rules: [
      "第一題是自我介紹＋代表專案（題目已指定）。",
      "這關以深度為主：同一個專案或主題可以連續追問，一層一層挖 — 為什麼這樣做 → 具體怎麼做、本人負責哪部分 → 結果與數據怎麼來 → 如果重來會怎麼改。",
      "履歷題約佔三分之二，優先從【追問重點】挑：驗證數字與成果、確認個人貢獻、檢驗列出的技能。",
      "穿插職缺需要的專業情境題（例如「如果上線後指標下降你會怎麼做」）與 STAR 行為題。",
      "面經中這間公司二面有特別形式（例如現場簡報、白板題、作業檢討）時，照著模擬。",
    ],
    grading: "評估專業硬實力與解決問題的方法：回答的邏輯結構（STAR）、技術或專業判斷、能否用數據佐證、個人貢獻是否清楚、履歷內容是否經得起追問。",
  },
  {
    no: 3,
    name: "高階主管面試",
    interviewer: "部門主管／總監／VP",
    summary: "商業視野、策略思考、文化契合、長期規劃",
    defaultQuestions: 6,
    maxFollowUps: 1,
    persona: "部門最高主管、總監或 VP，title 比職缺高 2–3 階，關心的是大方向而不是細節",
    opening: "請候選人用 1 分鐘介紹自己，並說明為什麼想在職涯的這個階段加入公司。",
    rules: [
      "第一題是自我介紹＋職涯動機（題目已指定）。",
      "題目少而精，問「為什麼」與「如果是你會怎麼做」：對產業與公司的看法、這個職位對公司的價值、跨部門影響力、面對衝突與取捨的價值觀、三到五年的職涯規劃。",
      "履歷只挑最關鍵的一兩段經歷，問決策背後的思考與學到什麼，不追問技術細節。",
      "評估文化契合：工作價值觀、團隊合作、抗壓與面對失敗的態度。",
      "面經中這間公司的終面有特別形式（例如外籍主管用英文面試）時，照著模擬。",
    ],
    grading: "評估思考高度與文化契合：商業視野、策略與判斷力、價值觀是否契合公司、職涯規劃是否和職位一致、反問環節的高度。",
  },
] as const satisfies readonly {
  no: StageNo;
  name: string;
  interviewer: string;
  summary: string;
  defaultQuestions: 6 | 8 | 10;
  maxFollowUps: number;
  persona: string;
  opening: string;
  rules: readonly string[];
  grading: string;
}[];

export function getStage(no: StageNo | undefined) {
  return STAGES.find((s) => s.no === no);
}

/** 一關結束後留給下一關的紀錄（連續闖關用） */
export interface RoundSummary {
  stage: StageNo;
  interviewer: string; // 例如「林以晴（Talent Acquisition Partner）」
  passed: boolean;
  overallScore: number;
  summary: string; // 這一關的整體評語，一兩句
  carryOver: string[]; // 下一關面試官該知道或可以再確認的重點，例如「期望年薪 120 萬」
}

/* ------------------------------------------------------------
 * 履歷 → 面試官的追問重點
 * ------------------------------------------------------------ */

/**
 * 追問重點的類型
 *   highlight → 亮點經歷：深挖細節與個人貢獻
 *   verify    → 待驗證：履歷上的數字、成果、職稱，要確認是否屬實、怎麼算出來的
 *   gap       → 空窗期 / 轉職 / 年資很短的經歷，面試官一定會問原因
 *   mismatch  → 和職缺要求的落差：缺少的技能、經驗不足之處
 *   skill     → 履歷上列的技能，要考實際熟練度
 */
export const FOCUS_TYPES = ["highlight", "verify", "gap", "mismatch", "skill"] as const;
export type FocusType = (typeof FOCUS_TYPES)[number];

export const FOCUS_LABELS: Record<FocusType, string> = {
  highlight: "亮點深挖",
  verify: "成果驗證",
  gap: "空窗／轉職",
  mismatch: "職缺落差",
  skill: "技能確認",
};

export interface FocusPoint {
  type: FocusType;
  title: string; // 一句話，例如「主導 App 改版使留存率提升 30%」
  detail: string; // 面試官打算怎麼問、想確認什麼
}

export interface CandidateBrief {
  summary: string; // 候選人背景摘要（給面試官看的）
  focusPoints: FocusPoint[];
  /** AI 從履歷推算的年資（設定頁會自動帶入，使用者可以修改） */
  experience?: {
    totalYears: number;
    relevantYears: number;
    careerChange: boolean; // 是否是轉換跑道（相關年資明顯少於總年資）
    note: string; // 一句話說明怎麼算的，例如「行銷 4 年不計入，PM 相關 1.5 年」
  };
}

/* ------------------------------------------------------------
 * 面試官規則（使用者在開始前勾選）
 * prompt 是實際加進提示詞的文字，前端只顯示 label 與 description。
 * ------------------------------------------------------------ */
export const RULE_PRESETS = [
  {
    key: "resumeDeep",
    label: "深挖履歷",
    description: "大部分題目針對你履歷上的經歷",
    prompt: "約三分之二的題目要針對候選人履歷上的具體經歷提問，並追問細節、數字與個人貢獻。",
  },
  {
    key: "pressure",
    label: "壓力面試",
    description: "語氣直接，質疑模糊或誇大的回答",
    prompt: "以壓力面試的方式進行：語氣直接，質疑回答中模糊、誇大或前後矛盾的地方並追問，但保持專業與禮貌。",
  },
  {
    key: "behavioral",
    label: "行為題為主",
    description: "要求用 STAR 結構回答",
    prompt: "以行為面試題為主，要求候選人用 STAR（情境、任務、行動、結果）回答，缺少任何一段就追問。",
  },
  {
    key: "technical",
    label: "專業技術為主",
    description: "深入考實作細節與技術決策",
    prompt: "提高專業技術題的比重，深入考察實作細節、技術選擇的理由與取捨。",
  },
  {
    key: "leadership",
    label: "主管職標準",
    description: "團隊帶領、跨部門協作、決策",
    prompt: "以管理職的標準提問：團隊帶領、人才培育、跨部門協作、衝突處理、決策與資源分配。",
  },
  {
    key: "english",
    label: "英文面試",
    description: "題目用英文，回饋維持中文",
    prompt: "題目一律用英文提出（text 用英文，category 與 intent 維持繁體中文），回饋仍用繁體中文，並在回饋中評估英文表達。",
  },
] as const;

export type RulePresetKey = (typeof RULE_PRESETS)[number]["key"];

/** 使用者自訂規則的上限（數量與每條長度），前後端共用 */
export const CUSTOM_RULE_LIMIT = { count: 5, length: 120 };

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
  /*
   * 以下三項是從面經分享整理出的具體數據（舊版的面試進行中可能沒有，所以是選填）
   */
  reportsCount?: number; // 實際讀到幾篇面試分享
  process?: InterviewProcess;
  commonQuestions?: CommonQuestion[]; // 依出現次數由多到少
  salary?: SalaryInfo;
}

/** 面試流程：幾關、多久、什麼形式（每項都是一句話；查不到就寫「無公開資料」） */
export interface InterviewProcess {
  rounds: string; // 例如「3 關：HR 電話 → 用人主管 → 部門主管」
  duration: string; // 例如「每關 45–60 分鐘，從投遞到 offer 約 3 週」
  format: string; // 例如「視訊為主，二面需現場簡報」
}

/** 面經中常被問到的題目，mentions = 在幾篇分享中出現過 */
export interface CommonQuestion {
  question: string;
  category: string;
  mentions: number;
}

/** 這個職位的薪資行情（依年資） */
export interface SalaryInfo {
  /** true = 有找到這間公司 / 這個職位的薪資分享；false = 以同業同職級估算 */
  found: boolean;
  levels: { seniority: string; range: string }[]; // 例如 { "3–5 年", "年薪 120–150 萬" }
  note: string; // 資料來源與注意事項，一句話
  /** 依候選人年資換算的個人估值；沒有年資資訊時 applicable = false */
  personal?: PersonalSalaryEstimate;
}

export interface PersonalSalaryEstimate {
  applicable: boolean;
  basis: string; // 用什麼年資對應，例如「相關年資 1.5 年 → 1–3 年級距」
  range: string; // 例如「年薪 85–100 萬」
  reasoning: string[]; // 推算理由：級距、可轉移經驗加成多少、為什麼
  tips: string[]; // 談薪建議
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
  /** 分關面試才有：這一關是否通過、為什麼 */
  stagePassed?: boolean;
  stageVerdict?: string;
  /** 分關面試才有：留給下一關面試官的重點（期望薪資、離職原因、待確認的說法…） */
  carryOver?: string[];
}

/* ------------------------------------------------------------
 * API 請求與回應格式
 * /api/interview 只有一個 POST 端點，用 action 欄位區分動作：
 *   verify  → 驗證使用者提供的 OpenAI API Key（BYOK）
 *   analyze → 讀取會員的履歷 + 職缺，整理候選人摘要與面試官的追問重點
 *   start   → 搜尋情報 + 產生面試官角色 + 出第一題
 *   answer → 評分這一題的回答 + 出下一題（追問 / 新題 / 反問環節）
 *   report → 產生「高管級面試戰力診斷書」
 * ------------------------------------------------------------ */

export type InterviewRequest =
  | { action: "verify" } // 只驗證使用者的 API Key 是否可用
  | { action: "analyze"; setup: InterviewSetup; resumeId: string } // 讀履歷 → 產生追問重點
  /** research：連續闖關時沿用上一關的面試情報，不再重新搜尋 */
  | { action: "start"; setup: InterviewSetup; research?: Research }
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

export interface AnalyzeResponse {
  candidate: CandidateBrief;
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

