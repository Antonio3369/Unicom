import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getOrderForUser, updatePendingInfo } from "@/services/orders";
import { updateOrderFields } from "@/services/order-edits";
import type { Carrier } from "@/generated/prisma/client";
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
    if (body.action === "edit") {
      const order = await updateOrderFields({
        orderId: id,
        user,
        handleDate: body.handleDate,
        customerSurname: body.customerSurname,
        phone: body.phone,
        planType: body.planType,
        rechargeAmount:
          body.rechargeAmount !== undefined ? Number(body.rechargeAmount) : undefined,
        carrier: body.carrier as Carrier | undefined,
        openBackend: body.openBackend,
        note: body.note,
        activatorId: body.activatorId,
        activateBackend: body.activateBackend,
        activatedAt: body.activatedAt,
        editNote: body.editNote,
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
