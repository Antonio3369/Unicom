import { db } from "@/lib/db";
import type { Carrier, OrderStatus } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/permissions";
import { PermissionError, assertUserInScope } from "@/lib/permissions";
import { buildOrderWhere, getAccessibleUserIds } from "@/services/scope";
import { EXPIRED_REASON, daysUntilExpire, hasFollowUp, comparePendingOrders } from "@/lib/order-rules";
import { parseDateInput } from "@/lib/date-utils";
import { startOfDay, startOfMonth, endOfMonth } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { performanceMonthRange } from "@/lib/performance-month";
import { saveOrderAttachments } from "@/services/order-attachments";

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
  attachmentFiles?: File[];
}) {
  const order = await getOrderForUser(input.orderId, input.user);
  if (order.status !== "PENDING" && order.status !== "EXPIRED") {
    throw new Error("当前状态不可激活");
  }
  const ids = await getAccessibleUserIds(input.user);
  assertUserInScope(input.user, input.activatorId, ids);

  const backendName = input.activateBackend.trim();
  if (!backendName) throw new Error("请填写激活后台");
  if (!input.attachmentFiles?.length) {
    throw new Error("请上传至少 1 张激活凭证");
  }

  await db.backendDict.upsert({
    where: { name: backendName },
    update: {},
    create: { name: backendName },
  });

  const updated = await db.order.update({
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

  await saveOrderAttachments({
    orderId: order.id,
    user: input.user,
    kind: "ACTIVATION",
    files: input.attachmentFiles,
  });

  return updated;
}

export async function refundOrder(input: {
  orderId: string;
  user: SessionUser;
  refundReason: string;
  refundNote?: string;
  attachmentFiles?: File[];
}) {
  const order = await getOrderForUser(input.orderId, input.user);
  if (order.status !== "PENDING" && order.status !== "EXPIRED") {
    throw new Error("当前状态不可退单");
  }
  if (!input.attachmentFiles?.length) {
    throw new Error("请上传至少 1 张沟通记录");
  }

  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      status: "REFUNDED",
      refundReason: input.refundReason,
      refundNote: input.refundNote,
    },
  });

  await saveOrderAttachments({
    orderId: order.id,
    user: input.user,
    kind: "REFUND",
    files: input.attachmentFiles,
  });

  return updated;
}

export async function updatePendingInfo(input: {
  orderId: string;
  user: SessionUser;
  planActivateAt?: string;
  pendingReason?: string;
}) {
  const order = await getOrderForUser(input.orderId, input.user);
  if (order.status !== "PENDING") throw new Error("仅待激活可更新跟进信息");

  const planActivateAt = input.planActivateAt?.trim()
    ? parseDateInput(input.planActivateAt.trim())
    : null;
  const pendingReason = input.pendingReason?.trim() || null;

  return db.order.update({
    where: { id: order.id },
    data: {
      planActivateAt,
      pendingReason,
      followUpAt: new Date(),
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

  if (input.linkedVoidOrderId) {
    const voidOrder = await getOrderForUser(input.linkedVoidOrderId, input.user);
    if (voidOrder.status !== "EXPIRED") {
      throw new Error("仅已过期单可关联重新办理");
    }
  }

  const opener = await db.user.findUnique({ where: { id: input.openerId } });
  if (!opener || opener.status !== "ACTIVE") {
    throw new Error("开单人无效");
  }
  let managerId: string;
  if (opener.role === "MANAGER") {
    if (input.user.role !== "MANAGER" || opener.id !== input.user.id) {
      throw new PermissionError("无权指定该开单人");
    }
    managerId = opener.id;
  } else if (opener.role === "SALES" && opener.managerId) {
    managerId = opener.managerId;
  } else {
    throw new Error("开单人无效");
  }

  return db.order.create({
    data: {
      handleDate: parseDateInput(input.handleDate),
      openerId: opener.id,
      managerId,
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

export type ListOrdersFilter = {
  status?: OrderStatus;
  followUp?: "none" | "done";
  dueToday?: boolean;
  month?: Date;
};

export async function listOrders(
  user: SessionUser,
  filter?: OrderStatus | ListOrdersFilter
) {
  const options: ListOrdersFilter =
    typeof filter === "string" || filter === undefined ? { status: filter } : filter;

  const extraParts: Prisma.OrderWhereInput[] = [];
  if (options.status) extraParts.push({ status: options.status });
  if (options.month) extraParts.push({ handleDate: performanceMonthRange(options.month) });

  const where = await buildOrderWhere(
    user,
    extraParts.length ? (extraParts.length === 1 ? extraParts[0] : { AND: extraParts }) : undefined
  );
  let orders = await db.order.findMany({
    where,
    include: {
      opener: { select: { name: true } },
      activator: { select: { name: true } },
    },
    orderBy: [{ handleDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  if (options.status === "PENDING") {
    if (options.followUp === "none") {
      orders = orders.filter((o) => !hasFollowUp(o));
    } else if (options.followUp === "done") {
      orders = orders.filter((o) => hasFollowUp(o));
    }
    if (options.dueToday) {
      orders = orders.filter((o) => daysUntilExpire(o.handleDate) <= 0);
    }
    orders.sort((a, b) => comparePendingOrders(a, b));
  }

  return orders;
}

const orderListInclude = {
  opener: { select: { name: true } },
  activator: { select: { name: true } },
} as const;

export async function getDashboardStats(user: SessionUser, monthRef?: Date) {
  const extra: Prisma.OrderWhereInput | undefined = monthRef
    ? { handleDate: performanceMonthRange(monthRef) }
    : undefined;
  const where = await buildOrderWhere(user, extra);
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
    .sort(comparePendingOrders);

  const pendingRest = withDays
    .filter((o) => o.daysLeft > 0)
    .sort(comparePendingOrders);

  const expiredOpen = orders
    .filter((o) => o.status === "EXPIRED")
    .sort((a, b) => b.handleDate.getTime() - a.handleDate.getTime());

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthCompleted = orders
    .filter((o) => {
      if (o.status !== "COMPLETED") return false;
      const ref = startOfDay(o.activatedAt ?? o.handleDate);
      return ref >= monthStart && ref <= monthEnd;
    })
    .sort(
      (a, b) =>
        (b.activatedAt ?? b.handleDate).getTime() -
        (a.activatedAt ?? a.handleDate).getTime()
    );

  return {
    expiringToday,
    pendingRest,
    expiredOpen,
    monthCompleted,
    counts: {
      expiringToday: expiringToday.length,
      pending: pending.length,
      expiredOpen: expiredOpen.length,
      monthCompleted: monthCompleted.length,
      lateCompleted: orders.filter((o) => o.status === "COMPLETED" && o.wasEverExpired)
        .length,
    },
  };
}

export { EXPIRED_REASON };
