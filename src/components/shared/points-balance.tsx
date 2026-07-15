"use client";

import { CircleNotch, Coins, Gift, Medal, MedalMilitary, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  gamificationClient,
  type GamificationBadge,
  type GamificationSummary,
} from "@/lib/gamification-client";
import { cn } from "@/lib/utils";

type PointsBalanceProps = {
  accessToken: string | null;
};

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function eventLabel(eventType: string): string {
  switch (eventType) {
    case "daily_login":
      return "Daily login";
    case "lesson_completed":
      return "Lesson";
    case "library_document_completed":
      return "Book";
    case "course_completed":
      return "Course";
    case "quiz_correct":
      return "Checkpoint";
    default:
      return "Points";
  }
}

function earnedBadges(badges: GamificationBadge[]): GamificationBadge[] {
  return badges.filter((badge) => badge.earned).slice(0, 4);
}

export function PointsBalance({ accessToken }: PointsBalanceProps) {
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void gamificationClient
      .claimDailyCheckIn(accessToken)
      .then((payload) => {
        if (!cancelled) setSummary(payload.summary);
      })
      .catch(async () => {
        try {
          const payload = await gamificationClient.getSummary(accessToken);
          if (!cancelled) setSummary(payload);
        } catch {
          if (!cancelled) setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const visibleBadges = useMemo(() => earnedBadges(summary?.badges ?? []), [summary?.badges]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="soft"
        size="sm"
        className="min-w-[104px] justify-center"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Points balance"
      >
        {loading && !summary ? <CircleNotch className="animate-spin" /> : <Coins />}
        <span>{formatPoints(summary?.available_points ?? 0)} pts</span>
      </Button>

      {open ? (
        <div className="chrome-surface absolute right-0 top-12 z-50 w-[min(92vw,360px)] rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="type-caption font-semibold uppercase tracking-[0.18em] text-slate-500">
                Rewards
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {formatPoints(summary?.available_points ?? 0)} pts
              </p>
            </div>
            <Badge variant="orange" className="gap-1">
              <Medal className="size-3.5" />
              {summary?.level.name ?? "Unranked"}
            </Badge>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between type-caption font-semibold text-slate-500">
              <span>{summary?.level.name ?? "Unranked"}</span>
              <span>
                {summary?.level.points_to_next_level
                  ? `${formatPoints(summary.level.points_to_next_level)} to ${summary.level.next_level_name}`
                  : "Top level"}
              </span>
            </div>
            <Progress value={summary?.level.progress_percent ?? 0} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="surface-secondary rounded-lg p-3">
              <p className="type-caption text-slate-500">Lifetime</p>
              <p className="type-small font-semibold text-slate-950">
                {formatPoints(summary?.lifetime_points ?? 0)} pts
              </p>
            </div>
            <div className="surface-secondary rounded-lg p-3">
              <p className="type-caption text-slate-500">Streak</p>
              <p className="type-small font-semibold text-slate-950">
                {summary?.daily_check_in.streak_days ?? 0} days
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="type-caption font-semibold uppercase tracking-[0.16em] text-slate-500">
              Medals
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(visibleBadges.length
                ? visibleBadges
                : (summary?.badges.slice(0, 3) ?? [])
              ).map((badge) => (
                  <span
                    key={badge.code}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 type-caption font-semibold",
                      badge.earned
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                    title={badge.description}
                  >
                    <MedalMilitary className="size-3.5" />
                    {badge.name}
                  </span>
              ))}
            </div>
          </div>

          {summary?.recent_transactions.length ? (
            <div className="mt-4 space-y-2">
              {summary.recent_transactions.slice(0, 3).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 type-caption text-slate-600"
                >
                  <span className="truncate">
                    {eventLabel(transaction.event_type)}
                    {transaction.source_label ? ` - ${transaction.source_label}` : ""}
                  </span>
                  <span className="font-semibold text-emerald-700">
                    +{formatPoints(transaction.points)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <Button className="mt-4 w-full" variant="secondary" disabled>
            <Gift />
            Redeem coming soon
          </Button>
          <p className="mt-2 flex items-center gap-1.5 type-caption text-slate-500">
            <Sparkle className="size-3.5" />
            Daily reset is 00:00 UTC.
          </p>
        </div>
      ) : null}
    </div>
  );
}
