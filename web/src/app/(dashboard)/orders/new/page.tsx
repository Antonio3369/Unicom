"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { NotionButton, NotionPanel, PageHeader, PageShell, notion } from "@/components/ui/notion";

function NewOrderFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const linkedVoidOrderId = params.get("linkedVoidOrderId") ?? undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
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
    setLoading(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rechargeAmount: Number(form.rechargeAmount), linkedVoidOrderId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "创建失败");
      return;
    }
    router.push(`/orders/${data.order.id}`);
  }

  return (
    <PageShell>
      <PageHeader
        title="新建业务"
        meta={linkedVoidOrderId ? "关联作废单重新办理" : "办理日默认为今天"}
      />
      <NotionPanel className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
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
                value={form[key as keyof typeof form]}
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
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
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
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <NotionButton type="submit" disabled={loading} className="w-full">
            保存为待激活
          </NotionButton>
        </form>
      </NotionPanel>
    </PageShell>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderFormInner />
    </Suspense>
  );
}
