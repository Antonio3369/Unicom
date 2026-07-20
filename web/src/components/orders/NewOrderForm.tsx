"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  NotionButton,
  NotionPanel,
  PageHeader,
  PageShell,
  notion,
  NotionAlert,
} from "@/components/ui/notion";
import { readApiError, networkErrorMessage } from "@/lib/api-error";
import type { Carrier } from "@/generated/prisma/client";

export type NewOrderFormInitial = {
  handleDate: string;
  customerSurname: string;
  phone: string;
  planType: string;
  rechargeAmount: string;
  carrier: Carrier;
  openBackend: string;
};

type OpenerOption = { id: string; name: string };

export function NewOrderForm({
  openerOptions,
  defaultOpenerId,
}: {
  openerOptions: OpenerOption[] | null;
  defaultOpenerId?: string;
}) {
  const router = useRouter();
  const needsOpener = openerOptions !== null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openerId, setOpenerId] = useState(
    defaultOpenerId ?? openerOptions?.[0]?.id ?? ""
  );
  const [form, setForm] = useState<NewOrderFormInitial>({
    handleDate: new Date().toISOString().slice(0, 10),
    customerSurname: "",
    phone: "",
    planType: "39",
    rechargeAmount: "200",
    carrier: "UNICOM",
    openBackend: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (needsOpener && !openerId) {
      setError("请选择开单人");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rechargeAmount: Number(form.rechargeAmount),
          ...(needsOpener ? { openerId } : {}),
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res, "创建失败"));
        return;
      }
      const data = await res.json();
      router.push(`/orders/${data.order.id}`);
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="新建业务"
        meta={
          needsOpener
            ? "开单人默认为本人，可改选队员"
            : "办理日默认为今天 · 开单后可在详情激活"
        }
      />
      <NotionPanel className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          {needsOpener && (
            <label className="block text-sm">
              开单人
              <select
                className={`${notion.select} mt-1 w-full`}
                value={openerId}
                onChange={(e) => setOpenerId(e.target.value)}
                required
              >
                {openerOptions!.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {[
            ["handleDate", "办理日期", "date"],
            ["customerSurname", "客户姓氏", "text"],
            ["phone", "办理手机号", "text"],
            ["planType", "套餐类型", "text"],
            ["rechargeAmount", "充值金额", "number"],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              {label}
              <input
                type={type}
                className={`${notion.input} mt-1`}
                value={form[key as keyof NewOrderFormInitial]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
              />
            </label>
          ))}
          <label className="block text-sm">
            运营商
            <select
              className={`${notion.select} mt-1 w-full`}
              value={form.carrier}
              onChange={(e) =>
                setForm({ ...form, carrier: e.target.value as Carrier })
              }
            >
              <option value="UNICOM">联通</option>
              <option value="MOBILE">移动</option>
              <option value="OTHER">其他</option>
            </select>
          </label>
          <label className="block text-sm">
            开单后台（可选）
            <input
              className={`${notion.input} mt-1`}
              value={form.openBackend}
              onChange={(e) => setForm({ ...form, openBackend: e.target.value })}
            />
          </label>
          {error && <NotionAlert tone="error">{error}</NotionAlert>}
          <NotionButton type="submit" disabled={loading} className="w-full">
            保存为待激活
          </NotionButton>
        </form>
      </NotionPanel>
    </PageShell>
  );
}
