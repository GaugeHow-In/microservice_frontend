import type { ReactNode } from "react";

/**
 * Shared building blocks for the public legal / content pages (terms, privacy,
 * about, contact). Keeps typography and spacing consistent across them.
 */

export function LegalPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: ReactNode;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-[color:var(--border)] pb-6">
        <h1 className="type-h1 text-slate-950">{title}</h1>
        {intro ? <p className="mt-3 text-base text-slate-500">{intro}</p> : null}
        {updated ? (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Last updated {updated}
          </p>
        ) : null}
      </header>
      <div className="mt-8 space-y-8">{children}</div>
    </article>
  );
}

export function LegalSection({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      {heading ? <h2 className="type-h3 text-slate-950">{heading}</h2> : null}
      <div className="space-y-3 text-[15px] leading-7 text-slate-600">{children}</div>
    </section>
  );
}
