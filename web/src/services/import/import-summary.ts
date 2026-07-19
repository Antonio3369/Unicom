import type { PersonnelImportResult } from "./personnel-importer";
import type { OrdersImportPreview, OrdersImportResult } from "./orders-importer";

export function formatPersonnelSummary(result: PersonnelImportResult): string {
  const parts = [
    `新建经理 ${result.managersCreated} 人`,
    `新建队员 ${result.salesCreated} 人`,
    `更新队员 ${result.salesUpdated} 人`,
  ];
  if (
    result.managersCreated === 0 &&
    result.salesCreated === 0 &&
    result.salesUpdated === 0
  ) {
    return "未发现可导入的人员行（请检查表头是否为「业务员 / 所属经理」）。";
  }
  return `人员导入完成：${parts.join("，")}。`;
}

export function formatOrdersSummary(
  result: OrdersImportResult | OrdersImportPreview
): string {
  const lines = [
    `新建 ${result.createdRows} 条`,
    `更新 ${result.updatedRows} 条`,
    `跳过 ${result.skippedRows} 条（已完成/已退单不覆盖）`,
  ];
  if (result.anomalyRows > 0) {
    lines.push(`异常 ${result.anomalyRows} 条（缺字段、未知业务员或状态无法识别）`);
  }
  if (result.expiredRows > 0) {
    lines.push(`表格内已过期 ${result.expiredRows} 条`);
  }
  if ("lateCompletedRows" in result && result.lateCompletedRows > 0) {
    lines.push(`补录完成 ${result.lateCompletedRows} 条（待激活/已过期 → 已完成）`);
  }
  if ("batchExpireRows" in result && result.batchExpireRows > 0) {
    lines.push(`导入后批处理预计再标过期 ${result.batchExpireRows} 条`);
  }
  return lines.join("\n");
}

export function formatSeedSummary(data: {
  personnel: PersonnelImportResult;
  orders: OrdersImportPreview | OrdersImportResult;
  expired: number;
}): string {
  return [
    formatPersonnelSummary(data.personnel),
    formatOrdersSummary(data.orders),
    data.expired > 0
      ? `批处理已执行：${data.expired} 条待激活改为已过期。`
      : "批处理：无新增过期单。",
  ].join("\n\n");
}

export function formatPreviewTitle(kind: "personnel" | "orders" | "seed"): string {
  if (kind === "personnel") return "人员导入预览（尚未写入）";
  if (kind === "orders") return "业绩导入预览（尚未写入）";
  return "罗湖数据导入预览（尚未写入）";
}
