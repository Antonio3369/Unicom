"use client";

import { useState } from "react";
import { NotionButton, NotionPanel, PageHeader, PageShell } from "@/components/ui/notion";

export default function ImportPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function seedFromDataFolder() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/import", { method: "PUT" });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? JSON.stringify(data, null, 2) : data.error);
  }

  async function upload(type: "personnel" | "orders", file: File) {
    setLoading(true);
    setMessage("");
    const form = new FormData();
    form.set("type", type);
    form.set("file", file);
    const res = await fetch("/api/admin/import", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? JSON.stringify(data, null, 2) : data.error);
  }

  return (
    <PageShell>
      <PageHeader
        title="导入对账"
        meta="表格是主录入源 · 先人员后业绩 · 已完成可覆盖待激活/已过期"
      />

      <NotionPanel className="mb-6 text-sm text-[#64748b] space-y-1">
        <p>· Excel 把「待激活/已过期」改成「已完成」再传 → 系统升为已完成（补录）</p>
        <p>· 已完成 / 已退单不会被 Excel 冲掉</p>
        <p>· 导入后会按办理日+2 跑过期批处理</p>
      </NotionPanel>

      <div className="grid md:grid-cols-2 gap-6">
        <NotionPanel className="space-y-4">
          <h2 className="font-semibold">一键导入 data 目录</h2>
          <p className="text-sm text-[#64748b]">
            使用 ../data/ 下的罗湖名单与业绩登记模版（与 seed 相同）
          </p>
          <NotionButton disabled={loading} onClick={seedFromDataFolder}>
            导入罗湖数据
          </NotionButton>
        </NotionPanel>

        <NotionPanel className="space-y-4">
          <h2 className="font-semibold">上传 Excel</h2>
          <label className="block text-sm">
            人员名单
            <input
              type="file"
              accept=".xlsx,.xls"
              className="mt-2 block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("personnel", f);
              }}
            />
          </label>
          <label className="block text-sm">
            业绩登记
            <input
              type="file"
              accept=".xlsx,.xls"
              className="mt-2 block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("orders", f);
              }}
            />
          </label>
        </NotionPanel>
      </div>

      {message && (
        <NotionPanel className="mt-6">
          <pre className="text-xs overflow-auto whitespace-pre-wrap">{message}</pre>
        </NotionPanel>
      )}
    </PageShell>
  );
}
