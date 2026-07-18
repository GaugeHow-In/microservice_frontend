"use client";

import Link from "next/link";
import { BookOpen, Check, Coins, SpinnerGap } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { libraryClient, type LibraryDocumentCatalogItem } from "@/lib/library-client";
import { cn } from "@/lib/utils";

type LibraryRowProps = {
  document: LibraryDocumentCatalogItem;
  accessToken: string | null;
  onRedeemed?: (slug: string) => void;
};

function meta(document: LibraryDocumentCatalogItem): string[] {
  const parts: string[] = [];
  if (document.category) parts.push(document.category.name);
  if (document.author_name) parts.push(document.author_name);
  if (document.page_count) parts.push(`${document.page_count} pages`);
  if (document.estimated_read_minutes) parts.push(`${document.estimated_read_minutes} min`);
  return parts;
}

export function LibraryRow({ document, accessToken, onRedeemed }: LibraryRowProps) {
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlocked = document.has_access;
  const percent = document.progress?.progress_percent ?? 0;
  const redeemable = !unlocked && document.points_price !== null;

  async function redeem() {
    if (!accessToken || redeeming) return;
    setRedeeming(true);
    setError(null);
    try {
      await libraryClient.redeemWithPoints(document.slug, accessToken);
      onRedeemed?.(document.slug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not redeem.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="flex items-start gap-4 py-5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[0.95rem] font-semibold text-slate-950">
            {document.title}
          </h3>
          {unlocked ? (
            <Check aria-label="Unlocked" className="size-3.5 shrink-0 text-emerald-600" />
          ) : null}
        </div>

        <div className="rm-meta">
          {meta(document).map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>

        {percent > 0 ? (
          <div className="flex items-center gap-2 pt-0.5">
            <span
              aria-hidden
              className="h-0.5 w-24 overflow-hidden rounded-full bg-[color:var(--border)]"
            >
              <span
                className="block h-full rounded-full bg-amber-500"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </span>
            <span className="type-caption text-slate-500">{percent}%</span>
          </div>
        ) : null}

        {error ? <p className="type-caption text-rose-600">{error}</p> : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {redeemable ? (
          <Button variant="ghost" size="sm" onClick={() => void redeem()} disabled={redeeming}>
            {redeeming ? <SpinnerGap className="animate-spin" /> : <Coins />}
            {document.points_price}
          </Button>
        ) : null}
        <Button asChild variant={unlocked ? "default" : "secondary"} size="sm">
          <Link href={`/library/${document.slug}`}>
            <BookOpen />
            {unlocked ? (percent > 0 ? "Resume" : "Read") : "View"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function LibraryRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-4 py-5", className)}>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/5 rounded bg-[color:var(--border)]" />
        <div className="h-3 w-1/4 rounded bg-[color:var(--border)]" />
      </div>
      <div className="h-8 w-20 rounded-lg bg-[color:var(--border)]" />
    </div>
  );
}
