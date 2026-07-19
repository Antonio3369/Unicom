"use client";

import { StatCard } from "@/components/ui/notion";
import { getMainScrollEl } from "@/lib/mainScroll";

function scrollMainToId(id: string) {
  const target = document.getElementById(id);
  const scroller = getMainScrollEl();
  if (!target) return;
  if (!scroller) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const top =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    12;
  scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function QueueStatCard({
  targetId,
  label,
  value,
  hint,
  tone = "default",
}: {
  targetId: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "success";
}) {
  return (
    <button
      type="button"
      onClick={() => scrollMainToId(targetId)}
      className="text-left w-full rounded-[14px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] [&>div]:transition-shadow hover:[&>div]:shadow-md"
    >
      <StatCard label={label} value={value} hint={hint} tone={tone} />
    </button>
  );
}
