import { API_BASE_URL } from "@/lib/api-base";

export class JobsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "JobsApiError";
    this.status = status;
  }
}

export type JobListItem = {
  id: string;
  title: string;
  tool_title: string | null;
  service_required: string | null;
  short_scope: string | null;
  engagement_model: string | null;
  budget: string | null;
  experience_years: string | null;
  country: string | null;
  posted_on: string | null;
  first_synced_at: string;
};

export type JobDetail = JobListItem & {
  reference_files: string | null;
  remark: string | null;
  extra_remark: string | null;
  linkedin_url: string | null;
  has_applied: boolean;
};

export type JobListResponse = {
  items: JobListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type EmailStatus =
  | "pending"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "retrying";

export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "withdrawn";

export type ApplicationEmailStatus = {
  status: EmailStatus;
  attempts: number;
  last_error: string | null;
  queued_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  next_retry_at: string | null;
};

export type JobApplication = {
  id: string;
  job_id: string;
  job_title: string;
  status: ApplicationStatus;
  resume_file_name: string | null;
  resume_submitted: boolean;
  applied_at: string;
  email_status: EmailStatus | null;
  email: ApplicationEmailStatus | null;
};

export type ApplicationListResponse = {
  items: JobApplication[];
  total: number;
};

export type ApplyInput = {
  resume: File;
  coverLetter?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  additionalMessage?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function jobsRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    credentials: "include",
    cache: options.token || method !== "GET" ? "no-store" : "default",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new JobsApiError(message, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const jobsClient = {
  listJobs(params?: {
    query?: string;
    country?: string;
    engagementModel?: string;
    page?: number;
    pageSize?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.query) search.set("query", params.query);
    if (params?.country) search.set("country", params.country);
    if (params?.engagementModel) search.set("engagement_model", params.engagementModel);
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("page_size", String(params.pageSize));
    const suffix = search.size ? `?${search.toString()}` : "";
    return jobsRequest<JobListResponse>(`/jobs${suffix}`);
  },
  getJob(jobId: string, options?: { token?: string | null }) {
    return jobsRequest<JobDetail>(`/jobs/${jobId}`, { token: options?.token });
  },
  listMyApplications(token: string) {
    return jobsRequest<ApplicationListResponse>(`/jobs/applications/me`, { token });
  },
  async apply(jobId: string, token: string, input: ApplyInput) {
    const form = new FormData();
    form.set("resume", input.resume);
    if (input.coverLetter) form.set("cover_letter", input.coverLetter);
    if (input.portfolioUrl) form.set("portfolio_url", input.portfolioUrl);
    if (input.githubUrl) form.set("github_url", input.githubUrl);
    if (input.linkedinUrl) form.set("linkedin_url", input.linkedinUrl);
    if (input.additionalMessage) form.set("additional_message", input.additionalMessage);
    if (input.applicantName) form.set("applicant_name", input.applicantName);
    if (input.applicantEmail) form.set("applicant_email", input.applicantEmail);
    if (input.applicantPhone) form.set("applicant_phone", input.applicantPhone);

    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      cache: "no-store",
      body: form,
    });
    return parseResponse<{ application: JobApplication; message: string }>(response);
  },
};
