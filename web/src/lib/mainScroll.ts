/** 主滚动在 #app-scroll，返回列表时恢复位置 */

export const APP_SCROLL_SELECTOR = "#app-scroll";

const LIST_SCROLL_PREFIX = "unicom:list-scroll:";
const RESTORE_FLAG_PREFIX = "unicom:restore:";
const LAST_LIST_KEY = "unicom:last-list-key";
const RESTORE_AFTER_BACK = "unicom:restore-after-back";
const SIDEBAR_NAV_TOP = "unicom:sidebar-nav-top";
const SCROLL_FROZEN = "unicom:scroll-frozen";

export function getMainScrollEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(APP_SCROLL_SELECTOR);
}

export function getMainScrollTop(): number {
  const el = getMainScrollEl();
  if (el) return el.scrollTop;
  return window.scrollY || 0;
}

export function scrollMainTo(top: number) {
  const y = Math.max(0, Math.round(top));
  const el = getMainScrollEl();
  if (el) {
    el.scrollTop = y;
    return;
  }
  window.scrollTo(0, y);
}

export function scrollMainToTop() {
  scrollMainTo(0);
}

/** 进详情后冻结写入，避免列表卸载把 scrollTop=0 写进缓存 */
export function freezeScrollWrite() {
  try {
    sessionStorage.setItem(SCROLL_FROZEN, "1");
  } catch {
    /* ignore */
  }
}

export function unfreezeScrollWrite() {
  try {
    sessionStorage.removeItem(SCROLL_FROZEN);
  } catch {
    /* ignore */
  }
}

export function isScrollWriteFrozen(): boolean {
  try {
    return sessionStorage.getItem(SCROLL_FROZEN) === "1";
  } catch {
    return false;
  }
}

export function writeListScroll(listKey: string, y: number) {
  if (isScrollWriteFrozen()) return;
  // 冻结窗口外：也不要用 0 覆盖已有较大位置（卸载瞬间常见）
  if (y <= 0) {
    const prev = readListScroll(listKey);
    if (prev > 0) return;
  }
  try {
    sessionStorage.setItem(`${LIST_SCROLL_PREFIX}${listKey}`, String(y));
  } catch {
    /* ignore */
  }
}

export function readListScroll(listKey: string): number {
  try {
    const raw = sessionStorage.getItem(`${LIST_SCROLL_PREFIX}${listKey}`);
    const y = raw == null ? 0 : Number(raw);
    return Number.isFinite(y) ? y : 0;
  } catch {
    return 0;
  }
}

export function markListRestore(listKey: string) {
  try {
    sessionStorage.setItem(`${RESTORE_FLAG_PREFIX}${listKey}`, "1");
  } catch {
    /* ignore */
  }
}

export function peekListRestore(listKey: string): boolean {
  try {
    return sessionStorage.getItem(`${RESTORE_FLAG_PREFIX}${listKey}`) === "1";
  } catch {
    return false;
  }
}

export function clearListRestore(listKey: string) {
  try {
    sessionStorage.removeItem(`${RESTORE_FLAG_PREFIX}${listKey}`);
  } catch {
    /* ignore */
  }
}

export function writeLastListKey(listKey: string) {
  try {
    sessionStorage.setItem(LAST_LIST_KEY, listKey);
  } catch {
    /* ignore */
  }
}

export function readLastListKey(): string | null {
  try {
    return sessionStorage.getItem(LAST_LIST_KEY);
  } catch {
    return null;
  }
}

export function markRestoreAfterBack() {
  try {
    sessionStorage.setItem(RESTORE_AFTER_BACK, "1");
  } catch {
    /* ignore */
  }
}

export function peekRestoreAfterBack(): boolean {
  try {
    return sessionStorage.getItem(RESTORE_AFTER_BACK) === "1";
  } catch {
    return false;
  }
}

export function clearRestoreAfterBack() {
  try {
    sessionStorage.removeItem(RESTORE_AFTER_BACK);
  } catch {
    /* ignore */
  }
}

export function markSidebarNavTop() {
  try {
    sessionStorage.setItem(SIDEBAR_NAV_TOP, "1");
  } catch {
    /* ignore */
  }
}

export function consumeSidebarNavTop(): boolean {
  try {
    if (sessionStorage.getItem(SIDEBAR_NAV_TOP) !== "1") return false;
    sessionStorage.removeItem(SIDEBAR_NAV_TOP);
    return true;
  } catch {
    return false;
  }
}

/** 进入详情前记下当前列表滚动，并冻结后续 0 覆盖 */
export function captureListScroll(listKey?: string) {
  const key =
    listKey ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "");
  if (!key) return;
  const y = getMainScrollTop();
  // 先解冻再写真实位置
  unfreezeScrollWrite();
  try {
    sessionStorage.setItem(`${LIST_SCROLL_PREFIX}${key}`, String(y));
  } catch {
    /* ignore */
  }
  writeLastListKey(key);
  freezeScrollWrite();
}

export function restoreListScroll(listKey: string) {
  const y = readListScroll(listKey);
  if (y <= 0) return;
  const apply = () => scrollMainTo(y);
  apply();
  requestAnimationFrame(apply);
  window.setTimeout(apply, 50);
  window.setTimeout(apply, 120);
  window.setTimeout(apply, 250);
  window.setTimeout(apply, 500);
}
