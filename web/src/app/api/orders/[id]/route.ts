import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { activateOrder, getOrderForUser, refundOrder, updatePendingInfo } from "@/services/orders";
import { errorResponse, toUserError } from "@/lib/api-error";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const order = await getOrderForUser(id, user);
    return NextResponse.json({ order });
  } catch (e) {
    return NextResponse.json(
      { error: toUserError(e, { fallback: "业务单不存在或无权查看" }) },
      { status: 404 }
    );
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  try {
    if (body.action === "activate") {
      if (!String(body.activateBackend ?? "").trim()) {
        return NextResponse.json({ error: "请填写激活后台" }, { status: 400 });
      }
      const order = await activateOrder({
        orderId: id,
        user,
        activatorId: body.activatorId,
        activateBackend: String(body.activateBackend),
        activatedAt: body.activatedAt,
        lateEntryNote: body.lateEntryNote,
      });
      return NextResponse.json({ order });
    }
    if (body.action === "refund") {
      const order = await refundOrder({
        orderId: id,
        user,
        refundReason: body.refundReason,
        refundNote: body.refundNote,
      });
      return NextResponse.json({ order });
    }
    if (body.action === "pending") {
      const order = await updatePendingInfo({
        orderId: id,
        user,
        planActivateAt: body.planActivateAt,
        pendingReason: body.pendingReason,
      });
      return NextResponse.json({ order });
    }
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (e) {
    return errorResponse(e, 400, { fallback: "操作失败" });
  }
}
