/**
 * PATCH /api/admin/users/:id — 修改會員（只有 admin 可以）
 * ------------------------------------------------------------
 * 可修改：role（權限）、plan（會員等級）、status（停權 / 恢復）、adminNote（備註）
 *
 * 保護規則（避免把自己或擁有者鎖在門外）：
 *   - 不能修改自己的 role / status
 *   - 擁有者（ADMIN_EMAILS）的 role / status 不能被任何人修改
 * 每次修改都寫一筆 adminlogs。
 */
import { isOwnerEmail, requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { AdminLogModel } from "@/lib/models/admin-log";
import { UserModel } from "@/lib/models/user";
import { PLANS, ROLES, USER_STATUSES } from "@/lib/roles";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const actor = await requireAdmin("edit");
  if (actor instanceof Response) return actor;

  const { id } = await ctx.params;
  let body: { role?: string; plan?: string; status?: string; adminNote?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  await connectDB();
  const target = await UserModel.findById(id).catch(() => null);
  if (!target) return Response.json({ error: "找不到這位會員" }, { status: 404 });

  // 擁有者實際上一定是 admin + active（資料庫裡可能還是舊值），用「實際生效的值」判斷有沒有要改
  const isOwner = isOwnerEmail(target.email);
  const effectiveRole = isOwner ? "admin" : target.role;
  const effectiveStatus = isOwner ? "active" : target.status;
  const changingAccess = (body.role !== undefined && body.role !== effectiveRole) || (body.status !== undefined && body.status !== effectiveStatus);
  if (changingAccess && target.id === actor.id) {
    return Response.json({ error: "不能修改自己的權限或狀態" }, { status: 400 });
  }
  if (changingAccess && isOwner) {
    return Response.json({ error: "擁有者的權限與狀態不能修改（設定在 ADMIN_EMAILS）" }, { status: 400 });
  }
  if (isOwner) {
    // 沒有要改權限時，也不要把擁有者資料庫裡的舊值寫回去
    delete body.role;
    delete body.status;
  }

  if (body.role !== undefined && !ROLES.includes(body.role as never)) return Response.json({ error: "無效的權限" }, { status: 400 });
  if (body.plan !== undefined && !PLANS.includes(body.plan as never)) return Response.json({ error: "無效的會員等級" }, { status: 400 });
  if (body.status !== undefined && !USER_STATUSES.includes(body.status as never)) return Response.json({ error: "無效的狀態" }, { status: 400 });
  if (body.adminNote !== undefined && typeof body.adminNote !== "string") return Response.json({ error: "備註格式錯誤" }, { status: 400 });

  // 只記錄真的有變的欄位
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of ["role", "plan", "status", "adminNote"] as const) {
    const next = key === "adminNote" ? body.adminNote?.slice(0, 1000) : body[key];
    if (next !== undefined && next !== target[key]) {
      changes[key] = { from: target[key], to: next };
      target.set(key, next);
    }
  }
  if (!Object.keys(changes).length) return Response.json({ ok: true, changed: false });

  await target.save();
  await AdminLogModel.create({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user.update",
    targetId: target._id,
    targetEmail: target.email,
    changes,
  });
  return Response.json({ ok: true, changed: true });
}
