import Link from "next/link";
import { ArrowLeft, Compass, Gauge } from "@phosphor-icons/react/dist/ssr";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="premium-bg flex min-h-screen flex-col px-4 py-8 sm:px-6">
      <BrandLogo />

      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-8 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="select-none text-[7rem] font-extrabold leading-none tracking-tight text-slate-950/10 sm:text-[10rem]"
          >
            404
          </span>
          <span className="absolute flex size-20 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-[var(--shadow-md)] sm:size-24">
            <Gauge className="size-10 sm:size-12" />
          </span>
        </div>

        <h1 className="max-w-xl text-2xl font-extrabold text-slate-950 sm:text-3xl">
          This page went off the gauge.
        </h1>
        <p className="mt-3 max-w-md text-base text-slate-500">
          Don&apos;t worry &mdash; nothing&apos;s broken on your end. The page you&apos;re after
          moved, retired, or never quite existed. Your progress is safe and sound. You got this.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft />
              Back to dashboard
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/courses">
              <Compass />
              Browse courses
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
