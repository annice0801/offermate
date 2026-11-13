/**
 * DELETE /api/resumes/:id — 刪除自己的一份履歷（需登入）
 * 同時比對 userId，所以就算猜到別人的履歷 ID 也刪不掉。
 */
import { Types } from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ResumeModel } from "@/lib/models/resume";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) return Response.json({ error: "找不到這份履歷" }, { status: 404 });

  await connectDB();
  const result = await ResumeModel.deleteOne({ _id: id, userId: user.id });
  if (!result.deletedCount) return Response.json({ error: "找不到這份履歷" }, { status: 404 });
  return Response.json({ ok: true });
}
