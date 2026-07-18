"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, FileText } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  type EmailStatus,
  jobsClient,
  type JobApplication,
} from "@/lib/jobs-client";

const EMAIL_LABELS: Record<EmailStatus, { label: string; className: string }> = {
  pending: { label: "Email pending", className: "bg-amber-50 text-amber-700" },
  queued: { label: "Email queued", className: "bg-amber-50 text-amber-700" },
  sending: { label: "Email sending", className: "bg-blue-50 text-blue-700" },
  sent: { label: "Employer notified", className: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Email failed", className: "bg-rose-50 text-rose-700" },
  retrying: { label: "Email retrying", className: "bg-amber-50 text-amber-700" },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ApplicationCard({ application }: { application: JobApplication }) {
  const email = application.email_status ? EMAIL_LABELS[application.email_status] : null;
  return (
    <Link
      href={`/jobs/${application.job_id}`}
      className="block rounded-2xl border border-[color:var(--border)] p-5 transition hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h3 className="truncate text-[0.95rem] font-semibold text-slate-950">
            {application.job_title}
          </h3>
          <div className="rm-meta">
            <span>Applied {formatDate(application.applied_at)}</span>
            <span className="capitalize">{application.status}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {application.resume_submitted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <FileText className="size-3.5" />
                {application.resume_file_name ?? "Resume"}
              </span>
            ) : null}
            {email ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${email.className}`}
              >
                {application.email_status === "sent" ? (
                  <CheckCircle weight="fill" className="size-3.5" />
                ) : null}
                {email.label}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MyApplicationsPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await jobsClient.listMyApplications(accessToken);
      setApplications(response.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your applications.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthLoading) return;
    void load();
  }, [isAuthLoading, load]);

  return (
    <AppShell>
      <div className="reveal-up mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/jobs">
            <ArrowLeft />
            All jobs
          </Link>
        </Button>

        <header className="space-y-2 border-b border-[color:var(--border)] pb-6">
          <span className="rm-tag text-accent">Applications</span>
          <h1 className="type-h2 text-slate-950">Track everything you&apos;ve applied to.</h1>
        </header>

        <div className="space-y-3 pt-6">
          {error ? (
            <p className="py-8 text-sm text-rose-600">{error}</p>
          ) : isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl border border-[color:var(--border)]"
              />
            ))
          ) : applications.length ? (
            applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="type-body text-slate-500">You haven&apos;t applied to any jobs yet.</p>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href="/jobs">Browse jobs</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
