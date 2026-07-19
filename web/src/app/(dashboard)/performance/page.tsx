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

export default async function PerformancePage() {
  const user = await getSessionUser();
  const stats = await getDashboardStats(user!);
  const managers = user!.role === "ADMIN" ? await getManagerSummaries() : [];
  const staffRank = await getStaffRanking(user!);
  const completeRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const expireRate =
    stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0;

  const rankHint =
    user!.role === "ADMIN"
      ? "全员 · 按开单人已完成排序"
      : user!.role === "MANAGER"
        ? "本队队员 · 按开单人已完成排序"
        : "仅本人";
  // 经理/队员视角已锁定本队，所属经理列信息冗余，仅管理员全员榜保留
  const showManagerCol = user!.role === "ADMIN";
  const headers = showManagerCol
    ? ["排名", "队员", "所属经理", "总办理", "已完成", "待激活", "已过期", "完成率", "过期补录"]
    : ["排名", "队员", "总办理", "已完成", "待激活", "已过期", "完成率", "过期补录"];

  return (
    <PageShell>
      <PageHeader
        title="业绩复盘"
        meta="按开单人归属 · 二级入口，日常处理请用侧栏「今日待办」"
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
        <NotionPanel>
          <h2 className="font-semibold mb-3">补录质量</h2>
          <p className="text-sm text-[#64748b]">
            过期后补录完成：
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
              href="/performance/orders?status=COMPLETED"
              variant="ghost"
            >
              已完成列表
            </NotionLinkButton>
            <NotionLinkButton
              href="/performance/orders?status=EXPIRED"
              variant="ghost"
            >
              仍过期列表
            </NotionLinkButton>
          </div>
        </NotionPanel>

        {user!.role === "ADMIN" ? (
          <NotionPanel>
            <h2 className="font-semibold mb-3">经理排行</h2>
            <div className="space-y-2">
              {managers.map(({ manager, total, pending, completed, expired }) => (
                <div
                  key={manager.id}
                  className="flex items-center justify-between text-sm border-b border-[#f1f5f9] pb-2"
                >
                  <div>
                    <span className="font-medium">{manager.name}</span>
                    <span className="text-[#94a3b8] ml-2">{manager.region ?? ""}</span>
                  </div>
                  <div className="text-[#64748b]">
                    共 {total} · 待 {pending} · 成 {completed} · 过期 {expired}
                  </div>
                </div>
              ))}
              {managers.length === 0 && (
                <p className="text-sm text-[#94a3b8]">暂无经理数据</p>
              )}
            </div>
          </NotionPanel>
        ) : (
          <NotionPanel>
            <h2 className="font-semibold mb-3">本队说明</h2>
            <p className="text-sm text-[#64748b]">
              上方数字仅含你权限范围内的业务单。队员只看自己；经理看本队。
            </p>
          </NotionPanel>
        )}
      </div>

      <NotionPanel padding={false}>
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">人员明细排名</h2>
          <p className="text-xs text-[#94a3b8]">{rankHint}</p>
        </div>
        <div className={notion.tableWrap + " border-0 rounded-none shadow-none"}>
          <table className={`w-full text-sm ${showManagerCol ? "min-w-[720px]" : "min-w-[640px]"}`}>
            <thead className={notion.thead}>
              <tr>
                {headers.map((h) => (
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
                      href={`/performance/staff/${row.id}`}
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
                    colSpan={headers.length}
                    className="px-4 py-8 text-center text-[#94a3b8]"
                  >
                    暂无人员数据
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
