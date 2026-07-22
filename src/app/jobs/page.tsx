"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Briefcase, MagnifyingGlass } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { JobRow, JobRowSkeleton } from "@/components/shared/job-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jobsClient, type JobListItem } from "@/lib/jobs-client";

const PAGE_SIZE = 20;

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    const response = await jobsClient.listJobs({
      query: deferredQuery.trim() || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    setTotal(response.total);
    return response.items;
  }, [deferredQuery, page]);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const items = await loadJobs();
        if (!cancelled) setJobs(items);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load jobs.");
          setJobs([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadJobs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <div className="reveal-up mx-auto max-w-3xl">
        <header className="flex items-end justify-between gap-4 border-b border-[color:var(--border)] pb-6">
          <div className="space-y-2">
            <span className="rm-tag text-accent">Jobs</span>
            <h1 className="type-h2 text-slate-950">Find projects and apply in one place.</h1>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/jobs/applications">
              <Briefcase />
              My applications
            </Link>
          </Button>
        </header>

        <div className="pt-6">
          <div className="relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-full surface-secondary pl-11"
              placeholder="Search jobs, tools, or skills"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="rm-divide pt-2">
          {error ? (
            <p className="py-8 text-sm text-rose-600">{error}</p>
          ) : isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <JobRowSkeleton key={index} className="animate-pulse" />
            ))
          ) : jobs.length ? (
            jobs.map((job) => <JobRow key={job.id} job={job} />)
          ) : (
            <p className="py-8 type-caption text-slate-500">No jobs match your search.</p>
          )}
        </div>

        {!isLoading && !error && totalPages > 1 ? (
          <div className="flex items-center justify-between pt-6">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="type-caption text-slate-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
