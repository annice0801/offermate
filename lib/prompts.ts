/**
 * 提示詞（Prompt）與 JSON Schema
 * ------------------------------------------------------------
 * 把「要叫 AI 做什麼」集中管理，API Route 就只負責流程控制。
 * 想調整面試官風格、評分標準，改這支檔案就好。
 */
import { COMPETENCIES, type Interviewer, type InterviewSetup, type Question, type Research, type Turn } from "./types";

/* ============================================================
 * JSON Schema：規定模型輸出的格式
 * 注意 OpenAI strict 模式的規則：
 *   1. 每個 object 都要寫 additionalProperties: false
 *   2. properties 裡的每個欄位都必須列在 required 中
 * ============================================================ */

const stringArray = { type: "array", items: { type: "string" } } as const;

const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "category", "text", "intent"],
  properties: {
    kind: { type: "string", enum: ["new", "follow-up", "reverse"] },
    category: { type: "string", description: "題目面向，如：自我介紹、行為面試、技術深度、情境題、產業洞察、動機與文化契合、反問環節" },
    text: { type: "string", description: "面試官實際說出口的題目" },
    intent: { type: "string", description: "這題想考察的能力，一句話" },
  },
} as const;

const feedbackProperties = {
  score: { type: "integer", description: "1-10 分" },
  verdict: { type: "string", description: "一句話總評" },
  strengths: stringArray,
  issues: { ...stringArray, description: "具體指出答錯、不足、需要修改的地方" },
  improvedAnswer: { type: "string", description: "以使用者的回答為基礎，示範更好的版本" },
} as const;

const feedbackSchema = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(feedbackProperties),
  properties: feedbackProperties,
} as const;

/** 反問環節的回饋：多一個 interviewerReply，讓面試官回答求職者的提問 */
const reverseFeedbackSchema = {
  type: "object",
  additionalProperties: false,
  required: [...Object.keys(feedbackProperties), "interviewerReply"],
  properties: {
    ...feedbackProperties,
    interviewerReply: { type: "string", description: "以面試官身分，簡短真誠地回答求職者提出的問題" },
  },
} as const;

/** start：面試官角色 + 搜尋情報 + 第一題 */
export const startSchema = {
  type: "object",
  additionalProperties: false,
  required: ["interviewer", "research", "question"],
  properties: {
    interviewer: {
      type: "object",
      additionalProperties: false,
      required: ["name", "title", "organization", "style"],
      properties: {
        name: { type: "string", description: "面試官名字，例如 Sarah、David、林以晴" },
        title: { type: "string", description: "英文職稱，例如 Senior Product Director" },
        organization: { type: "string", description: "所屬公司，例如 Tech Unicorn" },
        style: { type: "string", description: "面試風格，一句中文" },
      },
    },
    research: {
      type: "object",
      additionalProperties: false,
      required: ["companyDataFound", "summary", "focusAreas", "sources"],
      properties: {
        companyDataFound: { type: "boolean" },
        summary: { type: "string" },
        focusAreas: stringArray,
        sources: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "url"],
            properties: { title: { type: "string" }, url: { type: "string" } },
          },
        },
      },
    },
    question: questionSchema,
  },
} as const;

/** answer（還有下一題）：回饋 + 下一題 */
export const answerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["feedback", "nextQuestion"],
  properties: { feedback: feedbackSchema, nextQuestion: questionSchema },
} as const;

/** answer（反問環節，也就是最後一題）：只要回饋 + 面試官的回答，不用再出題 */
export const reverseAnswerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["feedback"],
  properties: { feedback: reverseFeedbackSchema },
} as const;

/** report：高管級面試戰力診斷書 */
export const reportSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallScore",
    "recommendation",
    "summary",
    "competencies",
    "reverseQuestionInsight",
    "strengths",
    "improvements",
    "powerKeywords",
    "actionPlan",
  ],
  properties: {
    overallScore: { type: "integer", description: "0-100" },
    recommendation: { type: "string", enum: ["強烈推薦錄取", "推薦錄取", "待考慮", "不推薦"] },
    summary: { type: "string" },
    // 六大能力：用固定的 key，前端才能畫出固定的六角雷達圖
    competencies: {
      type: "object",
      additionalProperties: false,
      required: COMPETENCIES.map((c) => c.key),
      properties: Object.fromEntries(
        COMPETENCIES.map((c) => [
          c.key,
          {
            type: "object",
            additionalProperties: false,
            required: ["score", "comment"],
            description: `${c.zh}（${c.en}）`,
            properties: { score: { type: "integer", description: "1-10" }, comment: { type: "string" } },
          },
        ]),
      ),
    },
    reverseQuestionInsight: { type: "string" },
    strengths: stringArray,
    improvements: stringArray,
    powerKeywords: stringArray,
    actionPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "keywords", "dayOffset"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          keywords: stringArray,
          // 讓模型給「幾天後」，實際日期由伺服器換算，避免模型算錯日期
          dayOffset: { type: "integer", description: "從今天起第幾天開始執行，1-30" },
        },
      },
    },
  },
} as const;

/* ============================================================
 * 系統指示：面試官的人設
 * ============================================================ */
const BASE_RULES = `- 一律使用繁體中文（台灣用語）。
- 出題要真實、具體，貼近這間公司與這個職缺的實際面試，避免空泛的題目。
- 評分嚴格但有建設性：明確指出哪裡答錯、哪裡不夠具體、缺少什麼（例如數據、STAR 結構、技術細節），並給出可直接套用的改寫。
- 題目面向要多元：自我介紹/動機、行為面試、專業技術、情境題、產業與公司洞察，不要連續問同一類。`;

/**
 * 產生系統指示
 * - start 階段還沒有面試官角色，由模型依產業 / 公司自行設定
 * - 之後每一輪都帶入同一個角色，讓面試官的語氣前後一致
 */
export function buildPersona(interviewer?: Interviewer) {
  const who = interviewer
    ? `你是 ${interviewer.name}，${interviewer.organization} 的 ${interviewer.title}。面試風格：${interviewer.style}。請全程維持這個角色的口吻。`
    : "你是一位在該產業有 15 年以上經驗的資深面試官與職涯教練。";
  return `${who}\n${BASE_RULES}`;
}

/* ============================================================
 * 把使用者設定與對話紀錄轉成文字，餵給模型當作上下文
 * ============================================================ */
function describeSetup(s: InterviewSetup) {
  return `【產業】${s.industry}
【公司】${s.company}
【總題數】${s.totalQuestions} 題（含追問，最後一題為反問環節）
【職缺描述】
${s.jobDescription}`;
}

function describeResearch(r: Research) {
  return `【面試情報】${r.companyDataFound ? "（來自該公司面經）" : "（無該公司資料，綜合同業）"}
${r.summary}
常考重點：${r.focusAreas.join("、")}`;
}

function kindLabel(q: Question) {
  if (q.kind === "follow-up") return "追問";
  if (q.kind === "reverse") return "反問環節";
  return q.category;
}

function describeHistory(history: Turn[]) {
  if (history.length === 0) return "（尚無）";
  return history
    .map(
      (t, i) =>
        `第 ${i + 1} 題［${kindLabel(t.question)}］${t.question.text}
候選人回答：${t.answer}
你的評分：${t.feedback.score}/10`,
    )
    .join("\n\n");
}

/* ============================================================
 * 三個階段各自的輸入內容
 * ============================================================ */

/** start：先上網找面經，再決定面試官角色並出第一題 */
export function buildStartInput(setup: InterviewSetup) {
  return `${describeSetup(setup)}

請依序完成：
1. 使用網路搜尋「${setup.company} 面試」「${setup.company} 面試心得 / 面經」「${setup.company} interview questions」以及該職缺相關的面試經驗（可參考 Glassdoor、PTT、Dcard、面試趣、LinkedIn、公司官網與新聞）。
2. 若找得到該公司的真實面試經驗，companyDataFound = true，並整理其面試流程、風格與常見題型。
   若找不到，companyDataFound = false，改為綜合「${setup.industry}」產業中同類型公司的面試資料。
3. summary 用 3-5 句話摘要情報；focusAreas 列出 4-6 個常考重點；sources 列出你實際參考的網頁（標題與網址，不要捏造網址，沒有就給空陣列）。
4. interviewer：設定一位最可能面試這個職缺的面試官角色。
   - title 是英文職稱，要比職缺高 1-2 階並屬於同一職能（例如應徵 PM → Senior Product Director）。
   - organization 用「${setup.company}」；name 選符合公司文化的名字（外商可用英文名、本土企業可用中文名）。
   - style 依面試情報描述這位面試官的風格。
5. 根據情報與職缺描述出第一題（kind = "new"）。第一題通常是暖身，但要帶入公司或職缺的脈絡。`;
}

/** answer：評分目前回答，並決定下一題 */
export function buildAnswerInput(
  setup: InterviewSetup,
  research: Research,
  history: Turn[],
  current: Question,
  answer: string,
) {
  const currentNo = history.length + 1; // 目前是第幾題（1 起算）
  const nextIsReverse = currentNo + 1 === setup.totalQuestions; // 下一題是不是最後一題（反問環節）
  const remaining = setup.totalQuestions - currentNo;

  // 1) 評分規則：反問環節和一般題目的評分重點不同
  const feedbackRule =
    current.kind === "reverse"
      ? `1. 這是「反問環節」，候選人在向你提問。feedback 請評估「提問品質與思考高度」：
   - 是否展現對公司、產業或職位的研究？是否關注策略、團隊運作、成功指標等長期面向？
   - 只問薪資福利、加班、或能輕易在網路上查到的問題 → 低分；問「這個職位前 90 天的成功標準」這類有深度的問題 → 高分。
   - 沒有提問或說「沒有問題」→ 給 1-3 分並說明為什麼這是扣分點。
   improvedAnswer 請示範 2-3 個更有高度的提問。
   interviewerReply 請以面試官身分，簡短真誠地回答候選人的提問（沒有提問就簡單收尾）。`
      : `1. feedback：針對這次回答打分（1-10）並給專業意見。issues 要具體指出錯誤或需要修改之處；如果回答空白或離題，請直接指出並給低分。improvedAnswer 請示範一個更好的回答。`;

  // 2) 出題規則：反問環節 → 固定轉換；上一題已追問 → 必須換新題；其他 → 可追問或出新題
  let nextRule = "";
  if (current.kind !== "reverse") {
    if (nextIsReverse) {
      nextRule = `2. nextQuestion：下一題是最後一題「反問環節」（kind = "reverse"，category = "反問環節"）。
   請以面試官口吻自然收尾並邀請候選人提問，例如「今天我的問題差不多到這裡，你有什麼想問我的嗎？」，可以依角色調整措辭。
   intent 寫「評估候選人的思考高度與提問品質」。`;
    } else if (current.kind === "follow-up") {
      nextRule = `2. nextQuestion：還剩 ${remaining} 題（最後一題是反問環節）。目前這題已經是追問，下一題必須是新題目（kind = "new"），並換一個尚未問過的面向。`;
    } else {
      nextRule = `2. nextQuestion：還剩 ${remaining} 題（最後一題是反問環節）。若回答含糊、缺乏細節或有值得深挖之處，可以追問（kind = "follow-up"）；否則出新題目（kind = "new"），並換一個尚未問過的面向。題目要貼近面試情報與職缺需求。`;
    }
  }

  return `${describeSetup(setup)}

${describeResearch(research)}

【先前的題目】
${describeHistory(history)}

【目前題目】第 ${currentNo} 題［${kindLabel(current)}］：${current.text}
（考察重點：${current.intent}）
【候選人回答】
${answer}

請完成：
${feedbackRule}
${nextRule}`;
}

/** report：綜觀整場面試，產出高管級面試戰力診斷書 */
export function buildReportInput(setup: InterviewSetup, research: Research, history: Turn[]) {
  return `${describeSetup(setup)}

${describeResearch(research)}

【完整面試紀錄】
${history
  .map(
    (t, i) =>
      `第 ${i + 1} 題［${kindLabel(t.question)}］${t.question.text}
回答：${t.answer}
單題評分：${t.feedback.score}/10；問題：${t.feedback.issues.join("；")}`,
  )
  .join("\n\n")}

請以這間公司高階主管的標準，產出一份「高管級面試戰力診斷書」：
- overallScore（0-100）要與各題表現一致。
- competencies：六大能力各給 1-10 分與一句具體評語（要引用候選人的回答作為依據）：
${COMPETENCIES.map((c) => `  · ${c.key}：${c.zh}（${c.en}）`).join("\n")}
  其中「情緒穩定與抗壓性」請從候選人面對追問、困難題時的回答品質判斷；「文化契合度」請對照面試情報中的公司文化。
- reverseQuestionInsight：評論反問環節展現的思考高度與提問品質，2-3 句。
- strengths / improvements：各 3-5 點，針對整個面試過程，要具體引用候選人的回答。
- powerKeywords：6-10 個建議候選人下次面試主動使用的專業關鍵字（與此職缺、產業相關）。
- actionPlan：3-5 個行動項目，依優先順序排列；每項包含 title、detail（具體做法）、keywords（2-4 個）、dayOffset（從今天起第幾天開始，1-30，越緊急越早）。`;
}
