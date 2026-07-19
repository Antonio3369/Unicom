import {
  STATUS_LABELS,
  statusTone,
  shouldShowPendingExpiredDual,
} from "@/lib/order-rules";
import type { OrderStatus } from "@/generated/prisma/client";

function Badge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded border text-xs ${statusTone(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** 待激活且已超窗口 / 系统已标过期：双标签，便于经理一眼看出「未激活→已过期」 */
export function OrderStatusBadges({
  status,
  handleDate,
  className = "",
}: {
  status: OrderStatus;
  handleDate: Date;
  className?: string;
}) {
  if (!shouldShowPendingExpiredDual(status, handleDate)) {
    return (
      <span className={className}>
        <Badge status={status} />
      </span>
    );
  }

  const hint =
    status === "EXPIRED"
      ? "未曾激活，系统已标过期（可查跟进记录判断是否漏登记）"
      : "未曾激活，已过办理窗口（待批处理或需补录）";

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1 ${className}`}
      title={hint}
    >
      <Badge status="PENDING" />
      <Badge status="EXPIRED" />
    </span>
  );
}

export function orderStatusSummary(status: OrderStatus, handleDate: Date): string {
  if (shouldShowPendingExpiredDual(status, handleDate)) {
    return "待激活 · 已过期";
  }
  return STATUS_LABELS[status];
}
