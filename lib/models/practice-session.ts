/**
 * 資料表：practicesessions（一場模擬面試練習 = 一筆）
 * ------------------------------------------------------------
 * 存下一場練習的完整對話：
 *   setup       → 使用者填的面試條件
 *   interviewer → AI 面試官角色
 *   research    → 開場搜尋到的面試情報
 *   turns       → 每一輪的「題目 + 回答 + 回饋」，依 index 排序
 *   report      → 練習結束後的診斷書（還沒產生前是 null）
 *
 * 欄位形狀刻意對齊 lib/types.ts，前端的 state 幾乎可以原封不動存進來。
 * 每一則糾錯 / 建議另外存在 suggestions 資料表（見 ./suggestion.ts），
 * 方便單獨查詢「使用者採用了哪些建議」。
 */
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { FinalReport } from "@/lib/types";

// 子文件不需要自己的 _id，關掉讓資料乾淨一點
const sub = { _id: false } as const;

const questionSchema = new Schema(
  {
    kind: { type: String, enum: ["new", "follow-up", "reverse"], required: true },
    category: { type: String, default: "" },
    text: { type: String, required: true },
    intent: { type: String, default: "" },
  },
  sub,
);

const feedbackSchema = new Schema(
  {
    score: { type: Number, min: 1, max: 10, required: true },
    verdict: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    issues: { type: [String], default: [] },
    improvedAnswer: { type: String, default: "" },
    interviewerReply: { type: String }, // 只有反問環節才有
  },
  sub,
);

/** 一輪對話：題目 + 使用者回答 + 面試官回饋 */
const turnSchema = new Schema(
  {
    index: { type: Number, required: true }, // 第幾題（從 0 開始）
    question: { type: questionSchema, required: true },
    answer: { type: String, default: "" },
    feedback: { type: feedbackSchema, default: null }, // 還在等評分時是 null
    askedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date },
  },
  sub,
);

const practiceSessionSchema = new Schema(
  {
    /**
     * 目前沒有登入系統，先用前端產生並存在 localStorage 的匿名 ID 區分使用者
     * 之後加上登入後，可以改成 userId
     */
    clientId: { type: String, required: true, index: true },

    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
      index: true,
    },

    setup: {
      type: new Schema(
        {
          industry: { type: String, required: true },
          company: { type: String, required: true },
          jobDescription: { type: String, required: true },
          totalQuestions: { type: Number, enum: [6, 8, 10], required: true },
        },
        sub,
      ),
      required: true,
    },

    interviewer: {
      type: new Schema(
        {
          name: String,
          title: String,
          organization: String,
          style: String,
        },
        sub,
      ),
      default: null,
    },

    research: {
      type: new Schema(
        {
          companyDataFound: Boolean,
          summary: String,
          focusAreas: [String],
          sources: [new Schema({ title: String, url: String }, sub)],
        },
        sub,
      ),
      default: null,
    },

    turns: { type: [turnSchema], default: [] },

    /** 診斷書結構較深、之後也可能常改，先用 Mixed 整包存，型別以 lib/types.ts 的 FinalReport 為準 */
    report: { type: Schema.Types.Mixed, default: null },

    model: { type: String }, // 這場練習使用的 OpenAI 模型，方便日後比較
    completedAt: { type: Date },
  },
  { timestamps: true }, // 自動加上 createdAt / updatedAt
);

// 常見查詢：某位使用者的練習紀錄，最新的在前
practiceSessionSchema.index({ clientId: 1, createdAt: -1 });

export type PracticeSession = Omit<InferSchemaType<typeof practiceSessionSchema>, "report"> & {
  report: FinalReport | null;
};

// 熱更新時重複使用已編譯的 model，避免 OverwriteModelError
export const PracticeSessionModel =
  (models.PracticeSession as Model<PracticeSession>) ||
  model<PracticeSession>("PracticeSession", practiceSessionSchema);
