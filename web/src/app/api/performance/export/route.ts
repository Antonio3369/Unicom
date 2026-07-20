import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildPerformanceExportWorkbook } from "@/services/order-export";
import { parsePerformanceMonth, formatPerformanceMonthParam } from "@/lib/performance-month";
import { errorResponse } from "@/lib/api-error";
import type { OrderStatus } from "@/generated/prisma/client";
import { PermissionError } from "@/lib/permissions";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = parsePerformanceMonth(searchParams.get("month"));
  const monthParam = formatPerformanceMonthParam(month);
  const staffId = searchParams.get("staffId") ?? undefined;
  const statusRaw = searchParams.get("status");
  const status = statusRaw ? (statusRaw as OrderStatus) : undefined;

  try {
    const buffer = await buildPerformanceExportWorkbook(user, month, { staffId, status });
    const namePart = staffId
      ? searchParams.get("staffName") ?? "队员"
      : user.name;
    const statusPart = status ? `_${status}` : "";
    const filename = staffId
      ? `业绩复盘_${monthParam}_${namePart}${statusPart}.xlsx`
      : `业绩复盘_${monthParam}_${namePart}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json({ error: "无权导出该数据" }, { status: 403 });
    }
    return errorResponse(e, 500, { fallback: "导出失败" });
  }
}
