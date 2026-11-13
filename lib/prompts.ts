/**
 * 提示詞（Prompt）與 JSON Schema
 * ------------------------------------------------------------
 * 把「要叫 AI 做什麼」集中管理，API Route 就只負責流程控制。
 * 想調整面試官風格、評分標準，改這支檔案就好。
 */
import {
  COMPETENCIES,
  FOCUS_LABELS,
  FOCUS_TYPES,
  RULE_PRESETS,
  getStage,
  type Interviewer,
  type InterviewSetup,
  type Question,
  type Research,
  type Turn,
} from "./types";

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
    category: { type: "string", description: "題目面向，如：自我介紹、履歷深挖、行為面試、技術深度、情境題、產業洞察、動機與文化契合、反問環節" },
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

/** analyze：讀履歷 → 候選人摘要 + 面試官的追問重點 */
export const analyzeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "focusPoints", "experience"],
  properties: {
    summary: { type: "string", description: "候選人背景摘要，2-4 句" },
    experience: {
      type: "object",
      additionalProperties: false,
      required: ["totalYears", "relevantYears", "careerChange", "note"],
      properties: {
        totalYears: { type: "number", description: "總工作年資（年，可到 0.5），實習與學生打工不算" },
        relevantYears: { type: "number", description: "和應徵職務直接相關的年資（年，可到 0.5）" },
        careerChange: { type: "boolean", description: "是否轉換跑道：相關年資明顯少於總年資" },
        note: { type: "string", description: "一句話說明怎麼算的" },
      },
    },
    focusPoints: {
      type: "array",
      description: "5-8 個追問重點，依重要性排序",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "detail"],
        properties: {
          type: { type: "string", enum: [...FOCUS_TYPES] },
          title: { type: "string", description: "一句話點出履歷上的具體內容，例如「主導 App 改版，留存率提升 30%」" },
          detail: { type: "string", description: "面試官打算怎麼問、想確認什麼，1-2 句" },
        },
      },
    },
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
      required: ["companyDataFound", "summary", "focusAreas", "sources", "reportsCount", "process", "commonQuestions", "salary"],
      properties: {
        companyDataFound: { type: "boolean" },
        summary: { type: "string" },
        focusAreas: stringArray,
        reportsCount: { type: "integer", description: "實際讀到的面試分享篇數" },
        process: {
          type: "object",
          additionalProperties: false,
          required: ["rounds", "duration", "format"],
          properties: {
            rounds: { type: "string", description: "幾關、每關是誰面，一句話" },
            duration: { type: "string", description: "每關多久、從投遞到結果多久，一句話" },
            format: { type: "string", description: "視訊 / 現場 / 筆試 / 作業 / 英文等形式，一句話" },
          },
        },
        commonQuestions: {
          type: "array",
          description: "面經中實際被問到的題目，依 mentions 由多到少",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "category", "mentions"],
            properties: {
              question: { type: "string" },
              category: { type: "string" },
              mentions: { type: "integer", description: "在幾篇分享中出現過（同一篇只算一次）" },
            },
          },
        },
        salary: {
          type: "object",
          additionalProperties: false,
          required: ["found", "levels", "note", "personal"],
          properties: {
            found: { type: "boolean", description: "是否找到這間公司 / 這個職位的實際薪資分享" },
            personal: {
              type: "object",
              additionalProperties: false,
              required: ["applicable", "basis", "range", "reasoning", "tips"],
              description: "依候選人年資換算的個人估值；沒有候選人年資資訊時 applicable = false、其他欄位給空值",
              properties: {
                applicable: { type: "boolean" },
                basis: { type: "string", description: "用什麼年資對應哪個級距，一句話" },
                range: { type: "string", description: "個人估值區間，含單位，例如「年薪 85–100 萬」" },
                reasoning: { ...stringArray, description: "2-4 點推算理由" },
                tips: { ...stringArray, description: "2-3 點談薪建議" },
              },
            },
            levels: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["seniority", "range"],
                properties: {
                  seniority: { type: "string", description: "年資區間，例如「1–3 年」" },
                  range: { type: "string", description: "含單位，例如「年薪 90–120 萬」或「月薪 5.5–7 萬」" },
                },
              },
            },
            note: { type: "string", description: "資料來源與注意事項，一句話" },
          },
        },
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

/** 連續闖關的下一關：沿用上一關的面試情報，只需要新的面試官與第一題 */
export const roundStartSchema = {
  type: "object",
  additionalProperties: false,
  required: ["interviewer", "question"],
  properties: {
    interviewer: startSchema.properties.interviewer,
    question: questionSchema,
  },
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

/** 分關面試的診斷書：多了這一關是否通過、留給下一關的重點 */
export const stageReportSchema = {
  ...reportSchema,
  required: [...reportSchema.required, "stagePassed", "stageVerdict", "carryOver"],
  properties: {
    ...reportSchema.properties,
    stagePassed: { type: "boolean", description: "以這一關的標準，候選人是否能進入下一關" },
    stageVerdict: { type: "string", description: "通過或不通過的主要原因，1-2 句" },
    carryOver: { ...stringArray, description: "留給下一關面試官的 3-5 個重點：候選人說過的關鍵資訊（期望薪資、離職原因、到職日）、值得再確認或深挖的說法" },
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
${s.jobDescription}${describeStage(s)}${describePreviousRounds(s)}${describeCandidate(s)}${describeRules(s)}`;
}

/** 這一關的定位與出題規則（分關面試才有） */
function describeStage(s: InterviewSetup) {
  const st = getStage(s.stage);
  if (!st) return "";
  return `

【本場是第 ${st.no} 關：${st.name}】面試官是${st.interviewer}，重點：${st.summary}
${st.rules.map((r) => `- ${r}`).join("\n")}
- 面試情報中若有這間公司第 ${st.no} 關的實際形式，以實際形式為準調整。`;
}

/** 連續闖關：前面幾關的紀錄 */
function describePreviousRounds(s: InterviewSetup) {
  if (!s.previousRounds?.length) return "";
  const rounds = s.previousRounds
    .map((r) => {
      const st = getStage(r.stage);
      return `第 ${r.stage} 關（${st?.name ?? ""}，面試官 ${r.interviewer}）${r.passed ? "通過" : "未通過"}，${r.overallScore} 分：${r.summary}
  重點：${r.carryOver.join("；")}`;
    })
    .join("\n");
  return `

【前面幾關的紀錄】（你從同事那裡拿到的面試紀錄）
${rounds}
- 不要重複前幾關已經問過的問題；可以針對上面的重點再確認或深入（例如候選人在一面提過的期望薪資、離職原因），檢查說法是否前後一致。`;
}

/** 候選人履歷摘要與追問重點（有上傳履歷才有） */
function describeCandidate(s: InterviewSetup) {
  const c = s.candidate;
  if (!c) return "";
  const points = c.focusPoints.map((p, i) => `${i + 1}.［${FOCUS_LABELS[p.type]}］${p.title}：${p.detail}`).join("\n");
  return `

【候選人履歷摘要】
${c.summary}
【你讀完履歷後決定的追問重點】
${points || "（無）"}`;
}

/** 使用者指定的面試官規則：優先於一般出題習慣 */
function describeRules(s: InterviewSetup) {
  const rules = [
    ...RULE_PRESETS.filter((r) => s.presets?.includes(r.key)).map((r) => r.prompt),
    ...(s.customRules ?? []),
  ];
  if (!rules.length) return "";
  return `

【這場面試的特別規則】（候選人指定，請優先遵守；與一般規則衝突時以這裡為準）
${rules.map((r) => `- ${r}`).join("\n")}`;
}

/**
 * 深度控制：同一主題最多能「連續」追問幾次（分關面試依關卡，舊版固定 1 次）
 * followUpStreak：算上目前這題，已經連續追問了幾次
 * API Route 也用同一組函式強制修正模型的 kind，提示詞和伺服器的規則才會一致。
 */
export function maxFollowUps(setup: InterviewSetup) {
  return getStage(setup.stage)?.maxFollowUps ?? 1;
}

export function followUpStreak(history: Turn[], current: Question) {
  let n = current.kind === "follow-up" ? 1 : 0;
  if (!n) return 0;
  for (let i = history.length - 1; i >= 0 && history[i].question.kind === "follow-up"; i--) n++;
  return n;
}

/** 有面經題目時加在出題規則裡的一句話：讓模擬面試盡量貼近真的會被問的題目 */
function realQuestionRule(r: Research) {
  return r.commonQuestions?.length
    ? "出新題時，優先從【面經中實際被問過的題目】挑「出現次數多、還沒問過」的題目，依職缺與面試官口吻改寫成自然的問法。"
    : "";
}

/** 有履歷時加在出題規則裡的一句話 */
function resumeRule(s: InterviewSetup) {
  return s.candidate?.focusPoints.length
    ? "題目要穿插「履歷深挖」：從【追問重點】中挑尚未問過的項目，引用履歷上的具體內容提問（例如「你在履歷上提到…，當時…？」），像真正讀過履歷的面試官一樣。"
    : "";
}

function describeResearch(r: Research) {
  const questions = (r.commonQuestions ?? []).map((q) => `- ${q.question}（${q.mentions} 篇提到）`).join("\n");
  return `【面試情報】${r.companyDataFound ? "（來自該公司面經）" : "（無該公司資料，綜合同業）"}
${r.summary}
常考重點：${r.focusAreas.join("、")}${r.process ? `\n面試流程：${r.process.rounds}；${r.process.duration}；${r.process.format}` : ""}${
    questions ? `\n面經中實際被問過的題目：\n${questions}` : ""
  }`;
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
   reportsCount：你實際讀到幾篇面試分享（只算真的讀到的）。
   process：從面經整理面試流程 — rounds（幾關、每關是誰面）、duration（每關多久、從投遞到結果多久）、format（視訊 / 現場 / 筆試 / 作業 / 英文）。查不到的項目寫「無公開資料」，不要猜。
   commonQuestions：列出面經中「實際被問到」的題目 6-10 題，mentions 是這題（或幾乎相同的問法）在幾篇分享中出現過，同一篇只算一次，依 mentions 由多到少排序。
     找不到該公司面經時，改列同業同職位常見題，mentions 依同業分享計算。不要捏造沒看到的題目。
   salary：先從職缺描述判斷職稱，另外搜尋「${setup.company} + 職稱 + 薪水」與 104 薪資情報、1111、Glassdoor、Levels.fyi、PTT / Dcard 薪資分享，依年資列 2-4 個區間（例如 0–2 年、3–5 年、5 年以上），range 要寫單位（年薪 / 月薪、新台幣）。
     找到這間公司這個職位的實際分享 → found = true；只能用同業同職級推估 → found = false。note 用一句話說明資料來源與年份。
   salary.personal：${personalSalaryRule(setup)}
4. interviewer：設定一位最可能面試這個職缺的面試官角色。
   - ${getStage(setup.stage)?.persona ?? "title 是英文職稱，要比職缺高 1-2 階並屬於同一職能（例如應徵 PM → Senior Product Director）"}。
   - organization 用「${setup.company}」；name 選符合公司文化的名字（外商可用英文名、本土企業可用中文名）。
   - style 依面試情報描述這位面試官的風格。
5. ${openingRule(setup)}
${resumeRule(setup)}`;
}

/**
 * 個人薪資估值的規則：網路級距只看年資，轉職者的「總年資」和「相關年資」差很多，
 * 所以要求模型以相關年資為主、可轉移經驗酌量加成，並參考目前薪資。
 */
function personalSalaryRule(setup: InterviewSetup) {
  const p = setup.profile;
  const exp = setup.candidate?.experience;
  if (p?.totalYears == null && p?.relevantYears == null) {
    return "沒有候選人的年資資訊，applicable = false，basis、range 給空字串，reasoning、tips 給空陣列。";
  }
  const facts = [
    p.totalYears != null && `總年資 ${p.totalYears} 年`,
    p.relevantYears != null && `與這個職務相關的年資 ${p.relevantYears} 年`,
    p.currentSalary && `目前 / 上一份薪資：${p.currentSalary}`,
    exp?.note && `年資說明：${exp.note}`,
  ]
    .filter(Boolean)
    .join("；");
  return `候選人資訊：${facts}。請依此換算個人估值（applicable = true）：
     - 主要依「相關年資」對應上面的年資級距，不要直接用總年資。
     - 轉換跑道時，非相關經驗不能全額計入；可轉移的部分（管理經驗、同產業知識、相關技能、${setup.candidate ? "履歷上與職缺相關的成果" : "與職缺相關的成果"}）可以酌量往上調，依關聯度一般約 +5～20%，說明調了多少、為什麼。
     - 有目前薪資時一起考慮：一般跳槽常見調幅約 10～20%；轉換跑道可能持平甚至略降；目前薪資明顯高於級距時，說明能爭取到的上限與理由。
     - basis 寫「用多少年資對應哪個級距」；range 寫區間與單位；reasoning 2-4 點推算過程；tips 2-3 點具體談薪建議（例如開價怎麼說、哪些經驗可以拿來談）。`;
}

/** 第一題的規則：分關面試固定是各關版本的自我介紹，舊版則由模型自由暖身 */
function openingRule(setup: InterviewSetup) {
  const st = getStage(setup.stage);
  if (st) {
    return `第一題（kind = "new"，category = "自我介紹"）：${st.opening} 用這位面試官的口吻自然地開場（先簡短打招呼、說明今天這關的流程），再提出這個請求。intent 寫這關的自我介紹想看什麼。`;
  }
  return `根據情報與職缺描述出第一題（kind = "new"）。第一題通常是暖身（可以從 commonQuestions 挑面經中常見的開場題），但要帶入公司或職缺的脈絡${setup.candidate ? "；有履歷時可以請候選人從履歷上的某段經歷切入自我介紹" : ""}。`;
}

/** 連續闖關的下一關：情報沿用上一關，只要設定新面試官並開場 */
export function buildRoundStartInput(setup: InterviewSetup, research: Research) {
  const st = getStage(setup.stage);
  return `${describeSetup(setup)}

${describeResearch(research)}

現在要進行第 ${st?.no} 關${setup.previousRounds?.length ? "（候選人已經面過前面的關卡，紀錄如上）" : ""}。面試情報已經整理好，不需要再搜尋。請完成：
1. interviewer：設定這一關的面試官 — ${st?.persona}。organization 用「${setup.company}」；name 選符合公司文化的名字，不要和前幾關的面試官同名；style 依面試情報與這一關的定位描述。
2. ${openingRule(setup)}`;
}

/** analyze：讀履歷，對照職缺，整理面試官的追問重點 */
export function buildAnalyzeInput(setup: InterviewSetup, resumeText: string) {
  return `【應徵產業】${setup.industry}
【應徵公司】${setup.company}
【職缺描述】
${setup.jobDescription}

【候選人履歷】（從 PDF 擷取的文字，排版可能有些混亂）
${resumeText}

你正在準備明天面試這位候選人。請像資深面試官一樣仔細讀履歷、對照職缺，完成：
1. summary：2-4 句話摘要候選人的背景（年資、主要經歷、專長），用第三人稱。
2. focusPoints：列出 5-8 個面試時一定要問的重點，依重要性排序，類型如下：
   - highlight：和職缺最相關的亮點經歷，要深挖細節與「他本人」的貢獻
   - verify：履歷上的數字、成果、頭銜，要確認是否屬實、怎麼算出來的
   - gap：空窗期、頻繁換工作、年資很短、轉換跑道，要問原因
   - mismatch：職缺要求但履歷上看不到或不足的地方
   - skill：履歷列出的關鍵技能，要考實際熟練度
   title 必須引用履歷上的具體內容（公司、專案、數字），不要寫空泛的描述；沒有出現在履歷上的事情不要捏造。
   如果某一類找不到值得問的，就不要硬湊。
3. experience：從工作經歷的起訖年月推算年資（算到今天，可到 0.5 年）。
   - totalYears：所有正職工作年資加總，重疊期間不重複算，實習與學生打工不算。
   - relevantYears：只算和這個職缺「職能相同或高度相關」的經歷，例如應徵 PM，行銷、業務不算，但做過產品相關專案的部分可酌量計入。
   - careerChange：相關年資明顯少於總年資時為 true。note 用一句話說明哪些經歷有算、哪些沒算。`;
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
    } else if (followUpStreak(history, current) >= maxFollowUps(setup)) {
      nextRule = `2. nextQuestion：還剩 ${remaining} 題（最後一題是反問環節）。這個主題已經連續追問 ${followUpStreak(history, current)} 次（上限 ${maxFollowUps(setup)} 次），下一題必須是新題目（kind = "new"），並換一個尚未問過的面向。${realQuestionRule(research)}${resumeRule(setup)}`;
    } else if (current.kind === "follow-up") {
      nextRule = `2. nextQuestion：還剩 ${remaining} 題（最後一題是反問環節）。目前這題是追問（這個主題還能再追問 ${maxFollowUps(setup) - followUpStreak(history, current)} 次）。如果回答還是不夠具體、數字或個人貢獻交代不清，繼續往下一層追問（kind = "follow-up"）；已經問清楚就出新題目（kind = "new"），換一個尚未問過的面向。${realQuestionRule(research)}${resumeRule(setup)}`;
    } else {
      nextRule = `2. nextQuestion：還剩 ${remaining} 題（最後一題是反問環節）。若回答含糊、缺乏細節或有值得深挖之處，可以追問（kind = "follow-up"）；否則出新題目（kind = "new"），並換一個尚未問過的面向。題目要貼近面試情報與職缺需求。${realQuestionRule(research)}${resumeRule(setup)}`;
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

/** 分關面試的評分標準：診斷書要依這一關的重點評分，並判斷能不能進下一關 */
function reportStageRule(setup: InterviewSetup) {
  const st = getStage(setup.stage);
  if (!st) return "";
  return `這是第 ${st.no} 關「${st.name}」。${st.grading}
- stagePassed：以「這一關」的標準判斷能否進入${st.no < 3 ? "下一關" : "錄取階段"}；stageVerdict 用 1-2 句說明主要原因。
- carryOver：列出 3-5 個留給下一關面試官的重點（候選人說過的期望薪資、離職原因、到職日，或值得再確認、深挖的說法）。

`;
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

${reportStageRule(setup)}請以這間公司高階主管的標準，產出一份「高管級面試戰力診斷書」：
- overallScore（0-100）要與各題表現一致。
- competencies：六大能力各給 1-10 分與一句具體評語（要引用候選人的回答作為依據）：
${COMPETENCIES.map((c) => `  · ${c.key}：${c.zh}（${c.en}）`).join("\n")}
  其中「情緒穩定與抗壓性」請從候選人面對追問、困難題時的回答品質判斷；「文化契合度」請對照面試情報中的公司文化。
- reverseQuestionInsight：評論反問環節展現的思考高度與提問品質，2-3 句。
- strengths / improvements：各 3-5 點，針對整個面試過程，要具體引用候選人的回答。${setup.candidate ? "\n  有履歷時，improvements 要包含「回答是否撐得起履歷上寫的內容」：哪些經歷講得不夠具體、數字說不清楚、或和履歷描述不一致。" : ""}
- powerKeywords：6-10 個建議候選人下次面試主動使用的專業關鍵字（與此職缺、產業相關）。
- actionPlan：3-5 個行動項目，依優先順序排列；每項包含 title、detail（具體做法）、keywords（2-4 個）、dayOffset（從今天起第幾天開始，1-30，越緊急越早）。`;
}
