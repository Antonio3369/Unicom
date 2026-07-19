import { addMonths, endOfMonth, isSameMonth, startOfMonth, subMonths } from "date-fns";

/** 解析 URL `?month=2026-07`，无效或未来月则默认/回落到当月 */
export function parsePerformanceMonth(raw?: string | null): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    if (y >= 2000 && m >= 1 && m <= 12) {
      return clampPerformanceMonth(new Date(y, m - 1, 1));
    }
  }
  return startOfMonth(new Date());
}

export function formatPerformanceMonthParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatPerformanceMonthLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

/** 排行榜标题：当月显示「本月」，历史月显示「2026年6月」 */
export function performanceMonthTitle(date: Date): string {
  return isSameMonth(date, new Date())
    ? "本月"
    : formatPerformanceMonthLabel(date);
}

export function performanceMonthRange(date: Date) {
  return { gte: startOfMonth(date), lte: endOfMonth(date) };
}

export function shiftPerformanceMonth(date: Date, delta: -1 | 1): Date {
  return delta === -1 ? startOfMonth(subMonths(date, 1)) : startOfMonth(addMonths(date, 1));
}

/** 业绩复盘不可查看未来月 */
export function clampPerformanceMonth(date: Date): Date {
  const month = startOfMonth(date);
  const now = startOfMonth(new Date());
  return month > now ? now : month;
}
