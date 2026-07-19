import Link from "next/link";
import {
  PageHeader,
  PageShell,
  notion,
} from "@/components/ui/notion";
import { HistoryBackLink } from "@/components/ui/HistoryBackLink";
import { getSessionUser } from "@/lib/session";
import { listOrders } from "@/services/orders";
import {
  CARRIER_LABELS,
  daysUntilExpire,
  shouldShowPendingExpiredDual,
} from "@/lib/order-rules";
import { formatHandleDate } from "@/lib/date-utils";
import { OrderStatusBadges } from "@/components/orders/OrderStatusBadges";
import {
  formatPerformanceMonthParam,
  parsePerformanceMonth,
  performanceMonthTitle,
} from "@/lib/performance-month";
import type { OrderStatus } from "@/generated/prisma/client";

const TITLE: Record<string, string> = {
  COMPLETED: "已完成列表",
  EXPIRED: "仍过期列表",
  PENDING: "待激活列表",
  REFUNDED: "已退单列表",
};

export default async function PerformanceOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string }>;
}) {
  const user = await getSessionUser();
  const { status, month: monthRaw } = await searchParams;
  const statusFilter = status as OrderStatus | undefined;
  const month = parsePerformanceMonth(monthRaw);
  const monthParam = formatPerformanceMonthParam(month);
  const monthTitle = performanceMonthTitle(month);

  const orders = await listOrders(user!, {
    status: statusFilter,
    month,
  });
  const title = (statusFilter && TITLE[statusFilter]) || "业务列表";

  function listHref(value: string) {
    const q = new URLSearchParams();
    if (value) q.set("status", value);
    q.set("month", monthParam);
    const s = q.toString();
    return `/performance/orders?${s}`;
  }

  return (
    <PageShell>
      <HistoryBackLink
        label="← 业绩复盘"
        fallbackHref={`/performance?month=${monthParam}`}
      />
      <PageHeader
        title={title}
        meta={`${monthTitle} · 办理日口径 · 共 ${orders.length} 条`}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["COMPLETED", "已完成"],
            ["EXPIRED", "已过期"],
            ["PENDING", "待激活"],
            ["", "全部"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value || "all"}
            href={listHref(value)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              (statusFilter ?? "") === value
                ? "bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]"
                : "bg-white border-[#e2e8f0] text-[#64748b]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className={notion.tableWrap}>
        <table className="w-full text-sm min-w-[900px]">
          <thead className={notion.thead}>
            <tr>
              {["办理日", "客户", "手机号", "套餐/充值", "状态", "开单人", "运营商", "操作"].map(
                (h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className={notion.row}>
                <td className="px-4 py-3">{formatHandleDate(o.handleDate)}</td>
                <td className="px-4 py-3">{o.customerSurname}</td>
                <td className="px-4 py-3 font-mono text-sm text-[#111827]">
                  {o.phone}
                </td>
                <td className="px-4 py-3">
                  {o.planType}/{o.rechargeAmount}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadges status={o.status} handleDate={o.handleDate} />
                  {o.status === "PENDING" &&
                    !shouldShowPendingExpiredDual(o.status, o.handleDate) && (
                    <span className="block text-xs text-[#94a3b8] mt-1">
                      剩余 {Math.max(0, daysUntilExpire(o.handleDate))} 天
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{o.opener.name}</td>
                <td className="px-4 py-3">
                  {o.carrier ? CARRIER_LABELS[o.carrier] : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-[#2563eb] hover:underline"
                  >
                    详情
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#94a3b8]">
                  该月暂无业务单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
