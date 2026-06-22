import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function TestsPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Tests"
        title="Practice tests are not connected yet."
        description="Static test cards and fake performance trends have been removed. The page should use real attempts and scoring data."
        backendModule="tests"
      />
    </AppShell>
  );
}
