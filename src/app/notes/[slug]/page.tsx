import { AppShell } from "@/components/layout/app-shell";
import { BackendPending } from "@/components/shared/backend-pending";

export default function NoteReaderPage() {
  return (
    <AppShell>
      <BackendPending
        eyebrow="Note reader"
        title="Note content is not available from the backend yet."
        description="The static note reader has been removed so users do not see fake content or fake reading progress."
        backendModule="notes"
      />
    </AppShell>
  );
}
