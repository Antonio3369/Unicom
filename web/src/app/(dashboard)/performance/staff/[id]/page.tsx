import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PageHeader,
  PageShell,
  StatCard,
  NotionPanel,
  notion,
} from "@/components/ui/notion";
import { HistoryBackLink } from "@/components/ui/HistoryBackLink";
import { getSessionUser } from "@/lib/session";
import { PermissionError } from "@/lib/permissions";
import { getStaffPerformance } from "@/services/scope";
import {
  STATUS_LABELS,
  CARRIER_LABELS,
  statusTone,
  daysUntilExpire,
} from "@/lib/order-rules";
import { formatHandleDate } from "@/lib/date-utils";
import type { OrderStatus } from "@/generated/prisma/client";

export default async function StaffPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;
  const { status } = await searchParams;
  const statusFilter = status as OrderStatus | undefined;

  let detail;
  try {
    detail = await getStaffPerformance(user!, id);
  } catch (e) {
    if (e instanceof PermissionError) notFound();
    throw e;
  }

  const { staff, stats, orders } = detail;
  const filtered = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  return (
    <PageShell>
      <HistoryBackLink label="← 业绩复盘" fallbackHref="/performance" />
      <PageHeader
        title={staff.name}
        meta={`开单人明细 · 所属经理 ${staff.managerName} · 共 ${stats.total} 单`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="总办理" value={stats.total} />
        <StatCard label="已完成" value={stats.completed} tone="success" />
        <StatCard label="完成率" value={`${stats.completeRate}%`} tone="success" />
        <StatCard label="待激活" value={stats.pending} tone="warn" />
        <StatCard label="已过期" value={stats.expired} tone="danger" />
        <StatCard label="过期后补录" value={stats.lateCompleted} />
      </div>

      <NotionPanel padding={false}>
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">业务明细</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["", "全部"],
                ["PENDING", "待激活"],
                ["COMPLETED", "已完成"],
                ["EXPIRED", "已过期"],
                ["REFUNDED", "已退单"],
              ] as const
            ).map(([value, label]) => (
              <Link
                key={value || "all"}
                href={
                  value
                    ? `/performance/staff/${staff.id}?status=${value}`
                    : `/performance/staff/${staff.id}`
                }
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  (statusFilter ?? "") === value
                    ? "bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]"
                    : "bg-white border-[#e2e8f0] text-[#64748b]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className={notion.tableWrap + " border-0 rounded-none shadow-none"}>
          <table className="w-full text-sm min-w-[800px]">
            <thead className={notion.thead}>
              <tr>
                {["办理日", "客户", "手机号", "套餐/充值", "状态", "运营商", "操作"].map(
                  (h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className={notion.row}>
                  <td className="px-4 py-3">{formatHandleDate(o.handleDate)}</td>
                  <td className="px-4 py-3">{o.customerSurname}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#111827]">
                    {o.phone}
                  </td>
                  <td className="px-4 py-3">
                    {o.planType}/{o.rechargeAmount}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded border text-xs ${statusTone(o.status)}`}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                    {o.status === "PENDING" && (
                      <span className="block text-xs text-[#94a3b8] mt-1">
                        剩余 {Math.max(0, daysUntilExpire(o.handleDate))} 天
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {o.carrier ? CARRIER_LABELS[o.carrier] : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-[#2563eb] hover:underline"
                    >
                      详情
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#94a3b8]">
                    暂无业务单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </NotionPanel>
    </PageShell>
  );
}
