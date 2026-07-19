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
  const roleHint =
    user!.role === "ADMIN"
      ? "全量视野 · 先处理风险单"
      : user!.role === "MANAGER"
        ? "本队视野 · 先处理即将过期"
        : "我的单 · 先清今日截止";

  return (
    <PageShell>
      <PageHeader
        title="今日待办"
        meta={`订单运营台 · ${roleHint}`}
        actions={<NotionLinkButton href="/orders/new">新建业务</NotionLinkButton>}
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
          targetId="queue-today"
          label="今日新开"
          value={queues.counts.todayOpened}
          hint="办理日=今天"
        />
      </div>

      <NotionPanel className="scroll-mt-4" id="queue-expiring">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-rose-700">① 今日截止（优先）</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              剩余 0 天 · 今晚前激活，否则明日 10:00 系统过期
            </p>
          </div>
          <NotionLinkButton href="/orders?status=PENDING" variant="ghost">
            全部待激活
          </NotionLinkButton>
        </div>
        <QueueTable
          orders={queues.expiringToday.slice(0, 30)}
          emptyText="没有今日截止的单，很好。"
          showDaysLeft
        />
        {queues.expiringToday.length > 30 && (
          <p className="text-xs text-[#94a3b8] mt-2">
            仅显示前 30 条，共 {queues.expiringToday.length} 条
          </p>
        )}
      </NotionPanel>

      <NotionPanel id="queue-pending" className="scroll-mt-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold">② 其余待激活</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">按剩余天数排序</p>
          </div>
          <NotionLinkButton href="/orders?status=PENDING" variant="ghost">
            全部待激活
          </NotionLinkButton>
        </div>
        <QueueTable
          orders={queues.pendingRest.slice(0, 20)}
          emptyText="没有其它待激活单。"
          showDaysLeft
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
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-rose-800">③ 过期待补录</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              系统已标过期 · 若线下已激活，点「补录」；真新业务请重新开单
            </p>
          </div>
          <NotionLinkButton href="/orders?status=EXPIRED" variant="ghost">
            全部已过期
          </NotionLinkButton>
        </div>
        <QueueTable
          orders={queues.expiredOpen.slice(0, 20)}
          emptyText="没有待补录的过期单。"
        />
        {queues.expiredOpen.length > 20 && (
          <p className="text-xs text-[#94a3b8] mt-2">
            仅显示最近 20 条，共 {queues.expiredOpen.length} 条
          </p>
        )}
      </NotionPanel>

      <NotionPanel id="queue-today" className="scroll-mt-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold">④ 今日新开</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">办理日 = 今天</p>
          </div>
          <NotionLinkButton href="/orders" variant="ghost">
            全部业务
          </NotionLinkButton>
        </div>
        <QueueTable
          orders={queues.todayOpened.slice(0, 20)}
          emptyText="今天还没有新开单。"
        />
        {queues.todayOpened.length > 20 && (
          <p className="text-xs text-[#94a3b8] mt-2">
            仅显示前 20 条，共 {queues.todayOpened.length} 条
          </p>
        )}
      </NotionPanel>

      <div className="flex flex-wrap gap-2 text-sm">
        <NotionLinkButton href="/performance" variant="ghost">
          业绩复盘 →
        </NotionLinkButton>
        {user!.role === "ADMIN" && (
          <NotionLinkButton href="/admin/import" variant="ghost">
            导入对账 →
          </NotionLinkButton>
        )}
        {queues.counts.lateCompleted > 0 && (
          <span className="text-[#64748b] self-center px-2">
            历史过期后补录完成：{queues.counts.lateCompleted} 单
          </span>
        )}
      </div>
    </PageShell>
  );
}
