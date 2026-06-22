import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function NotesPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Notes platform"
        title="Notes need a live content API."
        description="Search, highlights, bookmarks, and reading progress have been hidden until notes persistence is connected."
        backendModule="notes"
      />
    </AppShell>
  );
}
