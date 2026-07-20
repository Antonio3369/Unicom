import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/permissions";
import { buildOrderWhere, getStaffPerformance } from "@/services/scope";
import { CARRIER_LABELS, STATUS_LABELS } from "@/lib/order-rules";
import { formatHandleDate } from "@/lib/date-utils";
import { performanceMonthRange } from "@/lib/performance-month";
import type { OrderStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export async function buildPerformanceExportWorkbook(
  user: SessionUser,
  month: Date,
  options?: { staffId?: string; status?: OrderStatus }
) {
  if (options?.staffId) {
    const detail = await getStaffPerformance(user, options.staffId, month);
    let orders = detail.orders;
    if (options.status) {
      orders = orders.filter((o) => o.status === options.status);
    }
    return workbookFromOrders(orders, detail.staff.name);
  }

  const extra: Prisma.OrderWhereInput = { handleDate: performanceMonthRange(month) };
  if (options?.status) extra.status = options.status;

  const where = await buildOrderWhere(user, extra);
  const orders = await db.order.findMany({
    where,
    include: {
      opener: { select: { name: true } },
      activator: { select: { name: true } },
    },
    orderBy: [{ handleDate: "asc" }, { createdAt: "asc" }],
  });

  return workbookFromOrders(orders, user.name);
}

async function workbookFromOrders(
  orders: Array<{
    handleDate: Date;
    managerId: string;
    customerSurname: string;
    phone: string;
    planType: string;
    rechargeAmount: number;
    status: OrderStatus;
    note: string | null;
    activator: { name: string } | null;
    activatedAt: Date | null;
    activateBackend: string | null;
    wasEverExpired: boolean;
    carrier: keyof typeof CARRIER_LABELS | null;
    openBackend: string | null;
    opener: { name: string };
  }>,
  labelForSheet: string
) {
  const managerIds = [...new Set(orders.map((o) => o.managerId))];
  const managers = await db.user.findMany({
    where: { id: { in: managerIds } },
    select: { id: true, name: true },
  });
  const managerName = new Map(managers.map((m) => [m.id, m.name]));

  const rows = orders.map((o) => ({
    办理日期: formatHandleDate(o.handleDate),
    业务员: o.opener.name,
    客户名称: o.customerSurname,
    办理手机号: o.phone,
    套餐类型: o.planType,
    充值金额: o.rechargeAmount,
    状态: STATUS_LABELS[o.status],
    所属经理: managerName.get(o.managerId) ?? "—",
    备注: o.note ?? "",
    激活人: o.activator?.name ?? "",
    激活日期: o.activatedAt ? formatHandleDate(o.activatedAt) : "",
    激活后台: o.activateBackend ?? "",
    是否曾过期: o.wasEverExpired ? "是" : "否",
    运营商: o.carrier ? CARRIER_LABELS[o.carrier] : "",
    开单后台: o.openBackend ?? "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, labelForSheet.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
