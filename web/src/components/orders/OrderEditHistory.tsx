"use client";

import { useState } from "react";
import type { EditChange } from "@/services/order-edits";

export function OrderEditHistory({
  logs,
}: {
  logs: {
    id: string;
    editNote: string | null;
    changes: unknown;
    createdAt: Date;
    editor: { name: string };
  }[];
}) {
  if (!logs.length) return null;

  return (
    <div className="border-t border-[#f1f5f9] pt-4 mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#111827]">修改记录</h3>
      {logs.map((log) => (
        <EditLogItem key={log.id} log={log} />
      ))}
    </div>
  );
}

function EditLogItem({
  log,
}: {
  log: {
    editNote: string | null;
    changes: unknown;
    createdAt: Date;
    editor: { name: string };
  };
}) {
  const [open, setOpen] = useState(false);
  const changes = (Array.isArray(log.changes) ? log.changes : []) as EditChange[];
  const summary = changes
    .filter((c) => c.field !== "status")
    .slice(0, 2)
    .map((c) => `${c.label} ${c.from} → ${c.to}`)
    .join("；");

  const time = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(log.createdAt));

  return (
    <div className="text-sm border border-[#f1f5f9] rounded-lg p-3 bg-[#fafbfc]">
      <p className="text-[#64748b] text-xs">
        {time} · {log.editor.name}
      </p>
      <p className="text-[#111827] mt-1">{summary || "已修改订单信息"}</p>
      {log.editNote && (
        <p className="text-xs text-[#94a3b8] mt-1">原因：{log.editNote}</p>
      )}
      {changes.length > 0 && (
        <button
          type="button"
          className="text-xs text-[#2563eb] mt-2"
          onClick={() => setOpen(!open)}
        >
          {open ? "收起详情" : "展开详情"}
        </button>
      )}
      {open && (
        <ul className="mt-2 space-y-1 text-xs text-[#475569]">
          {changes.map((c) => (
            <li key={c.field}>
              {c.label}：{c.from} → {c.to}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
