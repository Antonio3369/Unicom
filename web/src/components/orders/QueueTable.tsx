import Link from "next/link";
import { formatHandleDate } from "@/lib/date-utils";
import { STATUS_LABELS, statusTone } from "@/lib/order-rules";
import { notion } from "@/components/ui/notion";
import type { OrderStatus } from "@/generated/prisma/client";

export type QueueOrder = {
  id: string;
  handleDate: Date;
  customerSurname: string;
  phone: string;
  planType: string;
  rechargeAmount: number;
  status: OrderStatus;
  opener: { name: string };
  daysLeft?: number;
};

export function QueueTable({
  orders,
  emptyText,
  showDaysLeft = false,
}: {
  orders: QueueOrder[];
  emptyText: string;
  showDaysLeft?: boolean;
}) {
  if (orders.length === 0) {
    return <p className="text-sm text-[#94a3b8] py-4">{emptyText}</p>;
  }

  return (
    <div className={notion.tableWrap}>
      <table className="w-full text-sm min-w-[720px]">
        <thead className={notion.thead}>
          <tr>
            {showDaysLeft && (
              <th className="text-left px-4 py-3 font-medium">剩余</th>
            )}
            {["办理日", "客户", "手机号", "套餐", "开单人", "状态", ""].map((h) => (
              <th key={h || "act"} className="text-left px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className={notion.row}>
              {showDaysLeft && (
                <td className="px-4 py-3">
                  <span
                    className={`font-medium ${
                      (o.daysLeft ?? 1) <= 0
                        ? "text-rose-600"
                        : (o.daysLeft ?? 1) <= 1
                          ? "text-amber-600"
                          : "text-[#64748b]"
                    }`}
                  >
                    {(o.daysLeft ?? 0) <= 0 ? "今日截止" : `${o.daysLeft} 天`}
                  </span>
                </td>
              )}
              <td className="px-4 py-3">{formatHandleDate(o.handleDate)}</td>
              <td className="px-4 py-3">{o.customerSurname}</td>
              <td className="px-4 py-3 font-mono text-sm text-[#111827]">{o.phone}</td>
              <td className="px-4 py-3">
                {o.planType}/{o.rechargeAmount}
              </td>
              <td className="px-4 py-3">{o.opener.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded border text-xs ${statusTone(o.status)}`}
                >
                  {STATUS_LABELS[o.status]}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link href={`/orders/${o.id}`} className="text-[#2563eb] hover:underline">
                  {o.status === "EXPIRED" ? "补录" : "处理"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
