/**
 * 資料表：resumes（會員上傳的一份履歷 = 一筆）
 * ------------------------------------------------------------
 * 只存「從 PDF 解析出來的文字」，不存原始 PDF 檔：
 *   - 出題只需要文字
 *   - 少存一份含照片、地址等個資的原始檔，比較安全
 *
 * 只有本人看得到、用得到（API 一律用 userId 篩選）；後台也不顯示履歷內容。
 * 每位會員最多保存 MAX_RESUMES 份，刪除就是真的從資料庫刪掉。
 */
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const MAX_RESUMES = 5;
export const MAX_RESUME_CHARS = 20000; // 解析後的文字上限（約 8～10 頁履歷），超過的部分截掉

const resumeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true },
    text: { type: String, required: true },
    pages: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type Resume = InferSchemaType<typeof resumeSchema>;

export const ResumeModel = (models.Resume as Model<Resume>) || model<Resume>("Resume", resumeSchema);
