"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  formatPerformanceMonthParam,
  parsePerformanceMonth,
  shiftPerformanceMonth,
  clampPerformanceMonth,
} from "@/lib/performance-month";
import { notion } from "@/components/ui/notion";

export function PerformanceMonthPicker({ monthParam }: { monthParam: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const month = parsePerformanceMonth(monthParam);
  const currentMonthParam = formatPerformanceMonthParam(new Date());

  function navigate(next: Date) {
    const q = formatPerformanceMonthParam(clampPerformanceMonth(next));
    router.push(`${pathname}?month=${q}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(shiftPerformanceMonth(month, -1))}
        className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]"
      >
        上月
      </button>
      <input
        type="month"
        value={formatPerformanceMonthParam(month)}
        max={currentMonthParam}
        onChange={(e) => {
          if (e.target.value) navigate(parsePerformanceMonth(e.target.value));
        }}
        className={`${notion.input} w-full sm:w-auto min-w-[9rem]`}
        aria-label="选择月份"
      />
    </div>
  );
}
