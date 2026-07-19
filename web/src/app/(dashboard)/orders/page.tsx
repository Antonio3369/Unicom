import Link from "next/link";
import { PageHeader, PageShell, notion } from "@/components/ui/notion";
import { getSessionUser } from "@/lib/session";
import { listOrders } from "@/services/orders";
import { daysUntilExpire, shouldShowPendingExpiredDual } from "@/lib/order-rules";
import { formatHandleDate } from "@/lib/date-utils";
import { CARRIER_LABELS } from "@/lib/order-rules";
import { FollowUpBadge } from "@/components/orders/FollowUpBadge";
import { OrderStatusBadges } from "@/components/orders/OrderStatusBadges";
import type { OrderStatus } from "@/generated/prisma/client";

function ordersHref(params: {
  status?: string;
  followUp?: string;
  due?: string;
}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.followUp) q.set("followUp", params.followUp);
  if (params.due) q.set("due", params.due);
  const s = q.toString();
  return s ? `/orders?${s}` : "/orders";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; followUp?: string; due?: string }>;
}) {
  const user = await getSessionUser();
  const { status, followUp, due } = await searchParams;
  const statusFilter = status as OrderStatus | undefined;
  const orders = await listOrders(user!, {
    status: statusFilter,
    followUp: followUp === "none" ? "none" : followUp === "done" ? "done" : undefined,
    dueToday: due === "today",
  });

  const filterHint =
    statusFilter === "PENDING"
      ? [
          followUp === "none" ? "未跟进" : followUp === "done" ? "已跟进" : null,
          due === "today" ? "今日截止" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "未跟进优先 · 剩余天数升序"
      : null;

  return (
    <PageShell>
      <PageHeader
        title="全部业务"
        meta={`检索与筛选 · 共 ${orders.length} 条${filterHint ? ` · ${filterHint}` : ""} · 日常处理请回「今日待办」`}
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

      {statusFilter === "PENDING" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { followUp: "", due: "", label: "全部待激活" },
            { followUp: "none", due: "", label: "未跟进" },
            { followUp: "done", due: "", label: "已跟进" },
            { followUp: "none", due: "today", label: "未跟进 · 今日截止" },
            { followUp: "", due: "today", label: "今日截止" },
          ].map(({ followUp: fu, due: d, label }) => {
            const active =
              (followUp ?? "") === (fu ?? "") && (due ?? "") === (d ?? "");
            return (
              <Link
                key={label}
                href={ordersHref({ status: "PENDING", followUp: fu || undefined, due: d || undefined })}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  active
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-white border-[#e2e8f0] text-[#64748b]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <div className={notion.tableWrap}>
        <table className="w-full text-sm min-w-[900px]">
          <thead className={notion.thead}>
            <tr>
              {["办理日", "客户", "手机号", "套餐/充值", "状态", "跟进", "开单人", "运营商", "操作"].map(
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
                  <OrderStatusBadges status={o.status} handleDate={o.handleDate} />
                  {o.status === "PENDING" && !shouldShowPendingExpiredDual(o.status, o.handleDate) && (
                    <span className="block text-xs text-[#94a3b8] mt-1">
                      剩余 {Math.max(0, daysUntilExpire(o.handleDate))} 天
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {o.status === "PENDING" ? (
                    <FollowUpBadge order={o} compact />
                  ) : (
                    <span className="text-xs text-[#94a3b8]">—</span>
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
