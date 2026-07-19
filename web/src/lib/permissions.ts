import type { UserRole, UserStatus } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
}

export function canRoleSignIn(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "SALES";
}

export function canImportExcel(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "ADMIN";
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertUserInScope(
  accessor: SessionUser,
  targetUserId: string,
  accessibleUserIds: string[] | null
) {
  if (accessibleUserIds === null) return;
  if (accessor.id === targetUserId) return;
  if (!accessibleUserIds.includes(targetUserId)) {
    throw new PermissionError("无权访问该数据");
  }
}
