import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function LibraryDetailPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Library item"
        title="Library detail data is not connected yet."
        description="This page no longer renders static book fixtures. It should be wired to persisted library content before launch."
        backendModule="library"
      />
    </AppShell>
  );
}
