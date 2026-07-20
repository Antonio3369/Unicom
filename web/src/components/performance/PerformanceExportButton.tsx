"use client";

import { useState } from "react";
import { NotionButton } from "@/components/ui/notion";

export function PerformanceExportButton({
  monthParam,
  staffId,
  staffName,
  status,
}: {
  monthParam: string;
  staffId?: string;
  staffName?: string;
  status?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function exportExcel() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ month: monthParam });
      if (staffId) q.set("staffId", staffId);
      if (staffName) q.set("staffName", staffName);
      if (status) q.set("status", status);
      const res = await fetch(`/api/performance/export?${q.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "导出失败");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : `业绩复盘_${monthParam}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("网络异常，导出失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <NotionButton
      variant="secondary"
      disabled={loading}
      onClick={exportExcel}
      className="w-full sm:w-auto"
    >
      {loading ? "导出中…" : "导出 Excel"}
    </NotionButton>
  );
}
