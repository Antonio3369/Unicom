import { LoginForm } from "@/components/auth/LoginForm";
import { checkDbHealth } from "@/lib/db-health";

export default async function LoginPage() {
  const dbHealth = await checkDbHealth();
  return (
    <LoginForm dbDown={!dbHealth.ok} dbHint={dbHealth.hint} />
  );
}
