/**
 * 資料表：adminlogs（後台的每一次修改 = 一筆）
 * ------------------------------------------------------------
 * 誰（actor）在什麼時候，把哪位會員（target）的什麼欄位從什麼改成什麼。
 * 之後增加管理員時，出問題可以查得到是誰改的。
 */
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const adminLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true }, // 例如 user.update、settings.update
    targetId: { type: Schema.Types.ObjectId, ref: "User" },
    targetEmail: { type: String, default: "" },
    changes: { type: Schema.Types.Mixed, default: {} }, // { 欄位: { from, to } }
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminLogSchema.index({ createdAt: -1 });

export type AdminLog = InferSchemaType<typeof adminLogSchema>;

export const AdminLogModel =
  (models.AdminLog as Model<AdminLog>) || model<AdminLog>("AdminLog", adminLogSchema);
