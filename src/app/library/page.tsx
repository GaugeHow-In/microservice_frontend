import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function LibraryPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Library"
        title="Library records are not connected yet."
        description="Books, saved resources, and reading state will return after the library API is implemented."
        backendModule="library"
      />
    </AppShell>
  );
}
