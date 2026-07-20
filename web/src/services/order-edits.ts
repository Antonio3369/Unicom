import { db } from "@/lib/db";
import type { Carrier, OrderStatus } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/permissions";
import { assertUserInScope } from "@/lib/permissions";
import { getAccessibleUserIds } from "@/services/scope";
import { getOrderForUser } from "@/services/orders";
import {
  CARRIER_LABELS,
  EXPIRED_REASON,
  STATUS_LABELS,
  isExpiredByRule,
} from "@/lib/order-rules";
import { formatHandleDate, parseDateInput } from "@/lib/date-utils";

export type EditChange = { field: string; label: string; from: string; to: string };

const EDITABLE_STATUSES: OrderStatus[] = ["PENDING", "EXPIRED", "COMPLETED"];

function recalcStatus(current: OrderStatus, handleDate: Date): OrderStatus {
  if (current === "COMPLETED" || current === "REFUNDED") return current;
  return isExpiredByRule(handleDate) ? "EXPIRED" : "PENDING";
}

function str(v: unknown): string {
  if (v == null || v === "") return "—";
  if (v instanceof Date) return formatHandleDate(v);
  return String(v);
}

export async function updateOrderFields(input: {
  orderId: string;
  user: SessionUser;
  handleDate?: string;
  customerSurname?: string;
  phone?: string;
  planType?: string;
  rechargeAmount?: number;
  carrier?: Carrier;
  openBackend?: string;
  note?: string;
  activatorId?: string;
  activateBackend?: string;
  activatedAt?: string;
  editNote?: string;
}) {
  const order = await getOrderForUser(input.orderId, input.user);
  if (!EDITABLE_STATUSES.includes(order.status)) {
    throw new Error("当前状态不可修改");
  }

  const ids = await getAccessibleUserIds(input.user);
  const changes: EditChange[] = [];
  const data: Record<string, unknown> = {};

  if (input.handleDate !== undefined) {
    const next = parseDateInput(input.handleDate);
    if (next.getTime() !== order.handleDate.getTime()) {
      changes.push({
        field: "handleDate",
        label: "办理日期",
        from: str(order.handleDate),
        to: str(next),
      });
      data.handleDate = next;
      const nextStatus = recalcStatus(order.status, next);
      if (nextStatus !== order.status) {
        changes.push({
          field: "status",
          label: "状态",
          from: STATUS_LABELS[order.status],
          to: STATUS_LABELS[nextStatus],
        });
        data.status = nextStatus;
        if (nextStatus === "EXPIRED") {
          data.expiredAt = new Date();
          data.expiredReason = EXPIRED_REASON;
          data.wasEverExpired = true;
        }
      }
    }
  }

  if (input.customerSurname !== undefined) {
    const next = input.customerSurname.trim().slice(0, 1);
    if (next !== order.customerSurname) {
      changes.push({
        field: "customerSurname",
        label: "客户姓氏",
        from: order.customerSurname,
        to: next,
      });
      data.customerSurname = next;
    }
  }

  if (input.phone !== undefined) {
    const next = input.phone.trim();
    if (next !== order.phone) {
      changes.push({ field: "phone", label: "手机号", from: order.phone, to: next });
      data.phone = next;
    }
  }

  if (input.planType !== undefined) {
    const next = input.planType.trim();
    if (next !== order.planType) {
      changes.push({ field: "planType", label: "套餐类型", from: order.planType, to: next });
      data.planType = next;
    }
  }

  if (input.rechargeAmount !== undefined) {
    if (input.rechargeAmount !== order.rechargeAmount) {
      changes.push({
        field: "rechargeAmount",
        label: "充值金额",
        from: String(order.rechargeAmount),
        to: String(input.rechargeAmount),
      });
      data.rechargeAmount = input.rechargeAmount;
    }
  }

  if (input.carrier !== undefined && input.carrier !== order.carrier) {
    changes.push({
      field: "carrier",
      label: "运营商",
      from: order.carrier ? CARRIER_LABELS[order.carrier] : "—",
      to: CARRIER_LABELS[input.carrier],
    });
    data.carrier = input.carrier;
  }

  if (input.openBackend !== undefined) {
    const next = input.openBackend.trim() || null;
    if (next !== (order.openBackend ?? null)) {
      changes.push({
        field: "openBackend",
        label: "开单后台",
        from: str(order.openBackend),
        to: str(next),
      });
      data.openBackend = next;
    }
  }

  if (input.note !== undefined) {
    const next = input.note.trim() || null;
    if (next !== (order.note ?? null)) {
      changes.push({ field: "note", label: "备注", from: str(order.note), to: str(next) });
      data.note = next;
    }
  }

  if (order.status === "COMPLETED") {
    if (input.activatorId !== undefined && input.activatorId !== order.activatorId) {
      assertUserInScope(input.user, input.activatorId, ids);
      const activator = await db.user.findUnique({ where: { id: input.activatorId } });
      changes.push({
        field: "activatorId",
        label: "激活人",
        from: order.activator?.name ?? "—",
        to: activator?.name ?? input.activatorId,
      });
      data.activatorId = input.activatorId;
    }

    if (input.activateBackend !== undefined) {
      const next = input.activateBackend.trim();
      if (next && next !== (order.activateBackend ?? "")) {
        changes.push({
          field: "activateBackend",
          label: "激活后台",
          from: str(order.activateBackend),
          to: next,
        });
        data.activateBackend = next;
        await db.backendDict.upsert({
          where: { name: next },
          update: {},
          create: { name: next },
        });
      }
    }

    if (input.activatedAt !== undefined) {
      const next = parseDateInput(input.activatedAt);
      const prev = order.activatedAt;
      if (!prev || next.getTime() !== prev.getTime()) {
        changes.push({
          field: "activatedAt",
          label: "激活日期",
          from: str(prev),
          to: str(next),
        });
        data.activatedAt = next;
      }
    }
  }

  if (changes.length === 0) {
    throw new Error("没有需要保存的修改");
  }

  const shouldLog =
    input.user.role === "MANAGER" && order.openerId !== input.user.id;

  return db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data,
      include: {
        opener: { select: { id: true, name: true } },
        activator: { select: { id: true, name: true } },
      },
    });

    if (shouldLog) {
      await tx.orderEditLog.create({
        data: {
          orderId: order.id,
          editorId: input.user.id,
          editNote: input.editNote?.trim() || null,
          changes,
        },
      });
    }

    return updated;
  });
}

export async function listOrderEditLogs(orderId: string, user: SessionUser) {
  await getOrderForUser(orderId, user);
  return db.orderEditLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    include: { editor: { select: { name: true } } },
  });
}
