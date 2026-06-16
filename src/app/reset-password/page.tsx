import { AuthCard } from "@/components/sections/auth-card";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  return <AuthCard mode="reset" initialEmail={params.email ?? ""} />;
}
