import { AuthCard } from "@/components/sections/auth-card";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  return <AuthCard mode="verify" initialEmail={params.email ?? ""} />;
}
