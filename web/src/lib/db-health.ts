import { db } from "@/lib/db";

export async function checkDbHealth(): Promise<{ ok: boolean; hint?: string }> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return {
      ok: false,
      hint: "本地 PostgreSQL 未启动。请在终端执行：cd web && docker compose up -d && npm run db:push && npm run db:seed",
    };
  }
}
