import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/permissions";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("未登录");
  return user;
}
