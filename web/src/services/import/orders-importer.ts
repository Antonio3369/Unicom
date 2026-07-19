import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/generated/prisma/client";
import { parseHandleDate } from "@/lib/date-utils";
import { EXPIRED_REASON, resolveImportStatus } from "@/lib/order-rules";
import {
  buildImportKey,
  normalizePhone,
  normalizeSurname,
  parseRemark,
} from "@/services/import/helpers";

export interface OrdersImportResult {
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  anomalyRows: number;
  expiredRows: number;
}

export async function importOrdersFile(
  filePath: string,
  refDate = new Date()
): Promise<OrdersImportResult> {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const salesByName = new Map(
    (await db.user.findMany({ where: { role: "SALES" }, include: { manager: true } })).map(
      (u) => [u.name, u]
    )
  );

  let createdRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  let anomalyRows = 0;
  let expiredRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const openerName = String(row["业务员"] ?? "").trim();
    const rawStatus = String(row["状态"] ?? "").trim();
    const handleDate = parseHandleDate(row["办理日期"]);
    const phone = normalizePhone(row["办理手机号"]);
    const planType = String(row["套餐类型"] ?? "").trim();
    const rechargeRaw = row["充值金额"];
    const rechargeAmount =
      rechargeRaw === "" || rechargeRaw == null ? NaN : Number(rechargeRaw);

    if (!openerName || openerName === "业务员") continue;

    if (!handleDate || !phone || !planType || Number.isNaN(rechargeAmount)) {
      anomalyRows++;
      await db.anomalyRecord.create({
        data: {
          importType: "orders",
          rowNumber: i + 2,
          rawData: JSON.stringify(row),
          reason: "缺少办理日、手机号、套餐或充值金额",
          type: "MISSING_FIELDS",
        },
      });
      continue;
    }

    const opener = salesByName.get(openerName);
    if (!opener || !opener.managerId) {
      anomalyRows++;
      await db.anomalyRecord.create({
        data: {
          importType: "orders",
          rowNumber: i + 2,
          rawData: JSON.stringify(row),
          reason: `未知业务员：${openerName}`,
          type: "UNKNOWN_OPENER",
        },
      });
      continue;
    }

    const resolved = resolveImportStatus(rawStatus, handleDate, refDate);
    if (resolved === "ANOMALY") {
      anomalyRows++;
      await db.anomalyRecord.create({
        data: {
          importType: "orders",
          rowNumber: i + 2,
          rawData: JSON.stringify(row),
          reason: `无法识别状态：${rawStatus}`,
          type: "INVALID_STATUS",
        },
      });
      continue;
    }

    const remark = parseRemark(row["备注"]);
    const importKey = buildImportKey(phone, handleDate, opener.id);
    const existing = await db.order.findUnique({ where: { importKey } });

    if (resolved === "EXPIRED") expiredRows++;

    if (!existing) {
      const status = resolved;
      await db.order.create({
        data: {
          handleDate,
          openerId: opener.id,
          managerId: opener.managerId,
          customerSurname: normalizeSurname(row["客户名称"]),
          phone,
          planType,
          rechargeAmount,
          carrier: remark.carrier ?? undefined,
          openBackend: remark.backend ?? undefined,
          note: remark.rest ?? undefined,
          importKey,
          status,
          activatorId: status === "COMPLETED" ? opener.id : undefined,
          activatedAt: status === "COMPLETED" ? handleDate : undefined,
          activateBackend: status === "COMPLETED" ? remark.backend ?? undefined : undefined,
          wasEverExpired: status === "EXPIRED",
          expiredAt: status === "EXPIRED" ? refDate : undefined,
          expiredReason: status === "EXPIRED" ? EXPIRED_REASON : undefined,
        },
      });
      createdRows++;
      continue;
    }

    const e = existing;

    // 终态已完成 / 已退单：Excel 不再覆盖（避免冲掉 Web 补录细节）
    if (e.status === "COMPLETED" || e.status === "REFUNDED") {
      skippedRows++;
      continue;
    }

    // 运营在表格把待激活/已过期改为已完成 → 允许升为完成（工具滞后补录）
    const excelCompleteFromOpen =
      resolved === "COMPLETED" &&
      (e.status === "PENDING" || e.status === "EXPIRED");

    // 已过期后 Excel 仍写待激活：保持过期，只更新备注类字段
    if (e.status === "EXPIRED" && !excelCompleteFromOpen) {
      await db.order.update({
        where: { id: existing.id },
        data: {
          planType,
          rechargeAmount,
          carrier: e.carrier ?? remark.carrier ?? undefined,
          openBackend: remark.backend ?? e.openBackend ?? undefined,
          note: remark.rest ?? e.note ?? undefined,
        },
      });
      updatedRows++;
      continue;
    }

    const nextStatus: OrderStatus = excelCompleteFromOpen
      ? "COMPLETED"
      : e.status === "PENDING"
        ? resolved
        : e.status;

    const fromExpired = e.status === "EXPIRED" || e.wasEverExpired;

    await db.order.update({
      where: { id: existing.id },
      data: {
        planType,
        rechargeAmount,
        carrier: e.carrier ?? remark.carrier ?? undefined,
        openBackend: remark.backend ?? undefined,
        note: remark.rest ?? undefined,
        status: nextStatus,
        wasEverExpired: fromExpired || nextStatus === "EXPIRED",
        expiredAt:
          nextStatus === "EXPIRED" && !e.expiredAt ? refDate : undefined,
        expiredReason:
          nextStatus === "EXPIRED" && !e.expiredAt ? EXPIRED_REASON : undefined,
        activatorId:
          nextStatus === "COMPLETED" && !e.activatorId ? opener.id : undefined,
        activatedAt:
          nextStatus === "COMPLETED" && !e.activatedAt ? handleDate : undefined,
        activateBackend:
          nextStatus === "COMPLETED" && !e.activateBackend
            ? remark.backend ?? undefined
            : undefined,
        lateEntryNote:
          excelCompleteFromOpen && fromExpired
            ? e.lateEntryNote || "Excel 导入补录完成（原已过期）"
            : undefined,
      },
    });
    updatedRows++;
  }

  await db.importLog.create({
    data: {
      fileName: filePath.split("/").pop() ?? filePath,
      importType: "orders",
      status: anomalyRows > 0 ? "PARTIAL" : "SUCCESS",
      totalRows: rows.length,
      createdRows,
      updatedRows,
      skippedRows,
      anomalyRows,
      message: `过期 ${expiredRows} 条`,
    },
  });

  return { createdRows, updatedRows, skippedRows, anomalyRows, expiredRows };
}

export async function runExpirationBatch(refDate = new Date()): Promise<number> {
  const pending = await db.order.findMany({ where: { status: "PENDING" } });
  let count = 0;
  for (const order of pending) {
    const shouldExpire = resolveImportStatus("待激活", order.handleDate, refDate) === "EXPIRED";
    if (!shouldExpire) continue;
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "EXPIRED",
        wasEverExpired: true,
        expiredAt: refDate,
        expiredReason: EXPIRED_REASON,
      },
    });
    count++;
  }
  return count;
}
