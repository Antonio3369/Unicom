import { addDays, startOfDay } from "date-fns";
import type { OrderStatus } from "@/generated/prisma/client";

export const EXPIRED_REASON =
  "超过办理日 2 个自然日未激活，系统自动作废";

/** Rule A: expired when batch date > handleDate + 2 calendar days */
export function isExpiredByRule(handleDate: Date, refDate: Date = new Date()): boolean {
  const handle = startOfDay(handleDate);
  const ref = startOfDay(refDate);
  return ref > addDays(handle, 2);
}

export function daysUntilExpire(handleDate: Date, refDate: Date = new Date()): number {
  const handle = startOfDay(handleDate);
  const ref = startOfDay(refDate);
  const lastDay = addDays(handle, 2);
  const diff = Math.ceil((lastDay.getTime() - ref.getTime()) / (24 * 3600 * 1000));
  return diff;
}

/** 列表/详情双标签：未曾激活且已超办理窗口（含系统 EXPIRED） */
export function shouldShowPendingExpiredDual(
  status: OrderStatus,
  handleDate: Date,
  refDate: Date = new Date()
): boolean {
  if (status === "EXPIRED") return true;
  if (status === "PENDING" && daysUntilExpire(handleDate, refDate) <= 0) return true;
  return false;
}

export function resolveImportStatus(
  rawStatus: string,
  handleDate: Date,
  refDate: Date = new Date()
): OrderStatus | "ANOMALY" {
  const normalized = rawStatus.trim();
  if (normalized === "待激活") {
    return isExpiredByRule(handleDate, refDate) ? "EXPIRED" : "PENDING";
  }
  if (normalized === "已完成" || normalized === "已激活") return "COMPLETED";
  if (normalized === "已退单") return "REFUNDED";
  if (normalized === "已过期") return "EXPIRED";
  return "ANOMALY";
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "待激活",
  COMPLETED: "已完成",
  REFUNDED: "已退单",
  EXPIRED: "已过期",
};

export const CARRIER_LABELS = {
  UNICOM: "联通",
  MOBILE: "移动",
  OTHER: "其他",
} as const;

export function statusTone(status: OrderStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "REFUNDED":
      return "bg-slate-50 text-slate-700 border-slate-200";
    case "EXPIRED":
      return "bg-rose-50 text-rose-800 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export type FollowUpFields = {
  followUpAt?: Date | null;
  pendingReason?: string | null;
  planActivateAt?: Date | null;
};

export function hasFollowUp(order: FollowUpFields): boolean {
  return !!(
    order.followUpAt ||
    order.pendingReason?.trim() ||
    order.planActivateAt
  );
}

type PendingSortable = FollowUpFields & { handleDate: Date; daysLeft?: number };

/** 待激活队列：未跟进优先，再按剩余天数、办理日 */
export function comparePendingOrders(a: PendingSortable, b: PendingSortable): number {
  const aFollowed = hasFollowUp(a) ? 1 : 0;
  const bFollowed = hasFollowUp(b) ? 1 : 0;
  if (aFollowed !== bFollowed) return aFollowed - bFollowed;

  const daysA = a.daysLeft ?? daysUntilExpire(a.handleDate);
  const daysB = b.daysLeft ?? daysUntilExpire(b.handleDate);
  if (daysA !== daysB) return daysA - daysB;

  return a.handleDate.getTime() - b.handleDate.getTime();
}
