/**
 * 資料表：suggestions（每一則糾錯 / 建議 = 一筆）
 * ------------------------------------------------------------
 * 面試官每次回饋會產生：
 *   - 好幾則 issues（需要修改的地方）  → type = "correction"，一則一筆
 *   - 一則 improvedAnswer（示範改寫）   → type = "improved_answer"
 *
 * 每筆都記錄「使用者有沒有使用這則建議、怎麼使用的」：
 *   viewed   → 展開 / 看過
 *   copied   → 複製了建議內容
 *   applied  → 依建議修改了回答（revisedAnswer 存修改後的版本）
 *   dismissed→ 標記為不採用
 * 一則建議可能被使用好幾次，所以用 usages 陣列保留每一次的紀錄。
 */
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const SUGGESTION_TYPES = ["correction", "improved_answer"] as const;
export const USAGE_ACTIONS = ["viewed", "copied", "applied", "dismissed"] as const;

const usageSchema = new Schema(
  {
    action: { type: String, enum: USAGE_ACTIONS, required: true },
    revisedAnswer: { type: String }, // action = applied 時，使用者修改後的回答
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const suggestionSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "PracticeSession", required: true, index: true },
    clientId: { type: String, required: true, index: true }, // 冗餘存一份，不用 join 就能查某人的建議

    // 對應到哪一題（PracticeSession.turns[turnIndex]）
    turnIndex: { type: Number, required: true },
    questionText: { type: String, required: true }, // 冗餘存題目，單看這筆就知道上下文
    originalAnswer: { type: String, required: true }, // 被糾錯的原始回答

    type: { type: String, enum: SUGGESTION_TYPES, required: true },
    content: { type: String, required: true }, // 建議內容（一則 issue 或整段示範改寫）
    order: { type: Number, default: 0 }, // 同一題多則 issues 時的順序

    // 使用狀況
    used: { type: Boolean, default: false, index: true }, // 是否曾經 copied / applied
    usages: { type: [usageSchema], default: [] },
  },
  { timestamps: true },
);

// 常見查詢：某場練習的所有建議，依題號與順序排列
suggestionSchema.index({ sessionId: 1, turnIndex: 1, order: 1 });

export type Suggestion = InferSchemaType<typeof suggestionSchema>;

export const SuggestionModel =
  (models.Suggestion as Model<Suggestion>) || model<Suggestion>("Suggestion", suggestionSchema);
