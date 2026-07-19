import { formatFollowUpAt } from "@/lib/date-utils";
import { hasFollowUp, type FollowUpFields } from "@/lib/order-rules";

export function FollowUpBadge({
  order,
  compact = false,
}: {
  order: FollowUpFields;
  compact?: boolean;
}) {
  if (!hasFollowUp(order)) {
    return <span className="text-xs text-[#94a3b8]">未跟进</span>;
  }

  const title = [
    order.followUpAt ? `更新于 ${formatFollowUpAt(order.followUpAt)}` : null,
    order.planActivateAt ? `计划 ${order.planActivateAt.getMonth() + 1}/${order.planActivateAt.getDate()}` : null,
    order.pendingReason?.trim() ? order.pendingReason.trim() : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="inline-flex flex-col gap-0.5" title={title || undefined}>
      <span className="inline-flex px-2 py-0.5 rounded border text-xs bg-emerald-50 border-emerald-200 text-emerald-700 w-fit">
        已跟进
      </span>
      {!compact && order.followUpAt && (
        <span className="text-xs text-[#94a3b8]">{formatFollowUpAt(order.followUpAt)}</span>
      )}
    </span>
  );
}
