import Link from "next/link";
import { PageHeader, PageShell, notion } from "@/components/ui/notion";
import { getSessionUser } from "@/lib/session";
import { listOrders } from "@/services/orders";
import { STATUS_LABELS, statusTone, daysUntilExpire } from "@/lib/order-rules";
import { formatHandleDate } from "@/lib/date-utils";
import { CARRIER_LABELS } from "@/lib/order-rules";
import type { OrderStatus } from "@/generated/prisma/client";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  const { status } = await searchParams;
  const statusFilter = status as OrderStatus | undefined;
  const orders = await listOrders(user!, statusFilter);

  return (
    <PageShell>
      <PageHeader
        title="全部业务"
        meta={`检索与筛选 · 共 ${orders.length} 条 · 日常处理请回「今日待办」`}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ["", "全部"],
          ["PENDING", "待激活"],
          ["COMPLETED", "已完成"],
          ["EXPIRED", "已过期"],
          ["REFUNDED", "已退单"],
        ].map(([value, label]) => (
          <Link
            key={value || "all"}
            href={value ? `/orders?status=${value}` : "/orders"}
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
                <td className="px-4 py-3 font-mono text-sm text-[#111827]">{o.phone}</td>
                <td className="px-4 py-3">
                  {o.planType}/{o.rechargeAmount}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded border text-xs ${statusTone(o.status)}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                  {o.status === "PENDING" && (
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
                  <Link href={`/orders/${o.id}`} className="text-[#2563eb] hover:underline">
                    详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
