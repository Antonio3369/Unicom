import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createOrder, listOrders } from "@/services/orders";
import type { Carrier, OrderStatus } from "@/generated/prisma/client";
import { errorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as OrderStatus | null;
  const orders = await listOrders(user, status ?? undefined);
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = await req.json();
  try {
    const order = await createOrder({
      user,
      openerId: body.openerId ?? user.id,
      handleDate: body.handleDate,
      customerSurname: body.customerSurname,
      phone: body.phone,
      planType: String(body.planType),
      rechargeAmount: Number(body.rechargeAmount),
      carrier: body.carrier as Carrier,
      openBackend: body.openBackend,
      linkedVoidOrderId: body.linkedVoidOrderId,
    });
    return NextResponse.json({ order });
  } catch (e) {
    return errorResponse(e, 400, { fallback: "创建失败" });
  }
}
