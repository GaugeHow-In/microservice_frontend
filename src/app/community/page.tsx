import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function CommunityPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Community"
        title="Community feed is not live yet."
        description="Mock posts have been removed. Discussions should come from persisted threads and moderation state."
        backendModule="community"
      />
    </AppShell>
  );
}
