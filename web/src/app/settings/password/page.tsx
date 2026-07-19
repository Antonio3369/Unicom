import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { redirect } from "next/navigation";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <ChangePasswordForm forced={session.user.mustChangePassword} />;
}
