"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { notion } from "@/components/ui/notion";

/** 可下拉选择、也可输入新后台名 */
export function BackendComboInput({
  value,
  onChange,
  options,
  placeholder = "选择或输入后台名称",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, value]);

  const showCreate =
    value.trim().length > 0 &&
    !options.some((o) => o === value.trim());

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className={`relative mt-1 ${className}`}>
      <input
        className={`${notion.input} w-full pr-9`}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        list={listId}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {/* 原生 datalist 作兜底；自定义下拉更清晰 */}
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] text-xs px-1"
        onClick={() => setOpen((v) => !v)}
        aria-label="展开后台列表"
        tabIndex={-1}
      >
        ▾
      </button>

      {open && (filtered.length > 0 || showCreate) && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[#e2e8f0] bg-white shadow-lg text-sm">
          {filtered.map((o) => (
            <li key={o}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-[#f8fafc] ${
                  o === value ? "bg-[#eff6ff] text-[#2563eb]" : "text-[#111827]"
                }`}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {o}
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-[#2563eb] hover:bg-[#eff6ff] border-t border-[#f1f5f9]"
                onClick={() => {
                  onChange(value.trim());
                  setOpen(false);
                }}
              >
                使用新后台「{value.trim()}」
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
