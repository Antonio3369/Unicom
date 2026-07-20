import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader, PageShell, NotionPanel } from "@/components/ui/notion";
import { HistoryBackLink } from "@/components/ui/HistoryBackLink";
import { getSessionUser } from "@/lib/session";
import { getOrderForUser } from "@/services/orders";
import { db } from "@/lib/db";
import { getActivatorOptions } from "@/services/scope";
import { listOrderEditLogs } from "@/services/order-edits";
import { listOrderAttachments } from "@/services/order-attachments";
import { CARRIER_LABELS, hasFollowUp } from "@/lib/order-rules";
import { formatHandleDate, formatFollowUpAt } from "@/lib/date-utils";
import { FollowUpBadge } from "@/components/orders/FollowUpBadge";
import { OrderDetailActions } from "@/components/orders/OrderDetailActions";
import { OrderEditHistory } from "@/components/orders/OrderEditHistory";
import { OrderAttachmentGallery } from "@/components/orders/OrderAttachmentPicker";
import {
  OrderStatusBadges,
  orderStatusSummary,
} from "@/components/orders/OrderStatusBadges";

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

  const [staffOptions, backends, editLogs, attachments] = await Promise.all([
    getActivatorOptions(user!),
    db.backendDict.findMany({ orderBy: { name: "asc" } }).then((rows) => rows.map((b) => b.name)),
    listOrderEditLogs(id, user!),
    listOrderAttachments(id, user!),
  ]);

  if (!staffOptions.find((s) => s.id === order.openerId)) {
    staffOptions.unshift({ id: order.opener.id, name: order.opener.name });
  }

  return (
    <PageShell>
      <HistoryBackLink label="← 返回" fallbackHref="/" />
      <PageHeader
        title={`业务详情 · ${order.phone}`}
        meta={`${orderStatusSummary(order.status, order.handleDate)} · 开单人 ${order.opener.name}`}
      />

      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <NotionPanel className="space-y-3 text-sm">
          <Row
            label="状态"
            value={<OrderStatusBadges status={order.status} handleDate={order.handleDate} />}
          />
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
          {(order.status === "PENDING" || order.status === "EXPIRED" || hasFollowUp(order)) && (
            <>
              <Row
                label="跟进状态"
                value={
                  order.status === "PENDING" || order.status === "EXPIRED" ? (
                    <FollowUpBadge order={order} />
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="计划激活"
                value={
                  order.planActivateAt ? formatHandleDate(order.planActivateAt) : "—"
                }
              />
              <Row label="待激活原因" value={order.pendingReason?.trim() || "—"} />
              <Row
                label="跟进更新"
                value={order.followUpAt ? formatFollowUpAt(order.followUpAt) : "—"}
              />
            </>
          )}
          {order.status === "REFUNDED" && (
            <>
              <Row label="退单原因" value={order.refundReason ?? "—"} />
              <Row label="退单说明" value={order.refundNote ?? "—"} />
            </>
          )}
          {order.wasEverExpired && (
            <Row label="过期记录" value={order.expiredReason ?? "曾系统过期"} />
          )}
          <OrderAttachmentGallery orderId={order.id} attachments={attachments} />
          <OrderEditHistory logs={editLogs} />
        </NotionPanel>

        <OrderDetailActions
          order={{
            id: order.id,
            status: order.status,
            openerId: order.openerId,
            opener: order.opener,
            handleDate: order.handleDate,
            customerSurname: order.customerSurname,
            phone: order.phone,
            planType: order.planType,
            rechargeAmount: order.rechargeAmount,
            carrier: order.carrier,
            openBackend: order.openBackend,
            note: order.note,
            activatorId: order.activatorId,
            activateBackend: order.activateBackend,
            activatedAt: order.activatedAt,
            wasEverExpired: order.wasEverExpired,
            planActivateAt: order.planActivateAt,
            pendingReason: order.pendingReason,
            followUpAt: order.followUpAt,
          }}
          staffOptions={staffOptions}
          backends={backends.length ? backends : ["佳足后台", "科华后台"]}
        />
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#f1f5f9] pb-2">
      <span className="text-[#64748b]">{label}</span>
      <span className="text-[#111827] text-right">{value}</span>
    </div>
  );
}
