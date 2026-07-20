"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NotionButton, NotionPanel, notion, NotionAlert } from "@/components/ui/notion";
import { BackendComboInput } from "@/components/ui/BackendComboInput";
import { OrderAttachmentPicker } from "@/components/orders/OrderAttachmentPicker";
import { formatFollowUpAt, toDateInputValue } from "@/lib/date-utils";
import { readApiError, networkErrorMessage } from "@/lib/api-error";
import {
  isExpiredByRule,
} from "@/lib/order-rules";
import type { Carrier } from "@/generated/prisma/client";
import type { ReactNode } from "react";

function ActionBlock({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description?: string;
  tone: "neutral" | "success" | "warn" | "danger";
  children: ReactNode;
}) {
  const styles = {
    neutral: {
      wrap: "border-[#cbd5e1] bg-[#f8fafc]",
      title: "text-[#0f172a]",
      badge: "bg-slate-100 text-slate-600",
    },
    success: {
      wrap: "border-emerald-300 bg-emerald-50/80",
      title: "text-emerald-900",
      badge: "bg-emerald-100 text-emerald-800",
    },
    warn: {
      wrap: "border-amber-300 bg-amber-50/80",
      title: "text-amber-900",
      badge: "bg-amber-100 text-amber-800",
    },
    danger: {
      wrap: "border-rose-300 bg-rose-50/60",
      title: "text-rose-900",
      badge: "bg-rose-100 text-rose-800",
    },
  }[tone];

  return (
    <section
      className={`rounded-xl border-2 ${styles.wrap} p-4 sm:p-5 space-y-3 shadow-sm`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={`text-base font-semibold ${styles.title}`}>{title}</h3>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles.badge}`}
          >
            {tone === "success"
              ? "主操作"
              : tone === "danger"
                ? "不可逆"
                : tone === "warn"
                  ? "跟进"
                  : "编辑"}
          </span>
        </div>
        {description && <p className="text-xs text-[#64748b]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

type OrderData = {
  id: string;
  status: string;
  openerId: string;
  opener: { name: string };
  handleDate: Date;
  customerSurname: string;
  phone: string;
  planType: string;
  rechargeAmount: number;
  carrier: Carrier | null;
  openBackend: string | null;
  note: string | null;
  activatorId: string | null;
  activateBackend: string | null;
  activatedAt: Date | null;
  wasEverExpired: boolean;
  planActivateAt?: Date | null;
  pendingReason?: string | null;
  followUpAt?: Date | null;
};

export function OrderDetailActions({
  order,
  staffOptions,
  backends,
}: {
  order: OrderData;
  staffOptions: { id: string; name: string }[];
  backends: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(() => buildEditForm(order));
  const [editNote, setEditNote] = useState("");

  const [activatorId, setActivatorId] = useState(order.openerId);
  const [activateBackend, setActivateBackend] = useState(order.activateBackend ?? "");
  const [activatedAt, setActivatedAt] = useState(new Date().toISOString().slice(0, 10));
  const [lateEntryNote, setLateEntryNote] = useState("");
  const [activateFiles, setActivateFiles] = useState<File[]>([]);

  const [refundReason, setRefundReason] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundFiles, setRefundFiles] = useState<File[]>([]);

  const [planActivateAt, setPlanActivateAt] = useState(
    order.planActivateAt ? toDateInputValue(order.planActivateAt) : ""
  );
  const [pendingReason, setPendingReason] = useState(order.pendingReason ?? "");

  const editable = order.status === "PENDING" || order.status === "EXPIRED" || order.status === "COMPLETED";

  const handleDateHint = useMemo(() => {
    if (!editOpen || order.status === "COMPLETED" || order.status === "REFUNDED") {
      if (order.status === "COMPLETED" && editOpen) {
        return "已完成状态不会因改办理日而改变";
      }
      return null;
    }
    const next = new Date(editForm.handleDate + "T00:00:00");
    const expired = isExpiredByRule(next);
    if (order.status === "PENDING") {
      return expired
        ? "按新办理日，保存后将变为已过期"
        : "按新办理日，仍在激活窗口内 → 保持待激活";
    }
    if (order.status === "EXPIRED") {
      return expired
        ? "按新办理日，仍将保持已过期"
        : "按新办理日，保存后将回到待激活";
    }
    return null;
  }, [editOpen, editForm.handleDate, order.status]);

  async function saveEdit() {
    if (editForm.phone !== order.phone) {
      const ok = window.confirm(`确认将手机号改为 ${editForm.phone}？`);
      if (!ok) return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = {
        action: "edit",
        handleDate: editForm.handleDate,
        customerSurname: editForm.customerSurname,
        phone: editForm.phone,
        planType: editForm.planType,
        rechargeAmount: Number(editForm.rechargeAmount),
        carrier: editForm.carrier,
        openBackend: editForm.openBackend,
        note: editForm.note,
        editNote: editNote || undefined,
      };
      if (order.status === "COMPLETED") {
        body.activatorId = editForm.activatorId;
        body.activateBackend = editForm.activateBackend;
        body.activatedAt = editForm.activatedAt;
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setFeedback({ tone: "error", text: await readApiError(res, "保存失败") });
        return;
      }
      setFeedback({ tone: "success", text: "修改已保存" });
      setEditOpen(false);
      router.refresh();
    } catch (e) {
      setFeedback({ tone: "error", text: networkErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  async function submitActivate() {
    setLoading(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.set("activatorId", activatorId);
      form.set("activateBackend", activateBackend);
      form.set("activatedAt", activatedAt);
      if (lateEntryNote) form.set("lateEntryNote", lateEntryNote);
      activateFiles.forEach((f) => form.append("files", f));

      const res = await fetch(`/api/orders/${order.id}/activate`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setFeedback({ tone: "error", text: await readApiError(res, "激活失败") });
        return;
      }
      setFeedback({ tone: "success", text: "已保存已激活" });
      router.refresh();
    } catch (e) {
      setFeedback({ tone: "error", text: networkErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  async function submitRefund() {
    setLoading(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.set("refundReason", refundReason);
      if (refundNote) form.set("refundNote", refundNote);
      refundFiles.forEach((f) => form.append("files", f));

      const res = await fetch(`/api/orders/${order.id}/refund`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setFeedback({ tone: "error", text: await readApiError(res, "退单失败") });
        return;
      }
      setFeedback({ tone: "success", text: "已退单" });
      router.refresh();
    } catch (e) {
      setFeedback({ tone: "error", text: networkErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  async function patchPending() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pending", planActivateAt, pendingReason }),
      });
      if (!res.ok) {
        setFeedback({ tone: "error", text: await readApiError(res, "操作失败") });
        return;
      }
      setFeedback({ tone: "success", text: "已保存" });
      router.refresh();
    } catch (e) {
      setFeedback({ tone: "error", text: networkErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <NotionPanel className="space-y-4">
      <h2 className="font-semibold text-lg text-[#111827]">操作</h2>
      {feedback && (
        <NotionAlert tone={feedback.tone === "success" ? "success" : "error"}>
          {feedback.text}
        </NotionAlert>
      )}

      {editable && (
        <ActionBlock
          title="修改订单"
          description="更正手机号、办理日、套餐等信息（开单人不可改）"
          tone="neutral"
        >
          <NotionButton
            variant="secondary"
            className="w-full font-semibold"
            onClick={() => {
              if (!editOpen) setEditForm(buildEditForm(order));
              setEditOpen(!editOpen);
            }}
          >
            {editOpen ? "收起表单 ▲" : "展开修改表单 ▼"}
          </NotionButton>

          {editOpen && (
            <div className="space-y-3 pt-1 border-t border-[#e2e8f0]">
              <p className="text-xs text-[#64748b]">
                开单人：{order.opener.name}（不可改）
              </p>
              {[
                ["handleDate", "办理日期", "date"],
                ["customerSurname", "客户姓氏", "text"],
                ["phone", "手机号", "text"],
                ["planType", "套餐类型", "text"],
                ["rechargeAmount", "充值金额", "number"],
              ].map(([key, label, type]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <input
                    type={type}
                    className={`${notion.input} mt-1 w-full`}
                    value={editForm[key as keyof typeof editForm] as string}
                    onChange={(e) =>
                      setEditForm({ ...editForm, [key]: e.target.value })
                    }
                    required
                  />
                </label>
              ))}
              <label className="block text-sm">
                运营商
                <select
                  className={`${notion.select} mt-1 w-full`}
                  value={editForm.carrier}
                  onChange={(e) =>
                    setEditForm({ ...editForm, carrier: e.target.value as Carrier })
                  }
                >
                  <option value="UNICOM">联通</option>
                  <option value="MOBILE">移动</option>
                  <option value="OTHER">其他</option>
                </select>
              </label>
              <label className="block text-sm">
                开单后台
                <input
                  className={`${notion.input} mt-1 w-full`}
                  value={editForm.openBackend}
                  onChange={(e) => setEditForm({ ...editForm, openBackend: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                备注
                <input
                  className={`${notion.input} mt-1 w-full`}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                />
              </label>

              {order.status === "COMPLETED" && (
                <div className="space-y-3 border-t border-[#e2e8f0] pt-3">
                  <p className="text-sm font-medium">激活信息</p>
                  <label className="block text-sm">
                    激活人
                    <select
                      className={`${notion.select} mt-1 w-full`}
                      value={editForm.activatorId}
                      onChange={(e) =>
                        setEditForm({ ...editForm, activatorId: e.target.value })
                      }
                    >
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    激活后台
                    <BackendComboInput
                      value={editForm.activateBackend}
                      onChange={(v) => setEditForm({ ...editForm, activateBackend: v })}
                      options={backends}
                    />
                  </label>
                  <label className="block text-sm">
                    真实激活日期
                    <input
                      type="date"
                      className={`${notion.input} mt-1`}
                      value={editForm.activatedAt}
                      onChange={(e) =>
                        setEditForm({ ...editForm, activatedAt: e.target.value })
                      }
                    />
                  </label>
                </div>
              )}

              <label className="block text-sm">
                改单原因（选填）
                <input
                  className={`${notion.input} mt-1 w-full`}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="如：手机号录错、补录昨日订单…"
                />
              </label>

              {handleDateHint && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {handleDateHint}
                </p>
              )}

              <NotionButton disabled={loading} onClick={saveEdit} className="w-full font-semibold">
                保存修改
              </NotionButton>
            </div>
          )}
        </ActionBlock>
      )}

      {(order.status === "PENDING" || order.status === "EXPIRED") && (
        <ActionBlock
          title="保存已激活"
          description="客户已办完，上传激活凭证后提交"
          tone="success"
        >
          {order.status === "EXPIRED" && (
            <p className="text-xs text-emerald-800 bg-white/60 border border-emerald-200 rounded-lg px-3 py-2">
              该单已系统过期，补录后状态变为已完成。
            </p>
          )}
          <label className="block text-sm">
            激活人
            <select
              className={`${notion.select} mt-1 w-full`}
              value={activatorId}
              onChange={(e) => setActivatorId(e.target.value)}
            >
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            激活后台
            <BackendComboInput
              value={activateBackend}
              onChange={setActivateBackend}
              options={backends}
              placeholder="选择或输入，如：佳足后台"
            />
          </label>
          <label className="block text-sm">
            真实激活日期
            <input
              type="date"
              className={`${notion.input} mt-1`}
              value={activatedAt}
              onChange={(e) => setActivatedAt(e.target.value)}
            />
          </label>
          {order.status === "EXPIRED" && (
            <label className="block text-sm">
              补录说明
              <input
                className={`${notion.input} mt-1`}
                value={lateEntryNote}
                onChange={(e) => setLateEntryNote(e.target.value)}
                placeholder="选填"
              />
            </label>
          )}
          <OrderAttachmentPicker
            label="激活凭证（必填）"
            hint="最多 3 张，从相册或文件选择"
            files={activateFiles}
            onChange={setActivateFiles}
            disabled={loading}
          />
          <NotionButton
            disabled={
              loading || !activateBackend.trim() || activateFiles.length === 0
            }
            onClick={submitActivate}
            className="w-full font-semibold !bg-emerald-600 hover:!bg-emerald-700 !text-white"
          >
            保存已激活
          </NotionButton>
        </ActionBlock>
      )}

      {order.status === "PENDING" && (
        <ActionBlock
          title="待激活跟进"
          description="客户还没来、计划哪天来 — 不改变订单核心信息"
          tone="warn"
        >
          {order.followUpAt && (
            <p className="text-xs text-[#64748b]">
              上次保存：{formatFollowUpAt(order.followUpAt)}
            </p>
          )}
          <label className="block text-sm">
            计划激活时间
            <input
              type="date"
              className={`${notion.input} mt-1`}
              value={planActivateAt}
              onChange={(e) => setPlanActivateAt(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            待激活原因
            <input
              className={`${notion.input} mt-1`}
              value={pendingReason}
              onChange={(e) => setPendingReason(e.target.value)}
              placeholder="如：客户忘带身份证…"
            />
          </label>
          <NotionButton
            variant="secondary"
            disabled={loading}
            onClick={patchPending}
            className="w-full font-semibold"
          >
            保存跟进
          </NotionButton>
        </ActionBlock>
      )}

      {(order.status === "PENDING" || order.status === "EXPIRED") && (
        <ActionBlock
          title="退单"
          description="客户不办了，需填写原因并上传沟通记录"
          tone="danger"
        >
          <input
            className={notion.input}
            placeholder="退单原因（必填）"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <input
            className={notion.input}
            placeholder="退单说明（选填）"
            value={refundNote}
            onChange={(e) => setRefundNote(e.target.value)}
          />
          <OrderAttachmentPicker
            label="沟通记录（必填）"
            hint="最多 3 张图片"
            files={refundFiles}
            onChange={setRefundFiles}
            disabled={loading}
          />
          <NotionButton
            disabled={loading || !refundReason.trim() || refundFiles.length === 0}
            onClick={submitRefund}
            className="w-full font-semibold !text-rose-700 !border-rose-300 !bg-white hover:!bg-rose-50"
            variant="ghost"
          >
            确认退单
          </NotionButton>
        </ActionBlock>
      )}
    </NotionPanel>
  );
}

function buildEditForm(order: OrderData) {
  return {
    handleDate: toDateInputValue(order.handleDate),
    customerSurname: order.customerSurname,
    phone: order.phone,
    planType: order.planType,
    rechargeAmount: String(order.rechargeAmount),
    carrier: (order.carrier ?? "UNICOM") as Carrier,
    openBackend: order.openBackend ?? "",
    note: order.note ?? "",
    activatorId: order.activatorId ?? order.openerId,
    activateBackend: order.activateBackend ?? "",
    activatedAt: order.activatedAt
      ? toDateInputValue(order.activatedAt)
      : new Date().toISOString().slice(0, 10),
  };
}
