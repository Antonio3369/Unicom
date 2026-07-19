"use client";

import { signOut } from "next-auth/react";
import { NotionButton } from "@/components/ui/notion";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <NotionButton
      variant="ghost"
      className={compact ? "px-2.5 text-xs shrink-0" : "w-full sm:w-auto"}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      {compact ? "退出" : "退出登录"}
    </NotionButton>
  );
}
