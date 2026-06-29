import { API_BASE_URL } from "@/lib/api-base";

export type TestAccessType = "free" | "paid" | "course_access";

export type TestAccessSummary = {
  has_access: boolean;
  access_type: TestAccessType;
  locked_reason: string | null;
  course_slug: string | null;
  price_minor: number;
  currency_code: string;
};

export type TestCatalogItem = {
  id: string;
  course_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  duration_seconds: number;
  passing_percent: number;
  is_certificate_required: boolean;
  question_count: number;
  max_score: number;
  access: TestAccessSummary;
};

export type TestListResponse = {
  items: TestCatalogItem[];
  total: number;
  page: number;
  page_size: number;
};

type ListTestsOptions = {
  token?: string | null;
  includeCourseTests?: boolean;
};

export class AssessmentApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AssessmentApiError";
    this.status = status;
  }
}

export const assessmentClient = {
  async listTests(options: ListTestsOptions = {}): Promise<TestListResponse> {
    const search = new URLSearchParams({
      include_course_tests: String(options.includeCourseTests ?? true),
      page_size: "100",
    });
    const response = await fetch(`${API_BASE_URL}/assessments/tests?${search.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      credentials: "include",
      cache: options.token ? "no-store" : "default",
    });
    if (!response.ok) {
      let message = "Unable to load tests.";
      try {
        const payload = (await response.json()) as { detail?: string };
        message = payload.detail ?? message;
      } catch {
        message = response.statusText || message;
      }
      throw new AssessmentApiError(message, response.status);
    }
    return (await response.json()) as TestListResponse;
  },
};

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export function formatTestPrice(access: TestAccessSummary): string {
  if (access.access_type === "course_access") return "Included with course";
  if (access.access_type === "free" || access.price_minor === 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: access.currency_code,
    maximumFractionDigits: 0,
  }).format(access.price_minor / 100);
}
