"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Paperclip, SpinnerGap } from "@phosphor-icons/react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { jobsClient, JobsApiError, type JobDetail } from "@/lib/jobs-client";

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="type-caption uppercase tracking-wide text-slate-400">{label}</p>
      <p className="type-small text-slate-950">{value}</p>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const router = useRouter();
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    setIsLoading(true);
    setError(null);
    try {
      const detail = await jobsClient.getJob(jobId, { token: accessToken });
      setJob(detail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load this job.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, jobId]);

  useEffect(() => {
    if (isAuthLoading) return;
    void loadJob();
  }, [isAuthLoading, loadJob]);

  return (
    <AppShell>
      <div className="reveal-up mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/jobs">
            <ArrowLeft />
            All jobs
          </Link>
        </Button>

        {error ? (
          <p className="py-8 text-sm text-rose-600">{error}</p>
        ) : isLoading || !job ? (
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-[color:var(--border)]" />
            <div className="h-24 animate-pulse rounded bg-[color:var(--border)]" />
          </div>
        ) : (
          <article className="space-y-8">
            <header className="space-y-3 border-b border-[color:var(--border)] pb-6">
              {job.tool_title ? <span className="rm-tag text-accent">{job.tool_title}</span> : null}
              <h1 className="type-h2 text-slate-950">{job.title}</h1>
              <div className="rm-meta">
                {job.engagement_model ? <span>{job.engagement_model}</span> : null}
                {job.budget ? <span>{job.budget}</span> : null}
                {job.country ? <span>{job.country}</span> : null}
              </div>
              <div className="pt-2">
                {job.has_applied ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    <CheckCircle weight="fill" className="size-4" />
                    Applied
                  </span>
                ) : (
                  <ApplyDialog
                    job={job}
                    accessToken={accessToken}
                    defaultName={user?.display_name ?? ""}
                    onApplied={loadJob}
                    onRequireLogin={() => router.push("/login")}
                  />
                )}
              </div>
            </header>

            {job.short_scope ? (
              <section className="space-y-2">
                <h2 className="type-h4 text-slate-950">Scope</h2>
                <p className="whitespace-pre-line type-body text-slate-700">{job.short_scope}</p>
              </section>
            ) : null}

            <section className="grid grid-cols-2 gap-5">
              <Detail label="Service required" value={job.service_required} />
              <Detail label="Experience" value={job.experience_years} />
              <Detail label="Budget" value={job.budget} />
              <Detail label="Engagement" value={job.engagement_model} />
              <Detail label="Country" value={job.country} />
              <Detail label="Posted" value={job.posted_on} />
            </section>

            {job.remark || job.extra_remark ? (
              <section className="space-y-2">
                <h2 className="type-h4 text-slate-950">Notes</h2>
                <p className="whitespace-pre-line type-small text-slate-600">
                  {[job.remark, job.extra_remark].filter(Boolean).join("\n\n")}
                </p>
              </section>
            ) : null}
          </article>
        )}
      </div>
    </AppShell>
  );
}

function ApplyDialog({
  job,
  accessToken,
  defaultName,
  onApplied,
  onRequireLogin,
}: {
  job: JobDetail;
  accessToken: string | null;
  defaultName: string;
  onApplied: () => void | Promise<void>;
  onRequireLogin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [resume, setResume] = useState<File | null>(null);
  const [applicantName, setApplicantName] = useState(defaultName);
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [additionalMessage, setAdditionalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(resume && applicantName.trim() && applicantEmail.trim()),
    [resume, applicantName, applicantEmail],
  );

  async function submit() {
    if (!accessToken) {
      onRequireLogin();
      return;
    }
    if (!resume || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await jobsClient.apply(job.id, accessToken, {
        resume,
        coverLetter: coverLetter.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        additionalMessage: additionalMessage.trim() || undefined,
        applicantName: applicantName.trim() || undefined,
        applicantEmail: applicantEmail.trim() || undefined,
        applicantPhone: applicantPhone.trim() || undefined,
      });
      setOpen(false);
      await onApplied();
    } catch (cause) {
      if (cause instanceof JobsApiError && cause.status === 401) {
        onRequireLogin();
        return;
      }
      setError(cause instanceof Error ? cause.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Apply now</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogTitle>Apply for {job.title}</DialogTitle>
        <DialogDescription>
          Your resume and details are sent directly to the project poster.
        </DialogDescription>

        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[color:var(--border)] px-4 py-3 text-sm text-slate-600 transition hover:border-slate-400">
            <Paperclip className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {resume ? resume.name : "Attach resume (PDF, required)"}
            </span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => setResume(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Full name"
              value={applicantName}
              onChange={(event) => setApplicantName(event.target.value)}
            />
            <Input
              type="email"
              placeholder="Email"
              value={applicantEmail}
              onChange={(event) => setApplicantEmail(event.target.value)}
            />
          </div>
          <Input
            placeholder="Phone / WhatsApp (optional)"
            value={applicantPhone}
            onChange={(event) => setApplicantPhone(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Portfolio URL"
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
            />
            <Input
              placeholder="GitHub URL"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
            />
          </div>
          <Input
            placeholder="LinkedIn URL"
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
          />
          <Textarea
            placeholder="Cover letter"
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
          />
          <Textarea
            placeholder="Additional message (optional)"
            className="min-h-20"
            value={additionalMessage}
            onChange={(event) => setAdditionalMessage(event.target.value)}
          />

          {error ? <p className="type-caption text-rose-600">{error}</p> : null}

          <Button className="w-full" disabled={!canSubmit || submitting} onClick={() => void submit()}>
            {submitting ? <SpinnerGap className="animate-spin" /> : null}
            {submitting ? "Submitting..." : "Submit application"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
