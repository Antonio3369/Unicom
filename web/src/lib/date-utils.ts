import { startOfDay } from "date-fns";

/** Excel 只有「月.日」时，默认落到当前年（跨年可再改） */
function yearForMonthDay(month: number): number {
  const now = new Date();
  const year = now.getFullYear();
  // 例如现在是 1 月、Excel 写 12.x → 视为去年
  if (month - 1 > now.getMonth() + 2) return year - 1;
  return year;
}

function dateFromMonthDay(month: number, day: number): Date {
  return startOfDay(new Date(yearForMonthDay(month), month - 1, day));
}

export function parseHandleDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return startOfDay(value);
  if (typeof value === "number") {
    const s = value.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
    const [m, d] = s.split(".").map(Number);
    if (m && d) return dateFromMonthDay(m, d);
  }
  const s = String(value).trim();
  if (!s || s.startsWith("(")) return null;
  const parts = s.split(".");
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const d = Number(parts[1]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return dateFromMonthDay(m, d);
    }
  }
  return null;
}

export function formatHandleDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateInput(value: string): Date {
  return startOfDay(new Date(`${value}T00:00:00`));
}

export function formatFollowUpAt(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${m}/${d} ${hh}:${mm}`;
}
