"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";
import { bottomNav, platformNav, student } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {platformNav.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-orange-50 text-orange-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const activeLabel =
    platformNav.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      ?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <BrandLogo />
        <div className="mt-8">
          <NavLinks />
        </div>
        <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{student.avatar}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-950">{student.name}</p>
              <p className="text-xs text-slate-500">Level {student.level}</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${(student.xp / student.nextLevelXp) * 100}%` }}
            />
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  GaugeHow
                </p>
                <p className="font-semibold text-slate-950">{activeLabel}</p>
              </div>
            </div>
            <div className="hidden w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="size-4 text-slate-400" />
              <span className="text-sm text-slate-500">
                Search courses, notes, books, tests
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="soft" size="sm">
                <Link href="/mentor">
                  <Sparkles />
                  AI
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell />
              </Button>
              <Avatar className="hidden sm:flex">
                <AvatarFallback>{student.avatar}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold",
                  active ? "bg-orange-50 text-orange-700" : "text-slate-500",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/30"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative h-full w-80 max-w-[86vw] border-r border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <BrandLogo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <div className="mt-8">
              <NavLinks onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

