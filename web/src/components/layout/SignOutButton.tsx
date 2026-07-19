"use client";

import { signOut } from "next-auth/react";
import { NotionButton } from "@/components/ui/notion";

export function SignOutButton() {
  return (
    <NotionButton variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
      退出登录
    </NotionButton>
  );
}
