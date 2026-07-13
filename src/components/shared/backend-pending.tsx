import Link from "next/link";
import { ArrowRight, Database, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type BackendPendingProps = {
  eyebrow: string;
  title: string;
  description: string;
  backendModule: string;
};

export function BackendPending({
  eyebrow,
  title,
  description,
  backendModule,
}: BackendPendingProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <Button asChild>
            <Link href="/courses">
              <GraduationCap />
              Open live courses
            </Link>
          </Button>
        }
      />
      <div className="data-panel reveal-delay-1 reveal-up grid gap-6 overflow-hidden rounded-2xl bg-[color:var(--surface-secondary)] p-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative z-10 space-y-4">
          <div className="signal-line flex size-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Database className="size-6" />
          </div>
          <div>
            <h2 className="type-h3 text-slate-950">No mock data is rendered here.</h2>
            <p className="mt-2 type-body text-slate-600">
              The `{backendModule}` backend is not connected to this screen yet, so this route
              stays empty instead of showing fake records.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/courses">
              Continue with real course data
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="relative z-10 space-y-3 rounded-2xl bg-[color:var(--surface-primary)] p-4">
          <Skeleton className="h-8 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <div className="grid gap-3 pt-3 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
