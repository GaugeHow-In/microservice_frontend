import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// The apex is a bouncer, not a page: middleware normally redirects "/" before this
// renders. This is the fallback for when middleware skips the auth check (e.g. missing
// Supabase env vars), so "/" never resolves to a dead route.
export default async function Home() {
  let hasSession = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasSession = Boolean(user);
  } catch {
    hasSession = false;
  }

  redirect(hasSession ? "/dashboard" : "/login");
}
