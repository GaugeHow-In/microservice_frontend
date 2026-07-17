"use client";

import { Bell, CheckCircle, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  notificationClient,
  type NotificationItem,
} from "@/lib/notification-client";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  accessToken: string | null;
};

const POLL_INTERVAL_MS = 60_000;

function relativeTime(value: string): string {
  const published = new Date(value).getTime();
  if (Number.isNaN(published)) return "";

  const minutes = Math.round((Date.now() - published) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export function NotificationBell({ accessToken }: NotificationBellProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const feed = await notificationClient.getFeed(accessToken);
      setItems(feed.items);
      setUnreadCount(feed.unread_count);
    } catch {
      // A failed refresh keeps the last good feed on screen.
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // The badge polls on its own so a broadcast shows up without a reload.
  useEffect(() => {
    if (!accessToken) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const syncCount = async () => {
      try {
        const { unread_count } = await notificationClient.getUnreadCount(accessToken);
        if (!cancelled) setUnreadCount(unread_count);
      } catch {
        // Ignore transient polling failures.
      }
    };

    void syncCount();
    const timer = window.setInterval(() => void syncCount(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessToken]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void loadFeed();
  }

  async function openItem(item: NotificationItem) {
    if (!accessToken || item.read) return;
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      const { unread_count } = await notificationClient.markRead(accessToken, item.id);
      setUnreadCount(unread_count);
    } catch {
      void loadFeed();
    }
  }

  async function dismissItem(item: NotificationItem) {
    if (!accessToken) return;
    const previous = items;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    try {
      const { unread_count } = await notificationClient.dismiss(accessToken, item.id);
      setUnreadCount(unread_count);
    } catch {
      setItems(previous);
      void loadFeed();
    }
  }

  async function markAllRead() {
    if (!accessToken) return;
    setItems((current) => current.map((entry) => ({ ...entry, read: true })));
    setUnreadCount(0);
    try {
      const { unread_count } = await notificationClient.markAllRead(accessToken);
      setUnreadCount(unread_count);
    } catch {
      void loadFeed();
    }
  }

  if (!accessToken) {
    return null;
  }

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
      >
        <Bell weight={unreadCount > 0 ? "fill" : "regular"} />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-[18px] text-white"
          >
            {badgeLabel}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="popover-surface absolute right-0 top-12 z-50 w-[min(92vw,380px)] rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="type-caption font-semibold uppercase tracking-[0.18em] text-slate-500">
              Notifications
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="type-caption cursor-pointer font-semibold text-slate-500 transition hover:text-slate-900"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="mt-3 max-h-[min(60vh,420px)] space-y-2 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="py-6 text-center type-caption text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle className="size-6 text-slate-400" />
                <p className="type-caption text-slate-500">You&apos;re all caught up.</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  // Not a <button>: the card holds a dismiss button and a link,
                  // and nesting those inside a button is invalid HTML.
                  role={item.read ? undefined : "button"}
                  tabIndex={item.read ? undefined : 0}
                  onClick={() => void openItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void openItem(item);
                    }
                  }}
                  className={cn(
                    "group relative rounded-lg p-3 text-left transition",
                    item.read ? "surface-secondary" : "cursor-pointer bg-amber-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="type-small font-semibold text-slate-950">
                      {!item.read ? (
                        <span
                          aria-hidden
                          className="mr-1.5 inline-block size-1.5 rounded-full bg-red-600 align-middle"
                        />
                      ) : null}
                      {item.title}
                    </p>
                    <button
                      type="button"
                      aria-label={`Dismiss ${item.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void dismissItem(item);
                      }}
                      className="cursor-pointer rounded p-0.5 text-slate-400 opacity-0 transition hover:text-slate-900 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  <p className="mt-1 whitespace-pre-line type-caption text-slate-600">
                    {item.body_text}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="type-caption text-slate-500">
                      {relativeTime(item.published_at)}
                    </span>
                    {item.action_url ? (
                      <a
                        href={item.action_url}
                        onClick={(event) => event.stopPropagation()}
                        className="type-caption font-semibold text-amber-700 hover:underline"
                      >
                        {item.action_label || "Open"}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
