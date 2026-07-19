import type { NextAuthConfig } from "next-auth";
import type { UserRole, UserStatus } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    role: UserRole;
    status: UserStatus;
    mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      username: string;
      name: string;
      role: UserRole;
      status: UserStatus;
      mustChangePassword: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: UserRole;
    status: UserStatus;
    mustChangePassword: boolean;
  }
}

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
      if (isPublic) return true;
      if (!auth?.user) return false;
      if (auth.user.status !== "ACTIVE") {
        return Response.redirect(new URL("/login?disabled=1", request.nextUrl));
      }
      const onChangePassword =
        pathname.startsWith("/settings/password") ||
        pathname.startsWith("/api/auth/change-password");

      if (auth.user.mustChangePassword) {
        if (!onChangePassword) {
          return Response.redirect(new URL("/settings/password", request.nextUrl));
        }
        return true;
      }
      if (pathname.startsWith("/admin") && auth.user.role !== "ADMIN") {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = user.email!;
        token.role = user.role;
        token.status = user.status;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          username: token.username,
          name: session.user?.name ?? token.username,
          email: token.username,
          role: token.role,
          status: token.status,
          mustChangePassword: token.mustChangePassword,
        },
      };
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
