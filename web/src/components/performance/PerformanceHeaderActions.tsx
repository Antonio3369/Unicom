"use client";

import { PerformanceExportButton } from "@/components/performance/PerformanceExportButton";
import { PerformanceMonthPicker } from "@/components/performance/PerformanceMonthPicker";

export function PerformanceHeaderActions({ monthParam }: { monthParam: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      <PerformanceMonthPicker monthParam={monthParam} />
      <PerformanceExportButton monthParam={monthParam} />
    </div>
  );
}
