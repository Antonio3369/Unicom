"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  captureListScroll,
  clearListRestore,
  clearRestoreAfterBack,
  consumeSidebarNavTop,
  getMainScrollEl,
  getMainScrollTop,
  peekListRestore,
  peekRestoreAfterBack,
  readLastListKey,
  restoreListScroll,
  scrollMainToTop,
  unfreezeScrollWrite,
  writeListScroll,
} from "@/lib/mainScroll";

function listKeyFromLocation() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

function isOrderDetail(path: string) {
  return /^\/orders\/[^/]+$/.test(path) && path !== "/orders/new";
}

/**
 * 列表页滚动记忆；进详情前写入；返回时恢复。
 */
export function ScrollMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listKey = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
  const pathnameRef = useRef(pathname);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // 返回列表时恢复滚动（用 peek，避免 Strict Mode 双跑丢标记）
  useEffect(() => {
    if (isOrderDetail(pathname)) return;

    const lastKey = readLastListKey();
    const restoreKey =
      (lastKey && peekListRestore(lastKey) && lastKey) ||
      (peekListRestore(listKey) && listKey) ||
      (peekRestoreAfterBack() && (lastKey || listKey)) ||
      "";

    if (!restoreKey) {
      // 正常进入列表页时解冻
      if (!isOrderDetail(pathname)) unfreezeScrollWrite();
      return;
    }

    restoreListScroll(restoreKey);
    // 晚一点再清标记，防止 Strict Mode 第二次 effect 丢恢复
    const t = window.setTimeout(() => {
      clearListRestore(restoreKey);
      clearListRestore(listKey);
      clearRestoreAfterBack();
      unfreezeScrollWrite();
    }, 600);
    return () => window.clearTimeout(t);
  }, [listKey, pathname]);

  // 路由切换：侧栏回顶；详情进出不滚顶
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (consumeSidebarNavTop()) {
      clearRestoreAfterBack();
      scrollMainToTop();
      unfreezeScrollWrite();
      return;
    }
    if (prev === pathname) return;

    const drillToDetail = isOrderDetail(pathname) && !isOrderDetail(prev);
    const backFromDetail = isOrderDetail(prev) && !isOrderDetail(pathname);
    if (drillToDetail || backFromDetail) return;

    // 若正在恢复滚动，勿滚顶
    if (peekRestoreAfterBack() || peekListRestore(listKey) || peekListRestore(readLastListKey() || "")) {
      return;
    }

    scrollMainToTop();
    unfreezeScrollWrite();
  }, [pathname, listKey]);

  // 持续记录当前列表滚动（冻结期间跳过）
  useEffect(() => {
    if (isOrderDetail(pathname)) return;
    const el = getMainScrollEl();
    if (!el) return;
    const onScroll = () => writeListScroll(listKey, getMainScrollTop());
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [listKey, pathname]);

  // 点击进详情前捕获滚动（mousedown 更早，更稳）
  useEffect(() => {
    const onPointer = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.closest("aside")) return;

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (!isOrderDetail(url.pathname)) return;
        if (isOrderDetail(pathnameRef.current)) return;
        captureListScroll(listKeyFromLocation());
      } catch {
        /* ignore */
      }
    };
    document.addEventListener("mousedown", onPointer, true);
    document.addEventListener("click", onPointer, true);
    return () => {
      document.removeEventListener("mousedown", onPointer, true);
      document.removeEventListener("click", onPointer, true);
    };
  }, []);

  return null;
}
