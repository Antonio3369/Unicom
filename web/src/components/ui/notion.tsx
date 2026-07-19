import type { ReactNode } from "react";
import Link from "next/link";

export const notion = {
  page: "space-y-6 md:space-y-8",
  kicker: "text-[0.78rem] font-semibold tracking-wide uppercase text-[#94a3b8]",
  title: "text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight",
  subtitle: "text-sm text-[#64748b]",
  panel: "rounded-[14px] border border-[#eef2f7] bg-white shadow-sm",
  tableWrap:
    "rounded-[14px] border border-[#eef2f7] bg-white shadow-sm overflow-x-auto text-[#111827]",
  thead: "bg-[#f8fafc] text-[#64748b]",
  row: "border-t border-[#f1f5f9] text-[#111827] hover:bg-[#f8fafc]/60",
  input:
    "border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm bg-white w-full focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20",
  select:
    "border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20",
};

export function PageShell({ children }: { children: ReactNode }) {
  return <div className={notion.page}>{children}</div>;
}

export function PageHeader({
  title,
  kicker = "联通业务工作台",
  meta,
  actions,
}: {
  title: string;
  kicker?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="space-y-2">
        <p className={notion.kicker}>{kicker}</p>
        <h1 className={notion.title}>{title}</h1>
        {meta && <p className={notion.subtitle}>{meta}</p>}
      </div>
      {actions}
    </div>
  );
}

export function NotionPanel({
  children,
  className = "",
  padding = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`${notion.panel} ${padding ? "p-5 sm:p-6" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function NotionButton({
  children,
  type = "button",
  variant = "primary",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const variants = {
    primary: "text-white bg-[#2563eb] hover:bg-[#1d4ed8]",
    secondary: "text-[#2563eb] border border-[#bfdbfe] bg-[#eff6ff]",
    ghost: "text-[#64748b] border border-[#e2e8f0] bg-white",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function NotionLinkButton({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const variants = {
    primary: "text-white bg-[#2563eb] hover:bg-[#1d4ed8]",
    secondary: "text-[#2563eb] border border-[#bfdbfe] bg-[#eff6ff]",
    ghost: "text-[#64748b] border border-[#e2e8f0] bg-white",
  };
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "success";
  href?: string;
}) {
  const tones = {
    default: "border-[#eef2f7]",
    warn: "border-amber-200 bg-amber-50/40",
    danger: "border-rose-200 bg-rose-50/40",
    success: "border-emerald-200 bg-emerald-50/40",
  };
  const className = `${notion.panel} p-4 border ${tones[tone]} ${
    href
      ? "block transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
      : ""
  }`.trim();
  const body = (
    <>
      <p className="text-sm text-[#64748b]">{label}</p>
      <p className="text-2xl font-bold text-[#111827] mt-1">{value}</p>
      {hint && <p className="text-xs text-[#94a3b8] mt-1">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
