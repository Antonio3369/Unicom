"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { NotionButton, NotionPanel, notion, NotionAlert } from "@/components/ui/notion";
import { NotionPasswordInput } from "@/components/ui/NotionPasswordInput";

function loginErrorMessage(code: string | null): string {
  switch (code) {
    case "CredentialsSignin":
      return "登录名或密码错误";
    case "Configuration":
      return "登录服务异常（多为本地数据库未启动）";
    default:
      return code ? "登录失败，请重试" : "";
  }
}

function LoginFormInner({ dbDown, dbHint }: { dbDown?: boolean; dbHint?: string }) {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const msg = loginErrorMessage(searchParams.get("error"));
    if (msg) setError(msg);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const name = username.trim();
    if (!name || !password) {
      setError("请输入登录名和密码");
      setLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        username: name,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (res?.error) {
        const msg = loginErrorMessage(res.error);
        setError(
          msg ||
            (dbDown && dbHint
              ? dbHint
              : "登录失败，请重试")
        );
        setLoading(false);
        return;
      }

      if (!res?.ok) {
        setError(dbDown && dbHint ? dbHint : "登录名或密码错误");
        setLoading(false);
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      if (!session?.user?.id) {
        setError(
          dbHint ??
            "登录未生效，请确认本地数据库已启动（docker compose up -d && npm run db:push）"
        );
        setLoading(false);
        return;
      }

      window.location.assign("/");
    } catch {
      setError("网络异常，请确认 WiFi 与开发服务正常");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f6f9] flex items-center justify-center px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto w-full">
        <div className="mb-6 text-center sm:text-left">
          <p className="text-xs font-semibold tracking-wide uppercase text-[#94a3b8]">
            联通业务工作台
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mt-1">
            登录
          </h1>
        </div>
        <NotionPanel>
          <form onSubmit={onSubmit} className="space-y-4">
            {dbDown && dbHint && <NotionAlert tone="error">{dbHint}</NotionAlert>}
            <label className="block space-y-1">
              <span className="text-sm text-[#64748b]">登录名</span>
              <input
                className={notion.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin / linhao / zhoujie"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-[#64748b]">密码</span>
              <NotionPasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                enterKeyHint="go"
              />
            </label>
            {error && <NotionAlert tone="error">{error}</NotionAlert>}
            <NotionButton type="submit" disabled={loading} className="w-full">
              {loading ? "登录中…" : "登录"}
            </NotionButton>
            <p className="text-xs text-[#94a3b8] text-center sm:text-left">
              开发默认密码：123456
            </p>
          </form>
        </NotionPanel>
      </div>
    </div>
  );
}

export function LoginForm({
  dbDown,
  dbHint,
}: {
  dbDown?: boolean;
  dbHint?: string;
}) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner dbDown={dbDown} dbHint={dbHint} />
    </Suspense>
  );
}
