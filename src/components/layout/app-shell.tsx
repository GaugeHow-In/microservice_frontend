"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Briefcase, ClipboardText, Gear, GraduationCap, House, List, MapTrifold, Medal, SignOut, Sparkle, User, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlusAvatar, PlusBadge } from "@/components/shared/plus-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIMark } from "@/components/shared/ai-mark";
import { BrandLogo } from "@/components/shared/brand-logo";
import { LogoutDialog } from "@/components/shared/logout-dialog";
import { NotificationBell } from "@/components/shared/notification-bell";
import { PointsBalance } from "@/components/shared/points-balance";
import { QuickMentor } from "@/components/shared/quick-mentor";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getProfileAvatar } from "@/lib/profile-avatars";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

const platformNav = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Courses", href: "/courses", icon: GraduationCap },
  { label: "Tests", href: "/tests", icon: ClipboardText },
  { label: "Library", href: "/library", icon: BookOpen },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Roadmaps", href: "/roadmaps", icon: MapTrifold },
  { label: "AI Mentor", href: "/mentor", icon: AIMark },
  { label: "Profile", href: "/profile", icon: Medal },
  { label: "Settings", href: "/settings", icon: Gear },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
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
              "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition",
              active
                ? "bg-[color:var(--surface-secondary)] text-slate-950"
                : "text-slate-600 hover:bg-[color:var(--surface-secondary)] hover:text-slate-950",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, user, isLoading } = useAuth();
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
  const isPlus = Boolean(user?.subscription?.is_plus);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  // Opening the dialog straight from the menu item leaves the closing menu and
  // the opening dialog fighting over focus and the scroll lock, which can strand
  // `pointer-events: none` on <body> and freeze the page. Letting the menu
  // finish closing first keeps the two from overlapping.
  const requestLogout = useCallback(() => {
    window.setTimeout(() => setLogoutOpen(true), 0);
  }, []);

  if (isLoading || !user) {
    return (
      <div className="premium-bg flex min-h-screen items-center justify-center">
        <div className="chrome-surface rounded-xl px-6 py-4 text-sm font-bold text-slate-600">
          Restoring your session...
        </div>
      </div>
    );
  }

  const avatarImage = selectedAvatar ? (
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
  );

  const account = (
    <div className="surface-secondary rounded-xl p-4">
      <div className="flex items-center gap-3">
        <Avatar>{avatarImage}</Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">Welcome back</p>
          <p className="truncate text-xs text-slate-500">{user.display_name}</p>
        </div>
      </div>
      <button
        type="button"
        className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-bold text-orange-600 transition hover:text-orange-700"
        onClick={() => {
          setDrawerOpen(false);
          setLogoutOpen(true);
        }}
      >
        <SignOut className="size-4" />
        Logout
      </button>
    </div>
  );

  return (
    <div className="premium-bg min-h-screen lg:flex">
      {drawerOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition-opacity lg:hidden"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        data-drawer-open={drawerOpen}
        className={cn(
          "chrome-surface fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[86vw] shrink-0 flex-col rounded-none border-y-0 border-l-0 p-5 shadow-2xl",
          // `visibility` rides along in the transition so the drawer stays
          // visible while sliding out, then drops out of the tab order.
          "transition-[transform,visibility] duration-300 ease-out",
          "lg:sticky lg:z-30 lg:w-72 lg:max-w-none lg:translate-x-0 lg:visible lg:shadow-none",
          drawerOpen ? "translate-x-0" : "invisible -translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-3">
          {/* Theme-aware wordmark: the source PNGs carry generous transparent
              padding, so negative margins pull the visible mark back to a
              compact header height. */}
          <span className="relative block">
            <Image
              src="/GaugeHow logo transperent black.png"
              alt="GaugeHow"
              width={500}
              height={250}
              priority
              className="-my-6 w-40 [.dark_&]:hidden"
            />
            <Image
              src="/GaugeHow logo transperent white.png"
              alt="GaugeHow"
              width={500}
              height={250}
              priority
              className="-my-6 hidden w-40 [.dark_&]:block"
            />
          </span>
          {/* Responsive display classes go on wrappers, never on <Button>:
              .btn-base sets `display` from unlayered CSS, which outranks every
              Tailwind display utility no matter the breakpoint. */}
          <span className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
            >
              <X />
            </Button>
          </span>
        </div>
        <div className="mt-8">
          <NavLinks onNavigate={() => setDrawerOpen(false)} />
        </div>
        <div className="mt-auto">{account}</div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="chrome-surface sticky top-0 z-30 rounded-none border-x-0 border-t-0 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open navigation"
                >
                  <List />
                </Button>
              </span>
              <div className="hidden sm:block lg:hidden">
                <BrandLogo compact href="/dashboard" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">GaugeHow</p>
                <p className="text-sm font-bold text-slate-950">{activeLabel}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <PointsBalance accessToken={accessToken} />
              <ThemeToggle />
              <NotificationBell accessToken={accessToken} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden cursor-pointer rounded-full transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring-focus)] data-[state=open]:ring-4 data-[state=open]:ring-[color:var(--ring-focus)] sm:block"
                    aria-label="Open account menu"
                  >
                    <PlusAvatar isPlus={isPlus}>
                      <Avatar>{avatarImage}</Avatar>
                    </PlusAvatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-950">{user.display_name}</p>
                      {isPlus && <PlusBadge />}
                    </div>
                    <p className="truncate text-xs font-medium text-slate-500">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Gear />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/plus">
                      <Sparkle weight={isPlus ? "fill" : "regular"} />
                      {isPlus ? "Manage Plus" : "Get GaugeHow-Plus"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="warning" onSelect={requestLogout}>
                    <SignOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />

      {pathname !== "/mentor" && <QuickMentor />}
    </div>
  );
}
