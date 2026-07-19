"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { NotionButton, NotionPanel, PageHeader, PageShell } from "@/components/ui/notion";
import { NotionPasswordInput } from "@/components/ui/NotionPasswordInput";

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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "修改失败");
        return;
      }

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
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
      <PageShell>
        <div className="max-w-md mx-auto w-full">
          <PageHeader
            title="修改密码"
            meta={isForced ? "首次登录须设置新密码后方可继续" : "修改登录密码"}
          />
          <NotionPanel className="mt-6">
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
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <NotionButton type="submit" disabled={loading} className="w-full">
                  {loading ? "保存中…" : isForced ? "保存并继续" : "保存新密码"}
                </NotionButton>
              </form>
            )}
          </NotionPanel>
        </div>
      </PageShell>
    </div>
  );
}
