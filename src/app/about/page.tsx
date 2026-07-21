import type { Metadata } from "next";
import Link from "next/link";
import { Target, Eye, MapPin, LinkedinLogo, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layout/public-shell";

export const metadata: Metadata = {
  title: "About Us — GaugeHow",
  description:
    "GaugeHow by Messgerat Labs is building the world’s first dedicated Mechanical + Industry 4.0 learning ecosystem.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
            About GaugeHow
          </span>
          <h1 className="type-h1 mt-4 text-slate-950">
            Making mechanical education as practical as software learning.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
            After realizing the gap between classroom learning and industrial skills, GaugeHow was
            born to help engineers become industry-ready faster. Today, we&apos;re building the
            world&apos;s first dedicated Mechanical + Industry 4.0 learning ecosystem.
          </p>
        </header>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="surface-secondary rounded-2xl p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Target className="size-6" weight="duotone" />
            </div>
            <h2 className="mt-4 type-h4 text-slate-950">Our Mission</h2>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">
              To make mechanical education as innovative and practical as software learning.
            </p>
          </div>
          <div className="surface-secondary rounded-2xl p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Eye className="size-6" weight="duotone" />
            </div>
            <h2 className="mt-4 type-h4 text-slate-950">Our Vision</h2>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">
              To replace outdated theoretical education with skill-based learning that industries
              truly value.
            </p>
          </div>
        </div>

        <section className="mt-12 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-1,#fff)] p-6 sm:p-8">
          <h2 className="type-h3 text-slate-950">Messgerat Labs</h2>
          <p className="mt-2 text-[15px] leading-7 text-slate-600">
            GaugeHow is a product of Messgerat Labs, founded by Deepak S. Choudhary.
          </p>
          <dl className="mt-6 space-y-4 text-[15px] text-slate-600">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-orange-600" weight="duotone" />
              <dd>
                701, Regus, Radisson Square, Indore (Madhya Pradesh, India) 452001
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <EnvelopeSimple className="mt-0.5 size-5 shrink-0 text-orange-600" weight="duotone" />
              <dd>
                <a href="mailto:info@gaugehow.com" className="font-semibold text-slate-800 hover:text-orange-600">
                  info@gaugehow.com
                </a>
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <LinkedinLogo className="mt-0.5 size-5 shrink-0 text-orange-600" weight="duotone" />
              <dd>
                <a
                  href="https://www.linkedin.com/in/deepc27/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-800 hover:text-orange-600"
                >
                  Deepak S. Choudhary — LinkedIn
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Have a question? Head over to our{" "}
            <Link href="/contact" className="font-semibold text-orange-600 hover:text-orange-700">
              Contact page
            </Link>
            .
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
