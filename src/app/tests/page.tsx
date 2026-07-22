"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ClipboardText, LockKey, MagnifyingGlass, Timer } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  assessmentClient,
  formatDuration,
  formatTestAccess,
  type TestCatalogItem,
} from "@/lib/assessment-client";

function accessBadge(test: TestCatalogItem) {
  if (test.access.has_access) return { label: "Accessible", variant: "green" as const };
  if (test.access.requires_plus) return { label: "Plus", variant: "orange" as const };
  return { label: "Locked", variant: "dark" as const };
}

export default function TestsPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [tests, setTests] = useState<TestCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [scope, setScope] = useState<"all" | "standalone" | "course">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadTests() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await assessmentClient.listTests({ token: accessToken });
        if (!cancelled) {
          setTests(response.items);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load tests.");
          setTests([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTests();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  const filteredTests = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return tests.filter((test) => {
      const scopeMatch =
        scope === "all" ||
        (scope === "standalone" && !test.course_id) ||
        (scope === "course" && Boolean(test.course_id));
      const queryMatch =
        !needle ||
        test.title.toLowerCase().includes(needle) ||
        test.description?.toLowerCase().includes(needle);
      return scopeMatch && queryMatch;
    });
  }, [deferredQuery, scope, tests]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Explore tests"
          description="Course finals and timed practice tests, with scoring and pass requirements."
          action={
            <Button asChild variant="secondary">
              <Link href="/tests/previous">
                <ClipboardText />
                Attempt history
              </Link>
            </Button>
          }
        />

        <div className="reveal-delay-1 reveal-up flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
            <Input
              className="h-11 rounded-full surface-secondary pl-12"
              placeholder="Search certification tests, practice sets, and course finals"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "standalone", "course"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setScope(item)}
                className={
                  scope === item
                    ? "shrink-0 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white"
                    : "shrink-0 rounded-full surface-secondary px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                }
              >
                {item === "all" ? "All tests" : item === "standalone" ? "Standalone" : "Course finals"}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-5 text-sm font-medium text-rose-600">{error}</CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="browse-card space-y-4 p-5">
                <Skeleton className="h-7 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredTests.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTests.map((test) => {
              const badge = accessBadge(test);
              return (
                <div key={test.slug} className="browse-card space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {test.is_certificate_required ? (
                      <Badge variant="orange">Certificate required</Badge>
                    ) : null}
                    {test.course_id ? <Badge>Course final</Badge> : <Badge>Standalone</Badge>}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">{test.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {test.description ?? "Timed GaugeHow assessment."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 rounded-xl surface-secondary p-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Time</p>
                      <p className="mt-1 font-bold text-slate-950">{formatDuration(test.duration_seconds)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Questions</p>
                      <p className="mt-1 font-bold text-slate-950">{test.question_count}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Pass</p>
                      <p className="mt-1 font-bold text-slate-950">{test.passing_percent}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      {formatTestAccess(test.access)}
                    </span>
                    <Button asChild disabled={!test.access.has_access}>
                      <Link href={test.access.has_access ? `/tests/active?test=${test.slug}` : "/tests"}>
                        {test.access.has_access ? <Timer /> : <LockKey />}
                        {test.access.has_access ? "Open" : "Locked"}
                      </Link>
                    </Button>
                  </div>
                  {!test.access.has_access && test.access.locked_reason ? (
                    <p className="text-xs font-medium text-slate-500">{test.access.locked_reason}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-slate-600">
              No tests match the current search or filter.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
