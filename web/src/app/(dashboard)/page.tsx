import {
  PageHeader,
  PageShell,
  NotionPanel,
  NotionLinkButton,
} from "@/components/ui/notion";
import { getSessionUser } from "@/lib/session";
import { getWorkQueues } from "@/services/orders";
import { QueueTable } from "@/components/orders/QueueTable";
import { QueueStatCard } from "@/components/orders/QueueStatCard";

export default async function HomePage() {
  const user = await getSessionUser();
  const queues = await getWorkQueues(user!);

  const canCreateOrder = user!.role === "MANAGER" || user!.role === "SALES";

  return (
    <PageShell>
      <PageHeader
        title="今日待办"
        actions={
          canCreateOrder ? (
            <NotionLinkButton href="/orders/new" variant="primary" className="w-full sm:w-auto">
              ＋ 新建业务
            </NotionLinkButton>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QueueStatCard
          targetId="queue-expiring"
          label="今日截止"
          value={queues.counts.expiringToday}
          tone={queues.counts.expiringToday > 0 ? "danger" : "default"}
          hint="办理日+2，明日 10:00 作废"
        />
        <QueueStatCard
          targetId="queue-pending"
          label="待激活"
          value={queues.counts.pending}
          tone="warn"
          hint="窗口内尚未激活"
        />
        <QueueStatCard
          targetId="queue-expired"
          label="过期待补录"
          value={queues.counts.expiredOpen}
          tone={queues.counts.expiredOpen > 0 ? "danger" : "default"}
          hint="可 Web 补录或 Excel 改完成再传"
        />
        <QueueStatCard
          targetId="queue-month-completed"
          label="本月已完成"
          value={queues.counts.monthCompleted}
          tone={queues.counts.monthCompleted > 0 ? "success" : "default"}
          hint="按激活日 · Excel 主录入"
        />
      </div>

      <NotionPanel className="scroll-mt-4" id="queue-expiring">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-rose-700">① 今日截止（优先）</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              剩余 0 天 · 未跟进优先 · 今晚前激活，否则明日 10:00 系统过期
            </p>
          </div>
          <NotionLinkButton
            href="/orders?status=PENDING&followUp=none&due=today"
            variant="ghost"
            className="w-full sm:w-auto shrink-0"
          >
            未跟进今日截止
          </NotionLinkButton>
        </div>
        <QueueTable
          orders={queues.expiringToday.slice(0, 30)}
          emptyText="没有今日截止的单，很好。"
          showDaysLeft
          showFollowUp
        />
        {queues.expiringToday.length > 30 && (
          <p className="text-xs text-[#94a3b8] mt-2">
            仅显示前 30 条，共 {queues.expiringToday.length} 条
          </p>
        )}
      </NotionPanel>

      <NotionPanel id="queue-pending" className="scroll-mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
          <div className="min-w-0">
            <h2 className="font-semibold">② 其余待激活</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">未跟进优先 · 按剩余天数排序</p>
          </div>
          <NotionLinkButton
            href="/orders?status=PENDING"
            variant="ghost"
            className="w-full sm:w-auto shrink-0"
          >
            全部待激活
          </NotionLinkButton>
        </div>
        <QueueTable
          orders={queues.pendingRest.slice(0, 20)}
          emptyText="没有其它待激活单。"
          showDaysLeft
          showFollowUp
        />
        {queues.pendingRest.length > 20 && (
          <p className="text-xs text-[#94a3b8] mt-2">
            仅显示前 20 条 ·{" "}
            <a href="/orders?status=PENDING" className="text-[#2563eb]">
              查看全部 {queues.pendingRest.length + queues.expiringToday.length} 条待激活
            </a>
          </p>
        )}
      </NotionPanel>

      <NotionPanel id="queue-expired" className="scroll-mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-rose-800">③ 过期待补录</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              系统已标过期 · 若线下已激活，点「补录」；真新业务请重新开单
            </p>
          </div>
          <NotionLinkButton
            href="/orders?status=EXPIRED"
            variant="ghost"
            className="w-full sm:w-auto shrink-0"
          >
            全部已过期
          </NotionLinkButton>
        </div>
        <QueueTable
          orders={queues.expiredOpen.slice(0, 20)}
          emptyText="没有待补录的过期单。"
          showFollowUp
        />
        {queues.expiredOpen.length > 20 && (
          <p className="text-xs text-[#94a3b8] mt-2">
            仅显示最近 20 条，共 {queues.expiredOpen.length} 条
          </p>
        )}
      </NotionPanel>

      <NotionPanel id="queue-month-completed" className="scroll-mt-4">
        <div className="mb-3">
          <h2 className="font-semibold text-emerald-800">④ 本月已完成</h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            按激活日统计 · 运营多为次日上传 Excel，不以「今日办理」为准
          </p>
        </div>
        <QueueTable
          orders={queues.monthCompleted.slice(0, 20)}
          emptyText="本月还没有已完成单。"
        />
        {queues.monthCompleted.length > 20 && (
          <p className="text-xs text-[#94a3b8] mt-2">
            仅显示最近 20 条，共 {queues.monthCompleted.length} 条
          </p>
        )}
      </NotionPanel>

      {queues.counts.lateCompleted > 0 && (
        <p className="text-sm text-[#64748b]">
          历史过期后补录完成：{queues.counts.lateCompleted} 单
        </p>
      )}
    </PageShell>
  );
}
