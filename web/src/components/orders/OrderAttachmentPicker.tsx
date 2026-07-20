"use client";

import { useRef } from "react";
import { notion } from "@/components/ui/notion";
import { ATTACHMENT_MAX_COUNT } from "@/lib/order-attachments";

export function OrderAttachmentPicker({
  label,
  hint,
  files,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = [...files, ...Array.from(list)].slice(0, ATTACHMENT_MAX_COUNT);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-[#94a3b8]">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div
            key={`${f.name}-${i}`}
            className="relative w-20 h-20 rounded-lg border border-[#e2e8f0] overflow-hidden bg-[#f8fafc]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(f)}
              alt={f.name}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white text-xs"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {files.length < ATTACHMENT_MAX_COUNT && !disabled && (
          <button
            type="button"
            className="w-20 h-20 rounded-lg border border-dashed border-[#cbd5e1] text-[#94a3b8] text-2xl"
            onClick={() => inputRef.current?.click()}
          >
            +
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-[#94a3b8]">
        已选 {files.length}/{ATTACHMENT_MAX_COUNT} 张（至少 1 张）
      </p>
    </div>
  );
}

export function OrderAttachmentGallery({
  attachments,
  orderId,
}: {
  orderId: string;
  attachments: {
    id: string;
    kind: string;
    fileName: string;
  }[];
}) {
  if (!attachments.length) return null;

  const activation = attachments.filter((a) => a.kind === "ACTIVATION");
  const refund = attachments.filter((a) => a.kind === "REFUND");

  return (
    <div className="space-y-3 border-t border-[#f1f5f9] pt-3">
      {activation.length > 0 && (
        <AttachmentGroup title="激活凭证" orderId={orderId} items={activation} />
      )}
      {refund.length > 0 && (
        <AttachmentGroup title="退单沟通记录" orderId={orderId} items={refund} />
      )}
    </div>
  );
}

function AttachmentGroup({
  title,
  orderId,
  items,
}: {
  title: string;
  orderId: string;
  items: { id: string; fileName: string }[];
}) {
  return (
    <div>
      <p className="text-sm text-[#64748b] mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((a) => (
          <a
            key={a.id}
            href={`/api/orders/${orderId}/attachments/${a.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-20 h-20 rounded-lg border border-[#e2e8f0] overflow-hidden bg-[#f8fafc]"
            title={a.fileName}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/orders/${orderId}/attachments/${a.id}`}
              alt={a.fileName}
              className="w-full h-full object-cover"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
