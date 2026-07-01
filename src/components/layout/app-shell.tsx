"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  Bell,
  BookOpen,
  Bot,
  ClipboardCheck,
  GraduationCap,
  Home,
  LogOut,
  Map,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";
import { PointsBalance } from "@/components/shared/points-balance";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { QuickMentor } from "@/components/shared/quick-mentor";
import { getProfileAvatar } from "@/lib/profile-avatars";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

const platformNav = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Courses", href: "/courses", icon: GraduationCap },
  { label: "Tests", href: "/tests", icon: ClipboardCheck },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Roadmaps", href: "/roadmaps", icon: Map },
  { label: "AI Mentor", href: "/mentor", icon: Bot },
  { label: "Profile", href: "/profile", icon: Award },
  { label: "Settings", href: "/settings", icon: Settings },
];

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
  const selectedAvatar = getProfileAvatar(user?.profile?.avatar_key);

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
      <div>
        <header className="chrome-surface sticky top-0 z-20 rounded-b-xl border-b border-white/40">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
              <div className="hidden sm:block">
                <BrandLogo />
              </div>
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
                {selectedAvatar ? (
                  <Image
                    src={selectedAvatar.url}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <AvatarFallback>{initials}</AvatarFallback>
                )}
              </Avatar>
              <span className="hidden max-w-36 truncate type-small font-semibold text-slate-950 md:inline">
                {user.display_name}
              </span>
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

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
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
            <div className="surface-secondary absolute bottom-5 left-5 right-5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  {selectedAvatar ? (
                    <Image
                      src={selectedAvatar.url}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate type-small font-semibold text-slate-950">{user.display_name}</p>
                  <p className="truncate type-caption text-slate-500">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 font-semibold text-orange-600 hover:text-orange-700"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
      <QuickMentor />
    </div>
  );
}
