"use client";

import { useEffect, useState } from "react";
import { getMainScrollEl, scrollMainToTop } from "@/lib/mainScroll";

const SHOW_AFTER = 280;

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
    <button
      type="button"
      aria-label="回到顶部"
      onClick={() => scrollMainToTop()}
      className="fixed z-40 right-4 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] md:bottom-8 flex h-11 w-11 items-center justify-center rounded-full border border-[#e2e8f0] bg-white/95 text-[#2563eb] shadow-md backdrop-blur-sm active:scale-95 transition-transform"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
