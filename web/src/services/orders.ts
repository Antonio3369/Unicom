import { db } from "@/lib/db";
import type { Carrier, OrderStatus } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/permissions";
import { PermissionError, assertUserInScope } from "@/lib/permissions";
import { buildOrderWhere, getAccessibleUserIds } from "@/services/scope";
import { EXPIRED_REASON, daysUntilExpire } from "@/lib/order-rules";
import { parseDateInput } from "@/lib/date-utils";
import { startOfDay } from "date-fns";

export async function getOrderForUser(orderId: string, user: SessionUser) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      opener: { select: { id: true, name: true, managerId: true } },
      activator: { select: { id: true, name: true } },
    },
  });
  if (!order) throw new Error("业务单不存在");
  const ids = await getAccessibleUserIds(user);
  assertUserInScope(user, order.openerId, ids);
  return order;
}

export async function activateOrder(input: {
  orderId: string;
  user: SessionUser;
  activatorId: string;
  activateBackend: string;
  activatedAt: string;
  lateEntryNote?: string;
}) {
  const order = await getOrderForUser(input.orderId, input.user);
  if (order.status !== "PENDING" && order.status !== "EXPIRED") {
    throw new Error("当前状态不可激活");
  }
  const ids = await getAccessibleUserIds(input.user);
  assertUserInScope(input.user, input.activatorId, ids);

  const backendName = input.activateBackend.trim();
  if (!backendName) throw new Error("请填写激活后台");

  // 新后台名写入字典，供下次下拉
  await db.backendDict.upsert({
    where: { name: backendName },
    update: {},
    create: { name: backendName },
  });

  return db.order.update({
    where: { id: order.id },
    data: {
      status: "COMPLETED",
      activatorId: input.activatorId,
      activateBackend: backendName,
      activatedAt: parseDateInput(input.activatedAt),
      lateEntryNote: order.status === "EXPIRED" ? input.lateEntryNote : undefined,
      wasEverExpired: order.status === "EXPIRED" ? true : order.wasEverExpired,
    },
  });
}

export async function refundOrder(input: {
  orderId: string;
  user: SessionUser;
  refundReason: string;
  refundNote?: string;
}) {
  const order = await getOrderForUser(input.orderId, input.user);
  if (order.status !== "PENDING" && order.status !== "EXPIRED") {
    throw new Error("当前状态不可退单");
  }
  return db.order.update({
    where: { id: order.id },
    data: {
      status: "REFUNDED",
      refundReason: input.refundReason,
      refundNote: input.refundNote,
    },
  });
}

export async function updatePendingInfo(input: {
  orderId: string;
  user: SessionUser;
  planActivateAt?: string;
  pendingReason?: string;
}) {
  const order = await getOrderForUser(input.orderId, input.user);
  if (order.status !== "PENDING") throw new Error("仅待激活可更新跟进信息");
  return db.order.update({
    where: { id: order.id },
    data: {
      planActivateAt: input.planActivateAt ? parseDateInput(input.planActivateAt) : undefined,
      pendingReason: input.pendingReason,
    },
  });
}

export async function createOrder(input: {
  user: SessionUser;
  openerId: string;
  handleDate: string;
  customerSurname: string;
  phone: string;
  planType: string;
  rechargeAmount: number;
  carrier: Carrier;
  openBackend?: string;
  linkedVoidOrderId?: string;
}) {
  const ids = await getAccessibleUserIds(input.user);
  if (input.user.role === "SALES" && input.openerId !== input.user.id) {
    throw new PermissionError("队员只能为自己开单");
  }
  assertUserInScope(input.user, input.openerId, ids);

  const opener = await db.user.findUnique({ where: { id: input.openerId } });
  if (!opener?.managerId) throw new Error("开单人无效");

  return db.order.create({
    data: {
      handleDate: parseDateInput(input.handleDate),
      openerId: opener.id,
      managerId: opener.managerId,
      customerSurname: input.customerSurname.slice(0, 1),
      phone: input.phone,
      planType: input.planType,
      rechargeAmount: input.rechargeAmount,
      carrier: input.carrier,
      openBackend: input.openBackend,
      linkedVoidOrderId: input.linkedVoidOrderId,
      status: "PENDING",
    },
  });
}

export async function listOrders(user: SessionUser, status?: OrderStatus) {
  const where = await buildOrderWhere(
    user,
    status ? { status } : undefined
  );
  return db.order.findMany({
    where,
    include: {
      opener: { select: { name: true } },
      activator: { select: { name: true } },
    },
    orderBy: [{ handleDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
}

const orderListInclude = {
  opener: { select: { name: true } },
  activator: { select: { name: true } },
} as const;

export async function getDashboardStats(user: SessionUser) {
  const where = await buildOrderWhere(user);
  const orders = await db.order.findMany({ where });
  const pending = orders.filter((o) => o.status === "PENDING");
  const expiringSoon = pending.filter((o) => daysUntilExpire(o.handleDate) <= 0);

  return {
    total: orders.length,
    pending: pending.length,
    completed: orders.filter((o) => o.status === "COMPLETED").length,
    expired: orders.filter((o) => o.status === "EXPIRED").length,
    refunded: orders.filter((o) => o.status === "REFUNDED").length,
    lateCompleted: orders.filter((o) => o.status === "COMPLETED" && o.wasEverExpired).length,
    expiringSoon: expiringSoon.length,
  };
}

/** 运营工作台首页队列：先风险，再待办，再补录 */
export async function getWorkQueues(user: SessionUser) {
  const where = await buildOrderWhere(user);
  const orders = await db.order.findMany({
    where,
    include: orderListInclude,
    orderBy: [{ handleDate: "asc" }, { createdAt: "asc" }],
  });

  const today = startOfDay(new Date());
  const pending = orders.filter((o) => o.status === "PENDING");
  const withDays = pending.map((o) => ({
    ...o,
    daysLeft: daysUntilExpire(o.handleDate),
  }));

  const expiringToday = withDays
    .filter((o) => o.daysLeft <= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const pendingRest = withDays
    .filter((o) => o.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const expiredOpen = orders
    .filter((o) => o.status === "EXPIRED")
    .sort((a, b) => b.handleDate.getTime() - a.handleDate.getTime());

  const todayOpened = orders.filter(
    (o) => startOfDay(o.handleDate).getTime() === today.getTime()
  );

  return {
    expiringToday,
    pendingRest,
    expiredOpen,
    todayOpened,
    counts: {
      expiringToday: expiringToday.length,
      pending: pending.length,
      expiredOpen: expiredOpen.length,
      todayOpened: todayOpened.length,
      lateCompleted: orders.filter((o) => o.status === "COMPLETED" && o.wasEverExpired)
        .length,
    },
  };
}

export { EXPIRED_REASON };
