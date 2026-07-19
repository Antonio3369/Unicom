"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { NotionButton, NotionPanel, NotionAlert } from "@/components/ui/notion";
import { NotionPasswordInput } from "@/components/ui/NotionPasswordInput";
import { readApiError, networkErrorMessage } from "@/lib/api-error";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  // 锁定首登模式，避免改密成功后父级重渲染把 forced 打成 false
  const [isForced] = useState(forced);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneHint, setDoneHint] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDoneHint("");

    if (!isForced && !currentPassword) {
      setError("请输入当前密码");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: isForced ? undefined : currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res, "修改失败"));
        return;
      }
      const data = await res.json();

      // 首登：用新密码静默重登，刷新 JWT，避免中间件再挡回改密页（Ali 同款）
      if (isForced || data.forced) {
        setDoneHint("密码已更新，正在进入系统…");
        const username = data.username as string | undefined;
        if (username) {
          const result = await signIn("credentials", {
            username,
            password: newPassword,
            redirect: false,
          });
          if (!result?.error) {
            window.location.href = "/";
            return;
          }
        }
        await signOut({ redirect: false });
        window.location.href = "/login?passwordChanged=1";
        return;
      }

      setDoneHint("密码已更新，请使用新密码重新登录");
      await signOut({ redirect: false });
      window.location.href = "/login?passwordChanged=1";
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f6f9] flex items-center justify-center px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto w-full">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-wide uppercase text-[#94a3b8]">
            联通业务工作台
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mt-1">
            修改密码
          </h1>
          {isForced && (
            <p className="text-sm text-[#64748b] mt-2">首次登录须设置新密码后方可继续</p>
          )}
        </div>
        <NotionPanel>
            {doneHint ? (
              <p className="text-sm text-emerald-700">{doneHint}</p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {!isForced && (
                  <label className="block space-y-1">
                    <span className="text-sm text-[#64748b]">当前密码</span>
                    <NotionPasswordInput
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </label>
                )}
                <label className="block space-y-1">
                  <span className="text-sm text-[#64748b]">新密码</span>
                  <NotionPasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm text-[#64748b]">确认新密码</span>
                  <NotionPasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    autoComplete="new-password"
                    required
                  />
                </label>
                {error && <NotionAlert tone="error">{error}</NotionAlert>}
                <NotionButton type="submit" disabled={loading} className="w-full">
                  {loading ? "保存中…" : isForced ? "保存并继续" : "保存新密码"}
                </NotionButton>
              </form>
            )}
          </NotionPanel>
        </div>
    </div>
  );
}
