"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PublicShellProps = {
  children: React.ReactNode;
};

const PUBLIC_NAV = [
  { label: "Plans", href: "/plus" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const FOOTER_LINKS = [
  { label: "Plans", href: "/plus" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

/**
 * Light marketing shell for pages anyone can visit without signing in — pricing,
 * legal, and company info. Unlike AppShell it never gates on auth, so it is safe
 * for domain-verification and public discovery.
 */
export function PublicShell({ children }: PublicShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="premium-bg flex min-h-screen flex-col">
      <header className="chrome-surface sticky top-0 z-30 rounded-none border-x-0 border-t-0 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandLogo href="/" />

          <nav className="hidden items-center gap-1 md:flex">
            {PUBLIC_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-bold transition",
                    active
                      ? "bg-[color:var(--surface-secondary)] text-slate-950"
                      : "text-slate-600 hover:bg-[color:var(--surface-secondary)] hover:text-slate-950",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
            <span className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X /> : <List />}
              </Button>
            </span>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[color:var(--border)] px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {PUBLIC_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-[color:var(--surface-secondary)]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2">
                <Button asChild variant="ghost" className="flex-1">
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/signup" onClick={() => setMenuOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      <footer className="chrome-surface rounded-none border-x-0 border-b-0">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <BrandLogo href="/" />
              <p className="mt-4 text-sm text-slate-500">
                Building the world&apos;s first dedicated Mechanical + Industry 4.0 learning
                ecosystem — practical, skill-based education that industries value.
              </p>
            </div>
            <nav className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Company</p>
              {FOOTER_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-semibold text-slate-600 transition hover:text-orange-600"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="text-sm text-slate-500">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Get in touch</p>
              <p className="mt-2">
                <a href="mailto:info@gaugehow.com" className="font-semibold text-slate-700 hover:text-orange-600">
                  info@gaugehow.com
                </a>
              </p>
              <p className="mt-1">
                <a href="tel:+919685671890" className="font-semibold text-slate-700 hover:text-orange-600">
                  +91 96856 71890
                </a>
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-[color:var(--border)] pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} GaugeHow — Messgerat Labs. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
