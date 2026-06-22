import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function GoalsPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Goal system"
        title="Goals are waiting for the real backend."
        description="Goal lists, milestones, timelines, and AI suggestions will render here after the goals API is connected."
        backendModule="goals"
      />
    </AppShell>
  );
}
