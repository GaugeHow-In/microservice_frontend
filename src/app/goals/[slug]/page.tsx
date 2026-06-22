import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function GoalDetailPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Goal workspace"
        title="Goal details are not connected yet."
        description="This route no longer reads static goal fixtures. It should be wired to the goals API before showing user-specific milestones."
        backendModule="goals"
      />
    </AppShell>
  );
}
