"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NotionButton, NotionPanel, notion, NotionAlert } from "@/components/ui/notion";
import { BackendComboInput } from "@/components/ui/BackendComboInput";
import { formatFollowUpAt, toDateInputValue } from "@/lib/date-utils";
import { readApiError, networkErrorMessage } from "@/lib/api-error";

export function OrderDetailActions({
  order,
  staffOptions,
  backends,
}: {
  order: {
    id: string;
    status: string;
    openerId: string;
    opener: { name: string };
    wasEverExpired: boolean;
    planActivateAt?: Date | null;
    pendingReason?: string | null;
    followUpAt?: Date | null;
  };
  staffOptions: { id: string; name: string }[];
  backends: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  );
  const [activatorId, setActivatorId] = useState(order.openerId);
  const [activateBackend, setActivateBackend] = useState("");
  const [activatedAt, setActivatedAt] = useState(new Date().toISOString().slice(0, 10));
  const [lateEntryNote, setLateEntryNote] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [planActivateAt, setPlanActivateAt] = useState(
    order.planActivateAt ? toDateInputValue(order.planActivateAt) : ""
  );
  const [pendingReason, setPendingReason] = useState(order.pendingReason ?? "");

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setFeedback({ tone: "error", text: await readApiError(res, "操作失败") });
        return;
      }
      await res.json();
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
      <h2 className="font-semibold">操作</h2>
      {feedback && (
        <NotionAlert tone={feedback.tone === "success" ? "success" : "error"}>
          {feedback.text}
        </NotionAlert>
      )}

      {(order.status === "PENDING" || order.status === "EXPIRED") && (
        <div className="space-y-3 border-t border-[#f1f5f9] pt-4">
          <h3 className="text-sm font-medium">
            {order.status === "EXPIRED" ? "补录激活（该单已系统过期）" : "确认激活"}
          </h3>
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
            <span className="block text-xs text-[#94a3b8] mt-1">
              可下拉选择，也可输入新后台（保存后加入列表）
            </span>
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
                placeholder="可选"
              />
            </label>
          )}
          <NotionButton
            disabled={loading || !activateBackend.trim()}
            onClick={() =>
              patch({
                action: "activate",
                activatorId,
                activateBackend,
                activatedAt,
                lateEntryNote,
              })
            }
          >
            {order.status === "EXPIRED" ? "补录为已完成" : "确认激活"}
          </NotionButton>
        </div>
      )}

      {order.status === "PENDING" && (
        <div className="space-y-3 border-t border-[#f1f5f9] pt-4">
          <div>
            <h3 className="text-sm font-medium">待激活跟进</h3>
            {order.followUpAt && (
              <p className="text-xs text-[#64748b] mt-1">
                上次保存：{formatFollowUpAt(order.followUpAt)}
              </p>
            )}
          </div>
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
              placeholder="如：客户下周来、资料不齐…"
            />
          </label>
          <NotionButton
            variant="secondary"
            disabled={loading}
            onClick={() => patch({ action: "pending", planActivateAt, pendingReason })}
          >
            保存跟进
          </NotionButton>
        </div>
      )}

      {(order.status === "PENDING" || order.status === "EXPIRED") && (
        <div className="space-y-3 border-t border-[#f1f5f9] pt-4">
          <h3 className="text-sm font-medium">退单</h3>
          <input
            className={notion.input}
            placeholder="退单原因"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <NotionButton
            variant="ghost"
            disabled={loading || !refundReason}
            onClick={() => patch({ action: "refund", refundReason })}
          >
            确认退单
          </NotionButton>
        </div>
      )}

      {order.status === "EXPIRED" && (
        <div className="border-t border-[#f1f5f9] pt-4">
          <NotionButton
            variant="secondary"
            onClick={() =>
              router.push(`/orders/new?linkedVoidOrderId=${order.id}`)
            }
          >
            客户仍要办理 → 重新开单
          </NotionButton>
        </div>
      )}
    </NotionPanel>
  );
}
