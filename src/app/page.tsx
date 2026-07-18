"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SpinnerGap } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";

// The apex is a bouncer, not a page. The decision has to run on the client: the
// session lives in cookies owned by the auth API's domain, so the server never
// sees it — only AuthProvider's refresh call can tell us whether it is live.
export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [isLoading, router, user]);

  return (
    <main className="premium-bg flex min-h-screen items-center justify-center">
      <SpinnerGap className="size-8 animate-spin text-orange-600" />
      <span className="sr-only">Loading your session</span>
    </main>
  );
}
