"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NotionButton, NotionPanel, PageHeader, PageShell, notion } from "@/components/ui/notion";
import { NotionPasswordInput } from "@/components/ui/NotionPasswordInput";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("登录名或密码错误");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <PageShell>
        <div className="max-w-md mx-auto w-full">
          <PageHeader title="登录" meta="联通业务工作台 · 罗湖试点" />
          <NotionPanel className="mt-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm text-[#64748b]">登录名</span>
                <input
                  className={notion.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / linhao / zhoujie"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-[#64748b]">密码</span>
                <NotionPasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <NotionButton type="submit" disabled={loading} className="w-full">
                {loading ? "登录中…" : "登录"}
              </NotionButton>
              <p className="text-xs text-[#94a3b8]">开发默认密码：123456</p>
            </form>
          </NotionPanel>
        </div>
      </PageShell>
    </div>
  );
}
