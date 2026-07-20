import { db } from "@/lib/db";

export async function checkDbHealth(): Promise<{ ok: boolean; hint?: string }> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    const hint =
      process.env.NODE_ENV === "production"
        ? "数据库暂不可用，请稍后重试或联系管理员"
        : "本地 PostgreSQL 未启动。请在终端执行：cd web && docker compose up -d && npm run db:push && npm run db:seed";
    return { ok: false, hint };
  }
}
