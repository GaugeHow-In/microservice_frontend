import { AuthCard } from "@/components/sections/auth-card";

export const dynamic = "force-dynamic";

export default async function OtpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  return <AuthCard mode="verify" initialEmail={params.email ?? ""} />;
}
