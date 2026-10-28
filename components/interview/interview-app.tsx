/**
 * 模擬面試的主控元件（狀態機）
 * ------------------------------------------------------------
 * "use client" 代表這個元件在瀏覽器執行，可以使用 useState、事件處理等互動功能。
 *
 * 整個面試分三個階段（stage）：
 *   setup     → 填寫表單
 *   interview → 一問一答
 *   report    → 顯示「高管級面試戰力診斷書」
 *
 * 所有面試資料（面試官角色、情報、題目、回答、回饋）都存在這裡的 state，
 * 每次呼叫 API 時把需要的資料一起送出（因為後端不保存狀態）。
 *
 * 每場面試開始時產生一個 sessionId，之後的請求都帶著它，後台才能算出「一場練習用了多久、有沒有完成」。
 */
"use client";

import { useRef, useState } from "react";
import type {
  AnswerResponse,
  FinalReport,
  InterviewRequest,
  InterviewSetup,
  Interviewer,
  Question,
  ReportResponse,
  Research,
  StartResponse,
  Turn,
} from "@/lib/types";
import { API_KEY_HEADER, getApiKey, openApiKeySettings } from "@/lib/api-key";
import { newSessionId, track, trackingHeaders } from "@/lib/tracking-client";
import SetupForm from "./setup-form";
import SessionView from "./session-view";
import ReportView from "./report-view";

type Stage = "setup" | "interview" | "report";
/** 目前正在等待哪一種 API 回應；null 表示閒置 */
export type Loading = null | "start" | "answer" | "report";

/** 後端回傳的錯誤（後端已經記錄過，前端不用再回報） */
class ApiError extends Error {}

/**
 * 呼叫後端 /api/interview 的小工具
 * - BYOK：從 localStorage 取出使用者的 OpenAI 金鑰，放在 X-OpenAI-Key 標頭帶給後端
 * - 後端出錯時會回傳 { error }，這裡統一轉成 throw，讓呼叫端用 try/catch 處理
 */
async function callInterviewApi<T>(body: InterviewRequest, sessionId: string | null): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    openApiKeySettings(); // 沒有金鑰就直接打開設定視窗
    throw new ApiError("請先設定你的 OpenAI API Key。");
  }

  const res = await fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json", [API_KEY_HEADER]: apiKey, ...trackingHeaders(sessionId) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: "伺服器回應格式錯誤" }));
  if (res.status === 401) openApiKeySettings(); // 金鑰無效 → 引導使用者重新設定
  if (!res.ok) throw new ApiError(json.error ?? `請求失敗（${res.status}）`);
  return json as T;
}

export default function InterviewApp() {
  const [stage, setStage] = useState<Stage>("setup");
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  const [interviewer, setInterviewer] = useState<Interviewer | null>(null); // AI 面試官角色
  const [research, setResearch] = useState<Research | null>(null);
  const [history, setHistory] = useState<Turn[]>([]); // 已完成的每一輪
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null); // 已送出、等待評分的回答
  const [report, setReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState<Loading>(null);
  const [error, setError] = useState<string | null>(null);

  // 目前這場面試的 ID：ref 給非同步流程讀最新值，state 給畫面（render 時不能讀 ref）
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // 記住「上一次失敗的動作」，讓使用者按「重試」時可以再執行一次
  const retryRef = useRef<(() => void) | null>(null);

  /** 共用的非同步包裝：設定 loading、清除錯誤、失敗時記錄重試動作 */
  async function run(kind: Exclude<Loading, null>, task: () => Promise<void>) {
    setLoading(kind);
    setError(null);
    try {
      await task();
      retryRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
      // 網路斷線、回應解析失敗這類「後端不知道」的錯誤，回報給後台
      if (!(err instanceof ApiError)) {
        track("client_error", sessionIdRef.current, {
          message: err instanceof Error ? err.message : String(err),
          meta: { where: kind },
        });
      }
      retryRef.current = () => run(kind, task);
    } finally {
      setLoading(null);
    }
  }

  /* ---------- 階段 1 → 2：開始面試 ---------- */
  function startInterview(s: InterviewSetup) {
    setSetup(s);
    sessionIdRef.current = newSessionId();
    setSessionId(sessionIdRef.current);
    run("start", async () => {
      const data = await callInterviewApi<StartResponse>({ action: "start", setup: s }, sessionIdRef.current);
      setInterviewer(data.interviewer);
      setResearch(data.research);
      setCurrentQuestion(data.question);
      setHistory([]);
      setStage("interview");
    });
  }

  /* ---------- 階段 2：送出回答 ---------- */
  async function submitAnswer(answer: string) {
    if (!setup || !interviewer || !research || !currentQuestion) return;
    setPendingAnswer(answer); // 先把回答顯示在畫面上，體感比較快
    let finishedHistory: Turn[] | null = null; // 最後一題答完時，記下完整紀錄

    await run("answer", async () => {
      const data = await callInterviewApi<AnswerResponse>({
        action: "answer",
        setup,
        interviewer,
        research,
        history,
        currentQuestion,
        answer,
      }, sessionIdRef.current);

      // 把這一輪（題目 + 回答 + 回饋）加入紀錄
      const newHistory = [...history, { question: currentQuestion, answer, feedback: data.feedback }];
      setHistory(newHistory);
      setPendingAnswer(null);
      setCurrentQuestion(data.nextQuestion);

      if (!data.nextQuestion) finishedHistory = newHistory;
    });

    // nextQuestion 為 null → 題數已滿，自動產生診斷書。
    // 要等 "answer" 的 run 完全結束後再呼叫，否則它的 finally 會把 "report" 的 loading 狀態清掉
    if (finishedHistory) generateReport(finishedHistory);
  }

  /* ---------- 階段 2 → 3：產生總評報告 ---------- */
  function generateReport(finalHistory: Turn[]) {
    if (!setup || !interviewer || !research) return;
    run("report", async () => {
      const data = await callInterviewApi<ReportResponse>({
        action: "report",
        setup,
        interviewer,
        research,
        history: finalHistory,
      }, sessionIdRef.current);
      setReport(data.report);
      setStage("report");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 重新開始：清空所有狀態 ---------- */
  function restart() {
    setStage("setup");
    setInterviewer(null);
    setResearch(null);
    setHistory([]);
    setCurrentQuestion(null);
    setPendingAnswer(null);
    setReport(null);
    setError(null);
    window.scrollTo({ top: 0 });
  }

  /* ---------- 依階段渲染不同畫面 ---------- */
  if (stage === "setup") {
    return (
      <SetupForm
        initial={setup}
        loading={loading === "start"}
        error={error}
        onSubmit={startInterview}
      />
    );
  }

  if (stage === "interview" && setup && interviewer && research) {
    return (
      <SessionView
        setup={setup}
        interviewer={interviewer}
        research={research}
        history={history}
        currentQuestion={currentQuestion}
        pendingAnswer={pendingAnswer}
        loading={loading}
        error={error}
        onAnswer={submitAnswer}
        onRetry={() => retryRef.current?.()}
        onRestart={restart}
      />
    );
  }

  if (stage === "report" && setup && interviewer && report) {
    return (
      <ReportView
        setup={setup}
        interviewer={interviewer}
        report={report}
        history={history}
        sessionId={sessionId}
        onRestart={restart}
      />
    );
  }

  return null;
}
