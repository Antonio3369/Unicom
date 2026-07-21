import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return <ChangePasswordForm forced={user.mustChangePassword} embedded />;
}
