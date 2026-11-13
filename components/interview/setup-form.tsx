/**
 * 階段 1：面試設定表單
 * ------------------------------------------------------------
 * 使用者選擇產業（下拉選單，可選「其他」自行輸入）、填寫公司與職缺描述（可套用範本），並選擇題數。
 * 送出後由父元件呼叫 API；等待期間顯示「正在搜尋面經」的載入畫面。
 * 若使用者還沒設定 OpenAI API Key（BYOK），會顯示提示並停用「開始面試」。
 *
 * 面試關卡：選第一關（初篩）、第二關（專業）、第三關（高階主管），選了會帶入該關預設題數。
 *
 * 面試前準備（選填）：
 *   - 你的履歷：登入的會員可選一份履歷，讓 AI 先讀履歷列出追問重點（components/interview/resume-panel.tsx）
 *   - 你的年資：總年資、相關年資、目前薪資，用來算「你的薪資估值」（分析履歷後自動帶入年資）
 *   - 面試官規則：常用規則開關 + 自訂規則（components/interview/rules-panel.tsx）
 * 選了履歷但還沒分析（或分析後改過職缺）就按開始時，父元件會先分析再開始面試。
 */
"use client";

import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { STAGES, type CandidateBrief, type InterviewSetup, type RulePresetKey, type StageNo } from "@/lib/types";
import { JOB_TEMPLATES } from "@/lib/templates";
import { INDUSTRY_GROUPS, OTHER_INDUSTRY, isPresetIndustry } from "@/lib/industries";
import { openApiKeySettings, useApiKey } from "@/lib/api-key";
import Waveform from "@/components/waveform";
import ResumePanel from "./resume-panel";
import RulesPanel from "./rules-panel";

interface Props {
  initial: InterviewSetup | null; // 若之前填過（例如 API 失敗），保留原本的內容
  loading: boolean;
  error: string | null;
  /** analyzeFirst = true：選了履歷但追問重點還沒產生或已過期，開始前要先分析 */
  onSubmit: (setup: InterviewSetup, analyzeFirst: boolean) => void;
  /** 讀履歷產生追問重點（呼叫 /api/interview 的 analyze） */
  onAnalyze: (setup: InterviewSetup, resumeId: string) => Promise<CandidateBrief>;
}

const COUNTS = [
  { value: 6, label: "6 題", hint: "約 10 分鐘" },
  { value: 8, label: "8 題", hint: "約 15 分鐘" },
  { value: 10, label: "10 題", hint: "約 20 分鐘" },
] as const;

export default function SetupForm({ initial, loading, error, onSubmit, onAnalyze }: Props) {
  // 表單欄位的狀態（受控元件：輸入框的值由 state 決定）
  // 產業分成兩個狀態：下拉選單選到的值，以及選「其他」時自行輸入的文字
  const initialIndustry = initial?.industry ?? "";
  const [industryChoice, setIndustryChoice] = useState(
    initialIndustry === "" || isPresetIndustry(initialIndustry) ? initialIndustry : OTHER_INDUSTRY,
  );
  const [customIndustry, setCustomIndustry] = useState(isPresetIndustry(initialIndustry) ? "" : initialIndustry);
  const industry = industryChoice === OTHER_INDUSTRY ? customIndustry : industryChoice; // 最終送出的產業
  const [company, setCompany] = useState(initial?.company ?? "");
  const [jobDescription, setJobDescription] = useState(initial?.jobDescription ?? "");
  const [stage, setStage] = useState<StageNo>(initial?.stage ?? 1);
  const [totalQuestions, setTotalQuestions] = useState<InterviewSetup["totalQuestions"]>(initial?.totalQuestions ?? STAGES[0].defaultQuestions);

  // 面試前準備：履歷與追問重點、面試官規則
  const [resumeId, setResumeId] = useState<string | null>(initial?.resumeId ?? null);
  const [candidate, setCandidate] = useState<CandidateBrief | null>(initial?.candidate ?? null);
  const [presets, setPresets] = useState<RulePresetKey[]>(initial?.presets ?? []);
  const [customRules, setCustomRules] = useState<string[]>(initial?.customRules ?? []);
  // 年資用字串保存輸入框的值（允許空白），送出時才轉成數字
  const [totalYears, setTotalYears] = useState(initial?.profile?.totalYears?.toString() ?? "");
  const [relevantYears, setRelevantYears] = useState(initial?.profile?.relevantYears?.toString() ?? "");
  const [currentSalary, setCurrentSalary] = useState(initial?.profile?.currentSalary ?? "");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  // 追問重點是依「哪份履歷 + 哪個職缺」分析的；任一個改了就算過期
  const analysisKey = `${resumeId}|${company.trim()}|${jobDescription.trim()}`;
  const [analyzedFor, setAnalyzedFor] = useState<string | null>(initial?.candidate ? analysisKey : null);
  const stale = !!candidate && analyzedFor !== analysisKey;

  const hasKey = !!useApiKey(); // 是否已設定 API Key

  // 三個欄位都有填、且已設定金鑰才能送出
  const canSubmit = hasKey && industry.trim() && company.trim() && jobDescription.trim() && !loading;

  function buildSetup(): InterviewSetup {
    return {
      industry: industry.trim(),
      company: company.trim(),
      jobDescription: jobDescription.trim(),
      totalQuestions,
      stage,
      previousRounds: initial?.stage === stage ? initial.previousRounds : undefined, // 換了關卡就不沿用前幾關紀錄
      resumeId: resumeId ?? undefined,
      candidate: resumeId ? candidate : null,
      presets,
      customRules,
      profile: {
        totalYears: toYears(totalYears),
        relevantYears: toYears(relevantYears),
        currentSalary: currentSalary.trim() || undefined,
      },
    };
  }

  // 分析履歷需要：API Key、產業、公司、職缺都填好
  const analyzeBlocker = !hasKey
    ? "設定 API Key 後才能分析履歷。"
    : !industry.trim() || !company.trim() || !jobDescription.trim()
      ? "填好產業、公司與職缺描述後，就能分析履歷。"
      : null;

  async function analyze() {
    if (!resumeId || analyzeBlocker) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const brief = await onAnalyze(buildSetup(), resumeId);
      setCandidate(brief);
      setAnalyzedFor(analysisKey);
      // 履歷推算的年資帶入空白的欄位（使用者已經自己填的就不覆蓋）
      if (brief.experience) {
        if (!totalYears) setTotalYears(String(brief.experience.totalYears));
        if (!relevantYears) setRelevantYears(String(brief.experience.relevantYears));
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "分析失敗，請再試一次");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // 阻止瀏覽器預設的表單送出（會重新整理頁面）
    if (!canSubmit || analyzing) return;
    onSubmit(buildSetup(), !!resumeId && (!candidate || stale));
  }

  // 等待 API 時，改顯示載入畫面
  if (loading) return <ResearchLoader company={company} />;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:gap-12 md:py-14 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
      {/* 左側：說明 */}
      <aside className="animate-rise lg:pt-6">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">Step 1 / Setup</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          告訴面試官，
          <br />
          你要應徵
          <span className="text-gradient-brand">哪裡</span>
        </h1>
        <p className="mt-5 leading-relaxed text-muted">
          我們會先上網搜尋這間公司的面試經驗，並依產業與公司安排一位專屬面試官。資訊越完整，題目越貼近真實面試。
        </p>
        {/* 手機版隱藏說明清單，讓表單更快出現在畫面上 */}
        <ul className="mt-8 hidden space-y-4 text-sm sm:block">
          {[
            ["分三關練習", "初篩、專業、高階主管，每關的面試官與重點都不同，可以連續闖關"],
            ["找得到公司面經", "依照真實流程與常考題型出題"],
            ["上傳履歷", "面試官先讀你的履歷，針對你的經歷深挖、驗證數字"],
            ["找不到公司資料", "自動綜合同產業、同類型公司的資料"],
            ["每答一題", "立即得到分數、錯誤指正與示範改寫"],
            ["最後一題", "反問環節：換你提問，評估思考高度與提問品質"],
            ["面試結束", "開立高管級面試戰力診斷書，可下載存檔"],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>
                <span className="font-medium">{t}</span>
                <span className="text-muted"> — {d}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* 右側：表單卡片 */}
      <form
        onSubmit={handleSubmit}
        className="glass-strong animate-rise space-y-6 rounded-3xl p-6 [animation-delay:100ms] sm:p-8"
      >
        {/* BYOK 提示：尚未設定金鑰時顯示 */}
        {!hasKey && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
            <span>開始前，請先設定你自己的 OpenAI API Key。</span>
            <button
              type="button"
              onClick={openApiKeySettings}
              className="rounded-full bg-warn px-3.5 py-1.5 text-xs font-medium text-white hover:bg-ink"
            >
              設定 API Key
            </button>
          </div>
        )}

        {/* 職缺範本：點一下自動帶入產業與 JD */}
        <div>
          <span className="mb-2 block font-mono text-xs text-muted">快速套用範本</span>
          <div className="flex flex-wrap gap-2">
            {JOB_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  setIndustryChoice(t.industry);
                  setJobDescription(t.jobDescription);
                }}
                className="rounded-full bg-white/70 px-3.5 py-1.5 text-sm transition hover:bg-ink hover:text-paper"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="產業" htmlFor="industry">
            {/* 原生 <select>：手機上會叫出系統內建的選擇器，操作最順手 */}
            <div className="relative">
              <select
                id="industry"
                value={industryChoice}
                onChange={(e) => setIndustryChoice(e.target.value)}
                className={`${inputClass} cursor-pointer appearance-none pr-10 ${industryChoice === "" ? "text-muted/60" : ""}`}
              >
                <option value="" disabled>
                  請選擇產業
                </option>
                {INDUSTRY_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value={OTHER_INDUSTRY}>其他（自行輸入）</option>
              </select>
              {/* 自訂下拉箭頭（appearance-none 把原生箭頭隱藏了） */}
              <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted" />
            </div>
            {industryChoice === OTHER_INDUSTRY && (
              <input
                aria-label="自行輸入產業"
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                placeholder="請輸入產業名稱"
                autoFocus
                className={`${inputClass} mt-2`}
              />
            )}
          </Field>
          <Field label="公司名稱" htmlFor="company">
            <input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="例如：台積電、LINE、Shopee"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="職缺描述" htmlFor="jd" hint={`${jobDescription.length} 字`}>
          <textarea
            id="jd"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={9}
            placeholder="貼上職缺的工作內容、條件要求…或點上方範本快速帶入"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        {/* 面試關卡：每關的面試官、重點、深度不同，選了會帶入預設題數 */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">練習哪一關</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {STAGES.map((st) => {
              const active = stage === st.no;
              return (
                <button
                  key={st.no}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setStage(st.no);
                    setTotalQuestions(st.defaultQuestions);
                  }}
                  className={`rounded-2xl border px-3.5 py-3 text-left transition ${
                    active ? "border-ink bg-ink text-white shadow-md" : "border-white bg-white/60 hover:bg-white"
                  }`}
                >
                  <span className={`block font-mono text-[11px] ${active ? "text-accent-bright" : "text-accent"}`}>第 {st.no} 關</span>
                  <span className="block font-medium">{st.name}</span>
                  <span className={`mt-1 block text-xs leading-relaxed ${active ? "text-white/70" : "text-muted"}`}>
                    {st.interviewer}・{st.summary}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">每關都從自我介紹開始；完成後可以直接進入下一關，下一關的面試官會知道你前一關說過的重點。</p>
        </fieldset>

        {/* 題數選擇：分段按鈕（radio 的視覺化版本） */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">面試題數（含追問，最後一題為反問環節）</legend>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-ink/5 p-1.5">
            {COUNTS.map((c) => {
              const active = totalQuestions === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTotalQuestions(c.value)}
                  className={`rounded-xl px-3 py-2.5 text-center transition ${
                    active ? "bg-white text-ink shadow-md" : "text-muted hover:text-ink"
                  }`}
                >
                  <span className="block font-medium">{c.label}</span>
                  <span className="block text-xs text-muted">{c.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* 面試前準備（選填）：履歷 + 面試官規則 */}
        <section className="space-y-5 border-t border-ink/10 pt-6">
          <div>
            <p className="mb-1 text-sm font-medium">
              你的履歷 <span className="font-normal text-muted">（選填）</span>
            </p>
            <p className="mb-3 text-xs text-muted">面試官會像真的讀過你的履歷一樣，深挖你的經歷、確認履歷上的數字。</p>
            <ResumePanel
              resumeId={resumeId}
              onSelect={setResumeId}
              candidate={candidate}
              onCandidateChange={(c) => {
                setCandidate(c);
                if (!c) setAnalyzedFor(null);
              }}
              stale={stale}
              analyzing={analyzing}
              analyzeError={analyzeError}
              analyzeBlocker={analyzeBlocker}
              onAnalyze={analyze}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">
              你的年資 <span className="font-normal text-muted">（選填）</span>
            </p>
            <p className="mb-3 text-xs text-muted">
              網路上的薪資級距只看年資，轉職者的「總年資」和「相關年資」差很多。填了之後，面試情報會依你的年資算出個人薪資估值。分析履歷會自動帶入年資。
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.4fr]">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">總年資（年）</span>
                <input type="number" min={0} max={50} step={0.5} inputMode="decimal" value={totalYears} onChange={(e) => setTotalYears(e.target.value)} placeholder="例如 5" className={smallInput} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">這個職務的相關年資</span>
                <input type="number" min={0} max={50} step={0.5} inputMode="decimal" value={relevantYears} onChange={(e) => setRelevantYears(e.target.value)} placeholder="例如 1.5" className={smallInput} />
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1 block text-xs text-muted">目前／上一份薪資</span>
                <input value={currentSalary} onChange={(e) => setCurrentSalary(e.target.value)} maxLength={40} placeholder="例如 年薪 85 萬" className={smallInput} />
              </label>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">只用在這場面試的估算，不會存進資料庫。</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">
              面試官規則 <span className="font-normal text-muted">（選填）</span>
            </p>
            <RulesPanel presets={presets} onPresetsChange={setPresets} customRules={customRules} onCustomRulesChange={setCustomRules} />
          </div>
        </section>

        {error && <p className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 font-medium text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-muted"
        >
          {resumeId && (!candidate || stale) ? "分析履歷並開始面試" : "開始面試"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>
    </div>
  );
}

/* ---------- 表單小元件 ---------- */

const smallInput =
  "w-full rounded-xl border border-white bg-white/60 px-3 py-2 text-sm tabular-nums outline-none transition placeholder:text-muted/60 focus:bg-white focus:ring-4 focus:ring-accent-bright/20";

/** 年資輸入框的字串 → 數字；空白或不合理的值當作沒填 */
function toYears(v: string) {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 50 ? n : undefined;
}

const inputClass =
  "w-full rounded-xl border border-white bg-white/60 px-4 py-3 text-[15px] outline-none transition placeholder:text-muted/60 focus:bg-white focus:ring-4 focus:ring-accent-bright/20";

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex justify-between text-sm font-medium">
        {label}
        {hint && <span className="font-mono text-xs font-normal text-muted">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * 開場載入畫面
 * 網路搜尋可能要 20~60 秒，用輪播的步驟文字讓使用者知道系統在做什麼
 */
function ResearchLoader({ company }: { company: string }) {
  const steps = [
    `搜尋「${company}」的面試心得與面經`,
    "閱讀論壇、求職平台上的經驗分享",
    "整理面試流程與常考題型",
    "比對職缺描述，設計題目",
    "安排專屬面試官入座",
  ];
  const [step, setStep] = useState(0);

  // 每 5 秒前進一步，停在最後一步（不會繞回去，避免看起來像卡住重來）
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 5000);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center" role="status" aria-live="polite">
      {/* 脈衝光圈 + 音訊波形 */}
      <div className="relative grid size-32 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent-bright/20" />
        <span className="glass-strong absolute inset-3 rounded-full" />
        <Waveform active bars={9} className="relative h-10 w-16" />
      </div>
      <h2 className="mt-10 text-2xl font-semibold tracking-tight">正在為你準備面試</h2>
      <ol className="mt-8 w-full space-y-3 text-left">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
              i === step ? "glass font-medium" : i < step ? "text-muted line-through decoration-line" : "text-muted/50"
            }`}
          >
            <span className={`grid size-5 place-items-center rounded-full text-[10px] ${i < step ? "bg-accent text-white" : i === step ? "bg-ink text-white" : "border border-ink/15"}`}>
              {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-8 font-mono text-xs text-muted">網路搜尋約需 20–60 秒，請勿關閉頁面</p>
    </div>
  );
}
