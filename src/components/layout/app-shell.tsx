"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Award, Bell, BookOpen, Bot, GraduationCap, Home, LogOut, Map, Menu, Search, Settings, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";
import { PointsBalance } from "@/components/shared/points-balance";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { QuickMentor } from "@/components/shared/quick-mentor";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

const platformNav = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Courses", href: "/courses", icon: GraduationCap },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Roadmaps", href: "/roadmaps", icon: Map },
  { label: "AI Mentor", href: "/mentor", icon: Bot },
  { label: "Profile", href: "/profile", icon: Award },
  { label: "Settings", href: "/settings", icon: Settings },
];

const bottomNav = platformNav.filter((item) =>
  ["/dashboard", "/courses", "/roadmaps", "/mentor", "/profile"].includes(item.href),
);

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
              "flex items-center gap-3 rounded-lg px-3 py-2.5 type-small font-semibold transition",
              active
                ? "bg-orange-50 text-orange-700 shadow-[var(--shadow-sm)]"
                : "text-slate-600 hover:bg-[color:var(--surface-secondary)] hover:text-slate-950",
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
  const router = useRouter();
  const { accessToken, user, isLoading, logout } = useAuth();
  const activeLabel =
    platformNav.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      ?.label ?? "Dashboard";
  const initials = useMemo(() => {
    const displayName = user?.display_name ?? "GaugeHow User";
    return displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.display_name]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="chrome-surface rounded-xl px-6 py-4 type-small font-semibold text-slate-600">
          Restoring your session...
        </div>
      </div>
    );
  }

  return (
    <div className="premium-bg min-h-screen bg-transparent">
      <aside className="chrome-surface fixed inset-y-0 left-0 z-30 hidden w-72 rounded-r-xl px-4 py-5 lg:block">
        <BrandLogo />
        <div className="mt-8">
          <NavLinks />
        </div>
        <div className="surface-secondary absolute bottom-5 left-4 right-4 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="type-small font-semibold text-slate-950">{user.display_name}</p>
              <p className="type-caption text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 type-caption text-slate-500">
            <span>{user.roles.length ? user.roles.join(", ") : "member"}</span>
            <button
              type="button"
              className="font-semibold text-orange-600 hover:text-orange-700"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="chrome-surface sticky top-0 z-20 rounded-b-xl border-b border-white/40">
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
                <p className="type-caption font-semibold uppercase tracking-[0.18em] text-slate-500">
                  GaugeHow
                </p>
                <p className="type-small font-semibold text-slate-950">{activeLabel}</p>
              </div>
            </div>
            <div className="surface-secondary hidden w-full max-w-md items-center gap-2 rounded-xl px-3 py-2 md:flex">
              <Search className="size-4 text-slate-400" />
              <span className="type-small text-slate-500">Search courses</span>
            </div>
            <div className="flex items-center gap-2">
              <PointsBalance accessToken={accessToken} />
              <ThemeToggle />
              <Button asChild variant="soft" size="sm">
                <Link href="/courses">
                  <GraduationCap />
                  Courses
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell />
              </Button>
              <Avatar className="hidden sm:flex">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Logout"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                <LogOut />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <nav className="chrome-surface fixed inset-x-0 bottom-0 z-30 rounded-t-xl border-t border-white/50 px-2 py-2 lg:hidden">
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
                  active
                    ? "bg-orange-50 text-orange-700 shadow-[var(--shadow-sm)]"
                    : "text-slate-500",
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
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="chrome-surface relative h-full w-80 max-w-[86vw] rounded-r-xl p-5 shadow-[var(--shadow-lg)]">
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
      <QuickMentor />
    </div>
  );
}
