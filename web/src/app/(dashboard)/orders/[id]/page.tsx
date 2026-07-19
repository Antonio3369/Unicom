import { notFound } from "next/navigation";
import { PageHeader, PageShell, NotionPanel } from "@/components/ui/notion";
import { HistoryBackLink } from "@/components/ui/HistoryBackLink";
import { getSessionUser } from "@/lib/session";
import { getOrderForUser } from "@/services/orders";
import { db } from "@/lib/db";
import { getAccessibleUserIds } from "@/services/scope";
import { STATUS_LABELS, CARRIER_LABELS } from "@/lib/order-rules";
import { formatHandleDate } from "@/lib/date-utils";
import { OrderDetailActions } from "@/components/orders/OrderDetailActions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;

  let order;
  try {
    order = await getOrderForUser(id, user!);
  } catch {
    notFound();
  }

  const ids = await getAccessibleUserIds(user!);
  const staffWhere =
    ids === null
      ? { role: "SALES" as const, status: "ACTIVE" as const }
      : { id: { in: ids.filter((x) => x !== user!.id) }, role: "SALES" as const };

  const staffOptions = await db.user.findMany({
    where: staffWhere,
    select: { id: true, name: true },
  });
  if (!staffOptions.find((s) => s.id === order.openerId)) {
    staffOptions.unshift({ id: order.opener.id, name: order.opener.name });
  }

  const backends = (await db.backendDict.findMany({ orderBy: { name: "asc" } })).map(
    (b) => b.name
  );

  return (
    <PageShell>
      <HistoryBackLink label="← 返回" fallbackHref="/" />
      <PageHeader
        title={`业务详情 · ${order.phone}`}
        meta={`${STATUS_LABELS[order.status]} · 开单人 ${order.opener.name}`}
      />

      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <NotionPanel className="space-y-3 text-sm">
          <Row label="办理日" value={formatHandleDate(order.handleDate)} />
          <Row label="客户姓氏" value={order.customerSurname} />
          <Row label="手机号" value={order.phone} />
          <Row label="套餐/充值" value={`${order.planType} / ${order.rechargeAmount}`} />
          <Row
            label="运营商"
            value={order.carrier ? CARRIER_LABELS[order.carrier] : "—"}
          />
          <Row label="开单后台" value={order.openBackend ?? "—"} />
          <Row label="激活后台" value={order.activateBackend ?? "—"} />
          <Row label="激活人" value={order.activator?.name ?? "—"} />
          <Row
            label="激活日"
            value={order.activatedAt ? formatHandleDate(order.activatedAt) : "—"}
          />
          <Row label="备注" value={order.note ?? "—"} />
          {order.wasEverExpired && (
            <Row label="过期记录" value={order.expiredReason ?? "曾系统过期"} />
          )}
        </NotionPanel>

        <OrderDetailActions
          order={{
            id: order.id,
            status: order.status,
            openerId: order.openerId,
            opener: order.opener,
            wasEverExpired: order.wasEverExpired,
          }}
          staffOptions={staffOptions}
          backends={backends.length ? backends : ["佳足后台", "科华后台"]}
        />
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#f1f5f9] pb-2">
      <span className="text-[#64748b]">{label}</span>
      <span className="text-[#111827] text-right">{value}</span>
    </div>
  );
}
