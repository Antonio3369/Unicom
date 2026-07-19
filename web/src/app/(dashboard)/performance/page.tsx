import Link from "next/link";
import {
  PageHeader,
  PageShell,
  StatCard,
  NotionPanel,
  NotionLinkButton,
  notion,
} from "@/components/ui/notion";
import { getSessionUser } from "@/lib/session";
import { getDashboardStats } from "@/services/orders";
import { getManagerSummaries, getStaffRanking } from "@/services/scope";
import { PerformanceMonthPicker } from "@/components/performance/PerformanceMonthPicker";
import {
  formatPerformanceMonthParam,
  parsePerformanceMonth,
  performanceMonthTitle,
} from "@/lib/performance-month";

const managerHeaders = [
  "排名",
  "经理",
  "总办理",
  "已完成",
  "待激活",
  "已过期",
  "完成率",
  "过期补录",
];

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getSessionUser();
  const { month: monthRaw } = await searchParams;
  const month = parsePerformanceMonth(monthRaw);
  const monthParam = formatPerformanceMonthParam(month);
  const monthTitle = performanceMonthTitle(month);

  const stats = await getDashboardStats(user!, month);
  const managers = user!.role === "ADMIN" ? await getManagerSummaries(month) : [];
  const staffRank = await getStaffRanking(user!, month);
  const completeRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const expireRate =
    stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0;

  const rankHint = "按办理日 · 已完成优先";
  const showManagerCol = user!.role === "ADMIN";
  const staffHeaders = showManagerCol
    ? ["排名", "队员", "所属经理", "总办理", "已完成", "待激活", "已过期", "完成率", "过期补录"]
    : ["排名", "队员", "总办理", "已完成", "待激活", "已过期", "完成率", "过期补录"];

  const ordersMonthQ = `month=${monthParam}`;

  return (
    <PageShell>
      <PageHeader
        title="业绩复盘"
        actions={<PerformanceMonthPicker monthParam={monthParam} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="总办理" value={stats.total} />
        <StatCard label="已完成" value={stats.completed} tone="success" />
        <StatCard label="完成率" value={`${completeRate}%`} tone="success" />
        <StatCard label="待激活" value={stats.pending} tone="warn" />
        <StatCard label="已过期" value={stats.expired} tone="danger" />
        <StatCard label="过期率" value={`${expireRate}%`} tone="danger" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <NotionPanel className={user!.role === "ADMIN" ? "md:col-span-2" : ""}>
          <h2 className="font-semibold mb-3">补录质量</h2>
          <p className="text-sm text-[#64748b]">
            {monthTitle}过期后补录完成：
            <span className="font-semibold text-[#111827] ml-1">
              {stats.lateCompleted}
            </span>
            单
          </p>
          <p className="text-xs text-[#94a3b8] mt-2">
            含 Web 补录与 Excel 改「已完成」再传。业绩仍算开单人。
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <NotionLinkButton
              href={`/performance/orders?status=COMPLETED&${ordersMonthQ}`}
              variant="ghost"
            >
              已完成列表
            </NotionLinkButton>
            <NotionLinkButton
              href={`/performance/orders?status=EXPIRED&${ordersMonthQ}`}
              variant="ghost"
            >
              仍过期列表
            </NotionLinkButton>
          </div>
        </NotionPanel>

        {user!.role !== "ADMIN" && (
          <NotionPanel>
            <h2 className="font-semibold mb-3">本队说明</h2>
            <p className="text-sm text-[#64748b]">
              上方数字仅含你权限范围内、{monthTitle}办理的单。队员只看自己；经理看本队。
            </p>
          </NotionPanel>
        )}
      </div>

      {user!.role === "ADMIN" && (
        <NotionPanel padding={false}>
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{monthTitle}经理排行榜</h2>
            <p className="text-xs text-[#94a3b8]">{rankHint}</p>
          </div>
          <div className={notion.tableWrap + " border-0 rounded-none shadow-none"}>
            <table className="w-full text-sm min-w-[640px]">
              <thead className={notion.thead}>
                <tr>
                  {managerHeaders.map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {managers.map((row, i) => (
                  <tr key={row.id} className={notion.row}>
                    <td className="px-4 py-3 text-[#64748b]">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.total}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">
                      {row.completed}
                    </td>
                    <td className="px-4 py-3 text-amber-700">{row.pending}</td>
                    <td className="px-4 py-3 text-rose-700">{row.expired}</td>
                    <td className="px-4 py-3">{row.completeRate}%</td>
                    <td className="px-4 py-3 text-[#64748b]">{row.lateCompleted}</td>
                  </tr>
                ))}
                {managers.length === 0 && (
                  <tr>
                    <td
                      colSpan={managerHeaders.length}
                      className="px-4 py-8 text-center text-[#94a3b8]"
                    >
                      该月暂无经理数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </NotionPanel>
      )}

      <NotionPanel padding={false}>
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">{monthTitle}队员排行榜</h2>
          <p className="text-xs text-[#94a3b8]">
            {user!.role === "MANAGER" ? "本队 · " : user!.role === "SALES" ? "仅本人 · " : ""}
            {rankHint}
          </p>
        </div>
        <div className={notion.tableWrap + " border-0 rounded-none shadow-none"}>
          <table className={`w-full text-sm ${showManagerCol ? "min-w-[720px]" : "min-w-[640px]"}`}>
            <thead className={notion.thead}>
              <tr>
                {staffHeaders.map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffRank.map((row, i) => (
                <tr key={row.id} className={notion.row}>
                  <td className="px-4 py-3 text-[#64748b]">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/performance/staff/${row.id}?month=${monthParam}`}
                      className="text-[#2563eb] hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  {showManagerCol && (
                    <td className="px-4 py-3 text-[#64748b]">{row.managerName}</td>
                  )}
                  <td className="px-4 py-3">{row.total}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{row.completed}</td>
                  <td className="px-4 py-3 text-amber-700">{row.pending}</td>
                  <td className="px-4 py-3 text-rose-700">{row.expired}</td>
                  <td className="px-4 py-3">{row.completeRate}%</td>
                  <td className="px-4 py-3 text-[#64748b]">{row.lateCompleted}</td>
                </tr>
              ))}
              {staffRank.length === 0 && (
                <tr>
                  <td
                    colSpan={staffHeaders.length}
                    className="px-4 py-8 text-center text-[#94a3b8]"
                  >
                    该月暂无人员数据
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
