/**
 * /api/interview — AI 面試官 API（BYOK 模式）
 * ------------------------------------------------------------
 * 這是一個 Route Handler（App Router 版的後端 API），只接受 POST。
 *
 * 【金鑰】不使用伺服器的環境變數，而是讀取瀏覽器送來的 X-OpenAI-Key 標頭，
 *        用使用者自己的 OpenAI 金鑰呼叫模型（Bring Your Own Key）。
 *
 * 【動作】前端送來 { action, ... }，依 action 分派：
 *   verify  → 驗證金鑰是否可用（設定視窗的「測試並儲存」）
 *   analyze → 讀取會員自己的履歷，對照職缺 → 回傳候選人摘要 + 面試官的追問重點（需登入）
 *   start   → 上網搜尋公司面經 → 回傳面試官角色 + 情報 + 第一題
 *             （連續闖關的下一關會帶上一關的 research，就不再搜尋，只換面試官並開場）
 *   answer → 評分使用者回答 → 回傳回饋 + 下一題（最後一題固定是反問環節，答完 nextQuestion = null）
 *   report → 綜合整場表現 → 回傳「高管級面試戰力診斷書」
 *
 * 伺服器「不存」面試內容（stateless），完整的對話紀錄由前端保存，每次請求都一併送上來。
 *
 * 【履歷與規則】setup 裡的 candidate（追問重點）與 presets / customRules（面試官規則）由前端保存並每次帶上，
 *   伺服器先 normalizeSetup() 限制長度與數量，再放進提示詞。
 *
 * 【使用紀錄】analyze / start / answer / report 每次都會在回應送出後（after）寫一筆 usageevents：
 *   token 用量、估算成本、耗時、成功或錯誤訊息，給後台統計用；不存回答內容與金鑰。
 *   前端用 X-Client-Id（匿名瀏覽器 ID）與 X-Session-Id（這場練習的 ID）標頭帶上身分。
 *
 * 【權限】停權的會員不能使用；後台開啟「需要登入」時，訪客不能開始新的面試。
 */
import { Types } from "mongoose";
import { after } from "next/server";
import { getCurrentUser, getSessionUserId } from "@/lib/auth";
import { MODEL, askJSON, describeOpenAIError, verifyApiKey } from "@/lib/openai";
import { EMPTY_USAGE, getSettings, type TokenUsage } from "@/lib/settings";
import { readTrackingHeaders, recordEvent } from "@/lib/usage";
import { connectDB } from "@/lib/mongodb";
import { ResumeModel } from "@/lib/models/resume";
import {
  analyzeSchema,
  answerSchema,
  buildAnalyzeInput,
  buildAnswerInput,
  buildRoundStartInput,
  followUpStreak,
  maxFollowUps,
  buildPersona,
  buildReportInput,
  buildStartInput,
  reportSchema,
  reverseAnswerSchema,
  roundStartSchema,
  stageReportSchema,
  startSchema,
} from "@/lib/prompts";
import {
  API_KEY_HEADER,
  COMPETENCIES,
  CUSTOM_RULE_LIMIT,
  FOCUS_TYPES,
  RULE_PRESETS,
  getStage,
  type ActionItem,
  type AnalyzeResponse,
  type CandidateBrief,
  type AnswerFeedback,
  type AnswerResponse,
  type FinalReport,
  type InterviewRequest,
  type InterviewSetup,
  type Question,
  type ReportResponse,
  type Research,
  type RoundSummary,
  type StartResponse,
  type VerifyResponse,
} from "@/lib/types";

// 網路搜尋 + 模型推理可能需要數十秒，放寬此路由的最長執行時間（部署到 Vercel 時有效）
export const maxDuration = 120;

export async function POST(request: Request) {
  // 1) 讀取使用者的金鑰（BYOK）
  const apiKey = request.headers.get(API_KEY_HEADER)?.trim() ?? "";
  if (!apiKey) {
    return Response.json({ error: "尚未設定 OpenAI API Key，請點右上角「設定 API Key」。" }, { status: 401 });
  }
  if (!apiKey.startsWith("sk-")) {
    return Response.json({ error: "API Key 格式不正確，OpenAI 金鑰應以 sk- 開頭。" }, { status: 400 });
  }

  // 2) 解析請求內容
  let body: InterviewRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  // 3) 驗證金鑰不需要身分，也不記錄使用量
  if (body.action === "verify") {
    try {
      await verifyApiKey(apiKey);
      return Response.json({ ok: true, model: MODEL } satisfies VerifyResponse);
    } catch (err) {
      const { status, message } = describeOpenAIError(err);
      return Response.json({ error: message }, { status });
    }
  }

  const setupError = validateSetup(body.setup);
  if (setupError) return Response.json({ error: setupError }, { status: 400 });
  body.setup = normalizeSetup(body.setup);

  // 4) 身分與權限（資料庫連不上時當作訪客，不影響面試本身）
  const sessionUserId = await getSessionUserId();
  const user = sessionUserId ? await getCurrentUser().catch(() => null) : null;
  if (sessionUserId && !user) {
    // 有登入 Cookie 但查不到可用的帳號 → 已停權或帳號被刪除
    return Response.json({ error: "你的帳號目前無法使用模擬面試，請重新登入或聯絡我們。" }, { status: 403 });
  }
  if (body.action === "analyze" && !user) {
    return Response.json({ error: "請先登入，才能使用帳號裡保存的履歷。" }, { status: 401 });
  }
  if (body.action === "start" && !user) {
    const requireLogin = await getSettings()
      .then((s) => s.requireLogin)
      .catch(() => false);
    if (requireLogin) return Response.json({ error: "請先登入（右上角「登入」）再開始模擬面試。" }, { status: 401 });
  }

  // 5) 依 action 分派，結束後記錄使用量
  const startedAt = Date.now();
  const meter: TokenUsage = { ...EMPTY_USAGE }; // 這次請求所有 OpenAI 呼叫的 token 加總
  const meta: Record<string, unknown> = {
    industry: body.setup.industry.slice(0, 50),
    company: body.setup.company.slice(0, 50),
    totalQuestions: body.setup.totalQuestions,
    withResume: !!body.setup.candidate, // 後台可以比較「有沒有用履歷」的完成率與分數
    stage: body.setup.stage ?? null, // 第幾關（舊版不分關是 null）
  };
  const log = (ok: boolean, httpStatus: number, errorMessage = "") =>
    after(() =>
      recordEvent({
        type: `interview_${body.action}` as "interview_analyze" | "interview_start" | "interview_answer" | "interview_report",
        userId: user?.id,
        ...readTrackingHeaders(request),
        ok,
        httpStatus,
        errorMessage,
        durationMs: Date.now() - startedAt,
        model: MODEL,
        usage: meter,
        meta,
      }),
    );

  try {
    let result: AnalyzeResponse | StartResponse | AnswerResponse | ReportResponse;
    switch (body.action) {
      case "analyze": {
        if (!Types.ObjectId.isValid(body.resumeId)) return Response.json({ error: "找不到這份履歷" }, { status: 404 });
        await connectDB();
        // 同時比對 userId：只能讀自己的履歷
        const resume = await ResumeModel.findOne({ _id: body.resumeId, userId: user!.id }).lean();
        if (!resume) return Response.json({ error: "找不到這份履歷，可能已經被刪除" }, { status: 404 });
        result = await handleAnalyze(apiKey, body.setup, resume.text, meter);
        meta.focusPoints = (result as AnalyzeResponse).candidate.focusPoints.length;
        break;
      }
      case "start":
        // 連續闖關的下一關：沿用上一關的情報，不重新搜尋
        result =
          body.research && body.setup.stage
            ? await handleRoundStart(apiKey, body.setup, normalizeResearch(body.research), meter)
            : await handleStart(apiKey, body.setup, meter);
        break;
      case "answer":
        if (!body.answer?.trim()) return Response.json({ error: "請先輸入回答" }, { status: 400 });
        meta.questionNo = body.history.length + 1;
        result = await handleAnswer(apiKey, body, meter);
        meta.score = (result as AnswerResponse).feedback.score;
        break;
      case "report":
        result = await handleReport(apiKey, body, meter);
        meta.overallScore = (result as ReportResponse).report.overallScore;
        break;
      default:
        return Response.json({ error: "未知的 action" }, { status: 400 });
    }
    log(true, 200);
    return Response.json(result);
  } catch (err) {
    // 注意：只記錄錯誤訊息，絕不把 apiKey 印到 log
    const { status, message } = describeOpenAIError(err);
    console.error("[/api/interview]", status, err instanceof Error ? err.message : err);
    log(false, status, err instanceof Error ? err.message : message);
    return Response.json({ error: message }, { status });
  }
}

/* ------------------------------------------------------------
 * analyze：讀履歷 → 候選人摘要 + 追問重點
 * ------------------------------------------------------------ */
async function handleAnalyze(apiKey: string, setup: InterviewSetup, resumeText: string, meter: TokenUsage): Promise<AnalyzeResponse> {
  const { data, usage } = await askJSON<CandidateBrief>({
    apiKey,
    instructions: buildPersona(),
    input: buildAnalyzeInput(setup, resumeText),
    schemaName: "resume_analysis",
    schema: analyzeSchema,
  });
  addUsage(meter, usage);
  return { candidate: normalizeCandidate(data) ?? { summary: "", focusPoints: [] } };
}

/** 把一次 OpenAI 呼叫的用量累加到這次請求的總計 */
function addUsage(meter: TokenUsage, u: TokenUsage) {
  for (const k of Object.keys(meter) as (keyof TokenUsage)[]) meter[k] += u[k];
}

/* ------------------------------------------------------------
 * start：搜尋面經 + 面試官角色 + 第一題
 * ------------------------------------------------------------ */
async function handleStart(apiKey: string, setup: InterviewSetup, meter: TokenUsage): Promise<StartResponse> {
  const params = {
    apiKey,
    instructions: buildPersona(), // 還沒有角色，由模型依產業 / 公司決定
    input: buildStartInput(setup),
    schemaName: "interview_start",
    schema: startSchema,
  };

  let result: Awaited<ReturnType<typeof askJSON<StartResponse>>>;
  try {
    // 優先開啟網路搜尋，取得真實的面試經驗
    result = await askJSON<StartResponse>({ ...params, webSearch: true });
  } catch (err) {
    // 金鑰錯誤、額度不足這類問題，換方法也沒用，直接往外丟
    if ([401, 429].includes(describeOpenAIError(err).status)) throw err;
    // 若只是 web_search 不支援或搜尋失敗，退而求其次：用模型本身的知識綜合同業資料
    console.warn("[start] web search 失敗，改用模型內建知識");
    result = await askJSON<StartResponse>(params);
    const r = result.data.research;
    r.companyDataFound = false;
    // 沒有真的上網讀面經，篇數與「幾篇提到」都是模型自己估的，歸零避免誤導
    r.reportsCount = 0;
    r.commonQuestions = r.commonQuestions?.map((q) => ({ ...q, mentions: 0 }));
    if (r.salary) r.salary = { ...r.salary, found: false, note: `未能連網搜尋，以下為模型依同業行情推估。${r.salary.note}` };
  }

  addUsage(meter, result.usage);
  const { data, citations } = result;

  // 合併「模型自己列的來源」與「實際搜尋引用的網址」，並以網址去重複
  const seen = new Set<string>();
  const sources = [...citations, ...data.research.sources].filter((s) => {
    if (!s.url.startsWith("http") || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  const r = data.research;
  return {
    interviewer: data.interviewer,
    research: {
      ...r,
      sources: sources.slice(0, 8),
      reportsCount: Math.max(0, Math.round(r.reportsCount ?? 0)),
      // 依出現次數由多到少，最多 10 題
      commonQuestions: (r.commonQuestions ?? [])
        .map((q) => ({ ...q, mentions: Math.max(0, Math.round(q.mentions)) }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 10),
      salary: r.salary ? { ...r.salary, levels: r.salary.levels.slice(0, 5) } : undefined,
    },
    question: { ...data.question, kind: "new" }, // 第一題一定是新題目
  };
}

/* ------------------------------------------------------------
 * start（連續闖關的下一關）：沿用情報，只換面試官並開場
 * ------------------------------------------------------------ */
async function handleRoundStart(apiKey: string, setup: InterviewSetup, research: Research, meter: TokenUsage): Promise<StartResponse> {
  const { data, usage } = await askJSON<Omit<StartResponse, "research">>({
    apiKey,
    instructions: buildPersona(),
    input: buildRoundStartInput(setup, research),
    schemaName: "interview_round_start",
    schema: roundStartSchema,
  });
  addUsage(meter, usage);
  return { interviewer: data.interviewer, research, question: { ...data.question, kind: "new" } };
}

/* ------------------------------------------------------------
 * answer：評分 + 下一題
 * ------------------------------------------------------------ */
async function handleAnswer(
  apiKey: string,
  body: Extract<InterviewRequest, { action: "answer" }>,
  meter: TokenUsage,
): Promise<AnswerResponse> {
  const { setup, interviewer, research, history, answer } = body;
  const currentNo = history.length + 1;

  // 由「伺服器」判斷題號，而不是讓模型決定，確保題數準確：
  //   最後一題 = 反問環節；倒數第二題答完 → 下一題必須是反問環節
  const isLast = currentNo >= setup.totalQuestions;
  const nextIsReverse = currentNo + 1 === setup.totalQuestions;
  const currentQuestion: Question = isLast ? { ...body.currentQuestion, kind: "reverse" } : body.currentQuestion;

  const instructions = buildPersona(interviewer);
  const input = buildAnswerInput(setup, research, history, currentQuestion, answer);

  // 最後一題（反問環節）：評估提問品質 + 面試官回答，不再出題
  if (isLast) {
    const { data, usage } = await askJSON<{ feedback: AnswerFeedback }>({
      apiKey,
      instructions,
      input,
      schemaName: "interview_reverse_answer",
      schema: reverseAnswerSchema,
    });
    addUsage(meter, usage);
    return { feedback: clampFeedback(data.feedback), nextQuestion: null };
  }

  const { data, usage } = await askJSON<{ feedback: AnswerFeedback; nextQuestion: Question }>({
    apiKey,
    instructions,
    input,
    schemaName: "interview_answer",
    schema: answerSchema,
  });
  addUsage(meter, usage);

  // 保險：就算模型沒遵守規則，伺服器端也強制修正題目類型
  //   - 輪到反問環節 → 一定是 reverse
  //   - 這個主題已經連續追問到上限（依關卡，舊版 1 次）→ 不能再追問
  //   - 還沒輪到 → 不能提早出反問
  let kind = data.nextQuestion.kind;
  if (nextIsReverse) kind = "reverse";
  else if (kind === "reverse" || (kind === "follow-up" && followUpStreak(history, currentQuestion) >= maxFollowUps(setup))) kind = "new";

  return {
    feedback: clampFeedback(data.feedback),
    nextQuestion: { ...data.nextQuestion, kind, category: kind === "reverse" ? "反問環節" : data.nextQuestion.category },
  };
}

/* ------------------------------------------------------------
 * report：高管級面試戰力診斷書
 * ------------------------------------------------------------ */
async function handleReport(
  apiKey: string,
  body: Extract<InterviewRequest, { action: "report" }>,
  meter: TokenUsage,
): Promise<ReportResponse> {
  // 模型回傳的行動計畫是「第幾天」，這裡再換算成實際日期
  type RawReport = Omit<FinalReport, "actionPlan"> & {
    actionPlan: (Omit<ActionItem, "date"> & { dayOffset: number })[];
  };

  const { data, usage } = await askJSON<RawReport>({
    apiKey,
    instructions: buildPersona(body.interviewer),
    input: buildReportInput(body.setup, body.research, body.history),
    schemaName: "interview_report",
    // 分關面試的診斷書多了「是否通過」與「留給下一關的重點」
    schema: body.setup.stage ? stageReportSchema : reportSchema,
  });
  addUsage(meter, usage);

  // 六大能力分數限制在 1~10
  const competencies = { ...data.competencies };
  for (const { key } of COMPETENCIES) {
    competencies[key] = { ...competencies[key], score: clamp(competencies[key].score, 1, 10) };
  }

  return {
    report: {
      ...data,
      overallScore: clamp(data.overallScore, 0, 100),
      competencies,
      carryOver: data.carryOver?.slice(0, 6),
      // 把「第幾天」換算成實際日期（YYYY-MM-DD），並依日期排序
      actionPlan: data.actionPlan
        .map(({ dayOffset, ...item }) => ({ ...item, date: addDays(clamp(dayOffset, 1, 30)) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
  };
}

/* ------------------------------------------------------------
 * 小工具
 * ------------------------------------------------------------ */

/** 驗證前端送來的設定，避免空值或亂填題數 */
function validateSetup(setup: InterviewSetup | undefined): string | null {
  if (!setup) return "缺少面試設定";
  if (!setup.industry?.trim()) return "請填寫產業";
  if (!setup.company?.trim()) return "請填寫公司名稱";
  if (!setup.jobDescription?.trim()) return "請填寫職缺描述";
  if (![6, 8, 10].includes(setup.totalQuestions)) return "題數只能是 6、8 或 10";
  return null;
}

/**
 * 整理前端送來的履歷摘要與規則：限制數量與長度、丟掉格式不對的項目。
 * 這些內容會原封不動放進提示詞，不限制的話可能被塞進超長文字，增加 token 成本。
 */
function normalizeSetup(setup: InterviewSetup): InterviewSetup {
  const presetKeys = RULE_PRESETS.map((r) => r.key) as string[];
  return {
    industry: setup.industry,
    company: setup.company,
    jobDescription: setup.jobDescription,
    totalQuestions: setup.totalQuestions,
    candidate: normalizeCandidate(setup.candidate),
    presets: Array.isArray(setup.presets) ? setup.presets.filter((k) => presetKeys.includes(k)) : [],
    stage: getStage(setup.stage)?.no,
    profile: normalizeProfile(setup.profile),
    previousRounds: normalizeRounds(setup.previousRounds),
    customRules: Array.isArray(setup.customRules)
      ? setup.customRules
          .filter((r): r is string => typeof r === "string" && r.trim() !== "")
          .slice(0, CUSTOM_RULE_LIMIT.count)
          .map((r) => r.trim().slice(0, CUSTOM_RULE_LIMIT.length))
      : [],
  };
}

/** 年資只接受 0～50 的數字；目前薪資是自由文字，限制長度 */
function normalizeProfile(p: InterviewSetup["profile"]): InterviewSetup["profile"] {
  if (!p || typeof p !== "object") return undefined;
  const years = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 50 ? Math.round(v * 10) / 10 : undefined);
  const profile = {
    totalYears: years(p.totalYears),
    relevantYears: years(p.relevantYears),
    currentSalary: typeof p.currentSalary === "string" && p.currentSalary.trim() ? p.currentSalary.trim().slice(0, 40) : undefined,
  };
  return Object.values(profile).some((v) => v !== undefined) ? profile : undefined;
}

/** 前幾關的紀錄最多 2 關（第三關前面只有一、二關），字數也限制 */
function normalizeRounds(rounds: RoundSummary[] | undefined): RoundSummary[] {
  if (!Array.isArray(rounds)) return [];
  return rounds
    .filter((r) => r && getStage(r.stage) && Array.isArray(r.carryOver))
    .slice(-2)
    .map((r) => ({
      stage: r.stage,
      interviewer: String(r.interviewer ?? "").slice(0, 80),
      passed: !!r.passed,
      overallScore: clamp(Number(r.overallScore) || 0, 0, 100),
      summary: String(r.summary ?? "").slice(0, 300),
      carryOver: r.carryOver.slice(0, 6).map((c) => String(c).slice(0, 150)),
    }));
}

/** 前端帶回來的情報（連續闖關沿用）：限制長度，避免被塞超長內容 */
function normalizeResearch(r: Research): Research {
  const str = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  return {
    companyDataFound: !!r.companyDataFound,
    summary: str(r.summary, 1000),
    focusAreas: (r.focusAreas ?? []).slice(0, 8).map((f) => str(f, 60)),
    sources: (r.sources ?? []).slice(0, 8).map((x) => ({ title: str(x.title, 150), url: str(x.url, 500) })),
    reportsCount: Number(r.reportsCount) || 0,
    process: r.process
      ? { rounds: str(r.process.rounds, 200), duration: str(r.process.duration, 200), format: str(r.process.format, 200) }
      : undefined,
    commonQuestions: (r.commonQuestions ?? [])
      .slice(0, 10)
      .map((q) => ({ question: str(q.question, 200), category: str(q.category, 30), mentions: Number(q.mentions) || 0 })),
    salary: r.salary
      ? {
          found: !!r.salary.found,
          levels: (r.salary.levels ?? []).slice(0, 5).map((l) => ({ seniority: str(l.seniority, 30), range: str(l.range, 60) })),
          note: str(r.salary.note, 200),
          personal: r.salary.personal
            ? {
                applicable: !!r.salary.personal.applicable,
                basis: str(r.salary.personal.basis, 200),
                range: str(r.salary.personal.range, 80),
                reasoning: (r.salary.personal.reasoning ?? []).slice(0, 5).map((x) => str(x, 200)),
                tips: (r.salary.personal.tips ?? []).slice(0, 4).map((x) => str(x, 200)),
              }
            : undefined,
        }
      : undefined,
  };
}

function normalizeCandidate(c: CandidateBrief | null | undefined): CandidateBrief | null {
  if (!c || typeof c.summary !== "string" || !Array.isArray(c.focusPoints)) return null;
  const e = c.experience;
  const yrs = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(50, Math.max(0, Math.round(v * 10) / 10)) : 0);
  return {
    summary: c.summary.slice(0, 800),
    experience:
      e && typeof e === "object"
        ? { totalYears: yrs(e.totalYears), relevantYears: yrs(e.relevantYears), careerChange: !!e.careerChange, note: String(e.note ?? "").slice(0, 200) }
        : undefined,
    focusPoints: c.focusPoints
      .filter((p) => p && FOCUS_TYPES.includes(p.type) && typeof p.title === "string" && typeof p.detail === "string")
      .slice(0, 10)
      .map((p) => ({ type: p.type, title: p.title.slice(0, 120), detail: p.detail.slice(0, 300) })),
  };
}

/** 把數字限制在範圍內（JSON Schema 的 strict 模式不支援 minimum/maximum，所以自己處理） */
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFeedback(f: AnswerFeedback): AnswerFeedback {
  return { ...f, score: clamp(f.score, 1, 10) };
}

/** 從今天起加 n 天，回傳 YYYY-MM-DD（以台灣時區計算「今天」） */
function addDays(n: number) {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  today.setDate(today.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}
