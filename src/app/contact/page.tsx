import type { Metadata } from "next";
import { EnvelopeSimple, WhatsappLogo, Phone, MapPin } from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layout/public-shell";

export const metadata: Metadata = {
  title: "Contact Us — GaugeHow",
  description: "Get in touch with the GaugeHow team by email, phone, or WhatsApp.",
};

const CHANNELS = [
  {
    icon: EnvelopeSimple,
    label: "Email us",
    detail: "Use our online chat system to message us and get support.",
    value: "info@gaugehow.com",
    href: "mailto:info@gaugehow.com",
  },
  {
    icon: WhatsappLogo,
    label: "WhatsApp",
    detail: "Let's chat — nothing better than talking to another human being.",
    value: "+91 96856 71890",
    href: "https://wa.me/919685671890",
  },
  {
    icon: Phone,
    label: "Call / Text us",
    detail: "Reach us directly on the phone.",
    value: "+91 96856 71890",
    href: "tel:+919685671890",
  },
];

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
            Contact Us
          </span>
          <h1 className="type-h1 mt-4 text-slate-950">We&apos;d love to hear from you.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
            Questions about courses, subscriptions, or refunds? Reach out through any of the channels
            below and our team will get back to you.
          </p>
        </header>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <a
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith("http") ? "_blank" : undefined}
                rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="surface-secondary flex flex-col rounded-2xl p-6 transition hover:border-orange-300 hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Icon className="size-6" weight="duotone" />
                </div>
                <h2 className="mt-4 type-h4 text-slate-950">{channel.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{channel.detail}</p>
                <p className="mt-3 text-sm font-bold text-orange-600">{channel.value}</p>
              </a>
            );
          })}
        </div>

        <section className="mt-8 flex items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-1,#fff)] p-6">
          <MapPin className="mt-0.5 size-5 shrink-0 text-orange-600" weight="duotone" />
          <div className="text-[15px] leading-7 text-slate-600">
            <p className="font-semibold text-slate-800">Messgerat Labs</p>
            <p>701, Regus, Radisson Square, Indore (Madhya Pradesh, India) 452001</p>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
