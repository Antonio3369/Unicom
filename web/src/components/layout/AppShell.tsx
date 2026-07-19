"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { ScrollMemory } from "@/components/layout/ScrollMemory";
import { markSidebarNavTop } from "@/lib/mainScroll";
import type { SessionUser } from "@/lib/permissions";

type NavItem = { href: string; label: string; match?: "exact" | "prefix" };

function buildNav(role: SessionUser["role"]): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: "今日待办", match: "exact" },
    { href: "/orders", label: "全部业务", match: "prefix" },
    { href: "/performance", label: "业绩复盘", match: "prefix" },
  ];
  if (role === "ADMIN") {
    items.push({ href: "/admin/import", label: "导入对账", match: "prefix" });
  }
  items.push({ href: "/settings/password", label: "修改密码", match: "exact" });
  return items;
}

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  if (item.href === "/orders") {
    if (pathname === "/orders") return true;
    if (pathname === "/orders/new" || pathname.startsWith("/orders/new?")) {
      return false;
    }
    // 详情页不高亮「全部业务」（可能从今日待办进入）
    return false;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function roleLabel(role: SessionUser["role"]) {
  return role === "ADMIN" ? "管理员" : role === "MANAGER" ? "经理" : "队员";
}

function userCaption(user: SessionUser) {
  const role = roleLabel(user.role);
  return user.name === role ? user.name : `${user.name} · ${role}`;
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = buildNav(user.role);

  return (
    <div className="h-screen overflow-hidden bg-[#f4f6f9] flex">
      <Suspense fallback={null}>
        <ScrollMemory />
      </Suspense>
      <aside className="w-56 shrink-0 border-r border-[#eef2f7] bg-white p-4 hidden md:flex md:flex-col">
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase">联通业务</p>
          <p className="font-bold text-[#111827]">运营工作台</p>
          <p className="text-xs text-[#64748b] mt-1">{userCaption(user)}</p>
        </div>
        <nav className="space-y-1 flex-1">
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => markSidebarNavTop()}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  active
                    ? "bg-[#eff6ff] text-[#2563eb] font-medium"
                    : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#2563eb]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="md:hidden shrink-0 border-b border-[#eef2f7] bg-white px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-x-auto overscroll-x-contain">
              <div className="flex gap-2 min-w-max pb-0.5">
                {nav.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => markSidebarNavTop()}
                      className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap min-h-[36px] inline-flex items-center ${
                        active
                          ? "bg-[#eff6ff] text-[#2563eb] font-medium"
                          : "text-[#64748b] bg-[#f8fafc]"
                      }`}
                    >
                      {item.href === "/settings/password" ? "改密" : item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <SignOutButton compact />
          </div>
          <p className="text-[10px] text-[#94a3b8] mt-1.5 truncate">{userCaption(user)}</p>
        </div>
        <main
          id="app-scroll"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="max-w-7xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
