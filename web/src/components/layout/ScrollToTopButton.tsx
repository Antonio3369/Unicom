"use client";

import { useEffect, useState } from "react";
import { getMainScrollEl, scrollMainToTop } from "@/lib/mainScroll";

const SHOW_AFTER = 200;

function TopIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = getMainScrollEl();
    if (!el) return;

    const onScroll = () => setVisible(el.scrollTop > SHOW_AFTER);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        aria-label="回到顶部"
        onClick={() => scrollMainToTop()}
        className="md:hidden fixed z-50 right-3 top-[max(5.75rem,calc(env(safe-area-inset-top,0px)+5rem))] inline-flex items-center gap-1 rounded-full border border-[#dbeafe] bg-white/95 px-3 py-2 text-xs font-medium text-[#2563eb] shadow-md backdrop-blur-sm active:scale-95 transition-transform"
      >
        <TopIcon />
        顶部
      </button>
      <button
        type="button"
        aria-label="回到顶部"
        onClick={() => scrollMainToTop()}
        className="hidden md:flex fixed z-40 right-8 bottom-8 h-11 w-11 items-center justify-center rounded-full border border-[#e2e8f0] bg-white/95 text-[#2563eb] shadow-md backdrop-blur-sm active:scale-95 transition-transform"
      >
        <TopIcon />
      </button>
    </>
  );
}
