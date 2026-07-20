import { LoginForm } from "@/components/auth/LoginForm";
import { checkDbHealth } from "@/lib/db-health";

/** 构建时无 DB，静态预渲染会把「数据库未启动」写死进 HTML */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const dbHealth = await checkDbHealth();
  return (
    <LoginForm dbDown={!dbHealth.ok} dbHint={dbHealth.hint} />
  );
}
