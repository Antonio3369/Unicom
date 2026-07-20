import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";
import { canRoleSignIn } from "@/lib/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = user.email!;
        token.role = user.role;
        token.status = user.status;
        token.mustChangePassword = user.mustChangePassword;
        return token;
      }

      // 与 DB 同步 mustChangePassword，避免改密后 JWT 仍卡在强制改密
      if (token.id) {
        try {
          const live = await db.user.findUnique({
            where: { id: token.id as string },
            select: { status: true, mustChangePassword: true },
          });
          if (live) {
            token.status = live.status;
            token.mustChangePassword = live.mustChangePassword;
          }
        } catch {
          // DB 暂不可用时保留 token
        }
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "登录名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        let user;
        try {
          user = await db.user.findUnique({ where: { username } });
        } catch {
          throw new Error("DatabaseUnavailable");
        }
        if (!user || !user.passwordHash || user.status !== "ACTIVE") return null;
        if (!canRoleSignIn(user.role)) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.username,
          role: user.role,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
