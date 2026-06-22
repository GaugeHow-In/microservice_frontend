import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function RoadmapsPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Roadmaps"
        title="Roadmaps need backend-backed plans."
        description="Static roadmap cards have been removed. Connect roadmap templates, steps, and progress before exposing this module."
        backendModule="roadmaps"
      />
    </AppShell>
  );
}
