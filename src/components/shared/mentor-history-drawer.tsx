"use client";

import { ChatCenteredText, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/ai-client";

type MentorHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function MentorHistoryDrawer({
  open,
  onClose,
  conversations,
  loading,
  activeId,
  onSelect,
  onDelete,
}: MentorHistoryDrawerProps) {
  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition-opacity"
          aria-label="Close history"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "chrome-surface fixed right-0 top-0 z-50 flex h-screen w-80 max-w-[86vw] flex-col rounded-none border-y-0 border-r-0 p-4 shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between pb-3">
          <p className="type-small font-bold text-slate-950">History</p>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close history">
            <X />
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {loading && (
            <p className="px-2 py-6 text-center text-sm text-slate-400">Loading…</p>
          )}
          {!loading && conversations.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-400">
              No conversations yet — ask something to get started.
            </p>
          )}
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition",
                activeId === conversation.id
                  ? "bg-orange-50 text-orange-700"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <ChatCenteredText className="size-4 shrink-0 opacity-60" />
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold">{conversation.title}</p>
                <p className="text-xs text-slate-400">
                  {formatRelativeTime(conversation.updated_at)} · {conversation.message_count} messages
                </p>
              </button>
              <button
                type="button"
                onClick={() => onDelete(conversation.id)}
                aria-label={`Delete ${conversation.title}`}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              >
                <Trash className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
