import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function MentorPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="AI mentor"
        title="AI mentor is waiting for a real service."
        description="Prompt chips and mock AI responses have been removed until the mentor API is connected with authenticated context."
        backendModule="mentor"
      />
    </AppShell>
  );
}
