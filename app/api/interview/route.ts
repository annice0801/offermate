/**
 * /api/interview — AI 面試官 API（BYOK 模式）
 * ------------------------------------------------------------
 * 這是一個 Route Handler（App Router 版的後端 API），只接受 POST。
 *
 * 【金鑰】不使用伺服器的環境變數，而是讀取瀏覽器送來的 X-OpenAI-Key 標頭，
 *        用使用者自己的 OpenAI 金鑰呼叫模型（Bring Your Own Key）。
 *
 * 【動作】前端送來 { action, ... }，依 action 分派：
 *   verify → 驗證金鑰是否可用（設定視窗的「測試並儲存」）
 *   start  → 上網搜尋公司面經 → 回傳面試官角色 + 情報 + 第一題
 *   answer → 評分使用者回答 → 回傳回饋 + 下一題（最後一題固定是反問環節，答完 nextQuestion = null）
 *   report → 綜合整場表現 → 回傳「高管級面試戰力診斷書」
 *
 * 伺服器「不存」面試內容（stateless），完整的對話紀錄由前端保存，每次請求都一併送上來。
 *
 * 【使用紀錄】start / answer / report 每次都會在回應送出後（after）寫一筆 usageevents：
 *   token 用量、估算成本、耗時、成功或錯誤訊息，給後台統計用；不存回答內容與金鑰。
 *   前端用 X-Client-Id（匿名瀏覽器 ID）與 X-Session-Id（這場練習的 ID）標頭帶上身分。
 *
 * 【權限】停權的會員不能使用；後台開啟「需要登入」時，訪客不能開始新的面試。
 */
import { after } from "next/server";
import { getCurrentUser, getSessionUserId } from "@/lib/auth";
import { MODEL, askJSON, describeOpenAIError, verifyApiKey } from "@/lib/openai";
import { EMPTY_USAGE, getSettings, type TokenUsage } from "@/lib/settings";
import { readTrackingHeaders, recordEvent } from "@/lib/usage";
import {
  answerSchema,
  buildAnswerInput,
  buildPersona,
  buildReportInput,
  buildStartInput,
  reportSchema,
  reverseAnswerSchema,
  startSchema,
} from "@/lib/prompts";
import {
  API_KEY_HEADER,
  COMPETENCIES,
  type ActionItem,
  type AnswerFeedback,
  type AnswerResponse,
  type FinalReport,
  type InterviewRequest,
  type InterviewSetup,
  type Question,
  type ReportResponse,
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

  // 4) 身分與權限（資料庫連不上時當作訪客，不影響面試本身）
  const sessionUserId = await getSessionUserId();
  const user = sessionUserId ? await getCurrentUser().catch(() => null) : null;
  if (sessionUserId && !user) {
    // 有登入 Cookie 但查不到可用的帳號 → 已停權或帳號被刪除
    return Response.json({ error: "你的帳號目前無法使用模擬面試，請重新登入或聯絡我們。" }, { status: 403 });
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
  };
  const log = (ok: boolean, httpStatus: number, errorMessage = "") =>
    after(() =>
      recordEvent({
        type: `interview_${body.action}` as "interview_start" | "interview_answer" | "interview_report",
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
    let result: StartResponse | AnswerResponse | ReportResponse;
    switch (body.action) {
      case "start":
        result = await handleStart(apiKey, body.setup, meter);
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
    result.data.research.companyDataFound = false;
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

  return {
    interviewer: data.interviewer,
    research: { ...data.research, sources: sources.slice(0, 8) },
    question: { ...data.question, kind: "new" }, // 第一題一定是新題目
  };
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
  //   - 上一題是追問 → 不能再追問
  //   - 還沒輪到 → 不能提早出反問
  let kind = data.nextQuestion.kind;
  if (nextIsReverse) kind = "reverse";
  else if (kind === "reverse" || (kind === "follow-up" && currentQuestion.kind === "follow-up")) kind = "new";

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
    schema: reportSchema,
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
