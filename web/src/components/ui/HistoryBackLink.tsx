"use client";

import { useRouter } from "next/navigation";
import {
  markListRestore,
  markRestoreAfterBack,
  readLastListKey,
  restoreListScroll,
  freezeScrollWrite,
} from "@/lib/mainScroll";

/**
 * 返回父页并恢复列表滚动。
 * 有站内来源时 history.back；无历史再用 fallbackHref。
 */
export function HistoryBackLink({
  label = "← 返回",
  fallbackHref = "/",
  className = "inline-block text-sm text-[#2563eb] hover:underline text-left",
}: {
  label?: string;
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();

  function goBack() {
    const lastKey = readLastListKey();
    // 详情默认 fallback 为「/」时，优先回到上次列表（避免误进全部业务）
    const dest =
      fallbackHref === "/" && lastKey ? lastKey : fallbackHref;
    const key =
      lastKey ||
      (dest
        ? (() => {
            try {
              return (
                new URL(dest, window.location.origin).pathname +
                new URL(dest, window.location.origin).search
              );
            } catch {
              return dest.split("#")[0] || "";
            }
          })()
        : "");

    if (key) {
      markListRestore(key);
      freezeScrollWrite();
    }
    markRestoreAfterBack();

    if (typeof window !== "undefined" && window.history.length > 1) {
      const start = `${window.location.pathname}${window.location.search}`;
      window.history.back();

      window.setTimeout(() => {
        if (`${window.location.pathname}${window.location.search}` === start) {
          router.replace(dest, { scroll: false });
          if (key) {
            markListRestore(key);
            markRestoreAfterBack();
            requestAnimationFrame(() => restoreListScroll(key));
          }
        }
      }, 280);
      return;
    }

    router.replace(dest, { scroll: false });
    if (key) {
      requestAnimationFrame(() => restoreListScroll(key));
    }
  }

  return (
    <button type="button" onClick={goBack} className={className}>
      {label}
    </button>
  );
}
