import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/permissions";
import { PermissionError, assertUserInScope } from "@/lib/permissions";
import { performanceMonthRange } from "@/lib/performance-month";

/** 经理 Web 开单：本人或本队队员 */
export async function getCreateOpenerOptions(user: SessionUser) {
  if (user.role !== "MANAGER") return [];
  const subs = await db.user.findMany({
    where: { managerId: user.id, role: "SALES", status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return [{ id: user.id, name: `${user.name}（本人）` }, ...subs];
}

/** 激活人下拉：ADMIN 全部队员；MANAGER 本人+本队；SALES 由调用方补开单人 */
export async function getActivatorOptions(user: SessionUser) {
  if (user.role === "ADMIN") {
    return db.user.findMany({
      where: { role: "SALES", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }
  if (user.role === "MANAGER") {
    const subs = await db.user.findMany({
      where: { managerId: user.id, role: "SALES", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return [{ id: user.id, name: `${user.name}（本人）` }, ...subs];
  }
  return [];
}

export async function getAccessibleUserIds(user: SessionUser): Promise<string[] | null> {
  if (user.role === "ADMIN") return null;
  if (user.role === "SALES") return [user.id];
  if (user.role === "MANAGER") {
    const subs = await db.user.findMany({
      where: { managerId: user.id, role: "SALES" },
      select: { id: true },
    });
    return [user.id, ...subs.map((s) => s.id)];
  }
  return [user.id];
}

export async function buildOrderWhere(
  user: SessionUser,
  extra?: Prisma.OrderWhereInput
): Promise<Prisma.OrderWhereInput> {
  const ids = await getAccessibleUserIds(user);
  const scope: Prisma.OrderWhereInput =
    ids === null ? {} : { openerId: { in: ids } };
  if (!extra) return scope;
  return { AND: [scope, extra] };
}

export async function getManagerSummaries(monthRef: Date) {
  const range = performanceMonthRange(monthRef);
  const managers = await db.user.findMany({
    where: { role: "MANAGER", status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  const result = [];
  for (const m of managers) {
    const staffIds = (
      await db.user.findMany({
        where: { managerId: m.id, role: "SALES" },
        select: { id: true },
      })
    ).map((s) => s.id);
    const orders = await db.order.findMany({
      where: {
        openerId: { in: staffIds },
        handleDate: range,
      },
    });
    const completed = orders.filter((o) => o.status === "COMPLETED").length;
    const total = orders.length;
    result.push({
      id: m.id,
      name: m.name,
      total,
      pending: orders.filter((o) => o.status === "PENDING").length,
      completed,
      expired: orders.filter((o) => o.status === "EXPIRED").length,
      refunded: orders.filter((o) => o.status === "REFUNDED").length,
      lateCompleted: orders.filter(
        (o) => o.status === "COMPLETED" && o.wasEverExpired
      ).length,
      completeRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }
  result.sort((a, b) => {
    if (b.completed !== a.completed) return b.completed - a.completed;
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name, "zh");
  });
  return result;
}

/** 队员排行榜（按开单人 · 办理日落所选月）；范围随登录角色 */
export async function getStaffRanking(user: SessionUser, monthRef: Date) {
  const ids = await getAccessibleUserIds(user);
  const range = performanceMonthRange(monthRef);
  const staff = await db.user.findMany({
    where: {
      role: "SALES",
      status: "ACTIVE",
      ...(ids === null ? {} : { id: { in: ids } }),
    },
    include: {
      manager: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  const orderWhere: Prisma.OrderWhereInput = {
    handleDate: range,
    ...(ids === null ? {} : { openerId: { in: ids } }),
  };
  const orders = await db.order.findMany({
    where: orderWhere,
    select: { openerId: true, status: true, wasEverExpired: true },
  });

  const byOpener = new Map<
    string,
    { total: number; pending: number; completed: number; expired: number; lateCompleted: number }
  >();

  for (const o of orders) {
    const cur = byOpener.get(o.openerId) ?? {
      total: 0,
      pending: 0,
      completed: 0,
      expired: 0,
      lateCompleted: 0,
    };
    cur.total += 1;
    if (o.status === "PENDING") cur.pending += 1;
    if (o.status === "COMPLETED") {
      cur.completed += 1;
      if (o.wasEverExpired) cur.lateCompleted += 1;
    }
    if (o.status === "EXPIRED") cur.expired += 1;
    byOpener.set(o.openerId, cur);
  }

  const rows = staff.map((s) => {
    const c = byOpener.get(s.id) ?? {
      total: 0,
      pending: 0,
      completed: 0,
      expired: 0,
      lateCompleted: 0,
    };
    const completeRate = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
    return {
      id: s.id,
      name: s.name,
      managerName: s.manager?.name ?? "—",
      ...c,
      completeRate,
    };
  });

  // 有单的优先，按已完成降序，再按总量
  rows.sort((a, b) => {
    if (b.completed !== a.completed) return b.completed - a.completed;
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name, "zh");
  });

  return rows;
}

/** 队员业绩下钻：权限内开单人详情 + 业务单（可选按办理月） */
export async function getStaffPerformance(
  user: SessionUser,
  staffId: string,
  monthRef?: Date
) {
  const ids = await getAccessibleUserIds(user);
  assertUserInScope(user, staffId, ids);

  const staff = await db.user.findUnique({
    where: { id: staffId },
    include: { manager: { select: { id: true, name: true } } },
  });
  if (!staff || staff.role !== "SALES") {
    throw new PermissionError("队员不存在或无权查看");
  }

  const extra: Prisma.OrderWhereInput = { openerId: staffId };
  if (monthRef) extra.handleDate = performanceMonthRange(monthRef);

  const orders = await db.order.findMany({
    where: await buildOrderWhere(user, extra),
    include: {
      opener: { select: { name: true } },
      activator: { select: { name: true } },
    },
    orderBy: [{ handleDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    completed: orders.filter((o) => o.status === "COMPLETED").length,
    expired: orders.filter((o) => o.status === "EXPIRED").length,
    refunded: orders.filter((o) => o.status === "REFUNDED").length,
    lateCompleted: orders.filter((o) => o.status === "COMPLETED" && o.wasEverExpired)
      .length,
  };
  const completeRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const expireRate =
    stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0;

  return {
    staff: {
      id: staff.id,
      name: staff.name,
      managerName: staff.manager?.name ?? "—",
    },
    stats: { ...stats, completeRate, expireRate },
    orders,
  };
}
