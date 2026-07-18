"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { type JobListItem } from "@/lib/jobs-client";
import { cn } from "@/lib/utils";

function meta(job: JobListItem): string[] {
  const parts: string[] = [];
  if (job.service_required) parts.push(job.service_required);
  if (job.engagement_model) parts.push(job.engagement_model);
  if (job.budget) parts.push(job.budget);
  if (job.experience_years) parts.push(`${job.experience_years} yrs exp`);
  if (job.country) parts.push(job.country);
  return parts.slice(0, 4);
}

export function JobRow({ job }: { job: JobListItem }) {
  return (
    <div className="flex items-start gap-4 py-5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="truncate text-[0.95rem] font-semibold text-slate-950">{job.title}</h3>
        {job.short_scope ? (
          <p className="line-clamp-2 type-small text-slate-500">{job.short_scope}</p>
        ) : null}
        <div className="rm-meta">
          {meta(job).map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      </div>

      <div className="shrink-0">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/jobs/${job.id}`}>
            View
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function JobRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-4 py-5", className)}>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/5 rounded bg-[color:var(--border)]" />
        <div className="h-3 w-3/4 rounded bg-[color:var(--border)]" />
        <div className="h-3 w-1/3 rounded bg-[color:var(--border)]" />
      </div>
      <div className="h-8 w-16 rounded-lg bg-[color:var(--border)]" />
    </div>
  );
}
