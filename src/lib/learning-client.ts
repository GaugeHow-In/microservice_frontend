import { API_BASE_URL } from "@/lib/api-base";

export class LearningApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LearningApiError";
    this.status = status;
  }
}

export type CourseLevel = "beginner" | "intermediate" | "advanced" | "all_levels";
export type AccessType = "free" | "subscription" | "lifetime";
export type EnrollmentStatus = "active" | "completed" | "dropped" | "cancelled";
export type LessonStatus = "draft" | "published" | "locked" | "archived";
export type LessonType = "video" | "article" | "quiz" | "live" | "case_study" | "resource";
export type LessonQuestionType = "mcq" | "true_false" | "fill_blank";
export type LearningProgressStatus = "not_started" | "in_progress" | "completed";
export type AIArtifactType = "lesson_notes" | "flashcards";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type InstructorSummary = {
  id: string;
  display_name: string;
  handle: string | null;
};

export type PricingRegion = {
  code: string;
  name: string;
  pricing_scope: "country" | "country_group" | "global_default";
  currency_code: string;
  country_codes: string[];
};

export type PricingOption = {
  id: string;
  purchase_type: AccessType;
  base_price_minor: number;
  currency_code: string;
  display_price_minor?: number | null;
  display_currency_code?: string | null;
  buyer_country_code?: string | null;
  pricing_tier?: string | null;
  is_display_price_estimated?: boolean;
  subscription_days: number | null;
  is_active: boolean;
  region: PricingRegion;
};

export type AccessSummary = {
  status: EnrollmentStatus | null;
  access_type: AccessType | null;
  has_access: boolean;
  is_lifetime_access: boolean;
  access_expires_at: string | null;
  days_left: number | null;
  progress_percent: number | null;
  current_lesson_id: string | null;
};

export type CourseCatalogItem = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  status: string;
  level: CourseLevel;
  duration_minutes: number | null;
  lesson_count: number;
  average_rating: number;
  total_reviews: number;
  thumbnail_url: string | null;
  categories: Category[];
  instructors: InstructorSummary[];
  pricing: PricingOption | null;
  access: AccessSummary | null;
};

export type CourseListResponse = {
  items: CourseCatalogItem[];
  total: number;
  page: number;
  page_size: number;
};

export type LessonSummary = {
  id: string;
  title: string;
  slug: string;
  lesson_type: LessonType;
  status: LessonStatus;
  duration_seconds: number | null;
  sort_order: number;
  is_preview: boolean;
  progress_percent: number | null;
  accessible: boolean;
};

export type CourseModule = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  sort_order: number;
  duration_minutes: number | null;
  lessons: LessonSummary[];
};

export type CourseReview = {
  id: string;
  user_id: string;
  user_display_name: string;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
};

export type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  status: string;
  level: CourseLevel;
  duration_minutes: number | null;
  lesson_count: number;
  average_rating: number;
  total_reviews: number;
  certificate_enabled: boolean;
  thumbnail_url: string | null;
  preview_url: string | null;
  categories: Category[];
  instructors: InstructorSummary[];
  modules: CourseModule[];
  pricing_options: PricingOption[];
  recommended_pricing: PricingOption | null;
  access: AccessSummary | null;
  reviews: CourseReview[];
};

export type Transcript = {
  id: string;
  language_code: string;
  transcript_text: string;
  transcript_source: string | null;
  subtitle_url: string | null;
  segments: Array<{ start: number; end: number; text: string }> | null;
};

export type QuestionOption = {
  id: string;
  option_text: string;
  display_order: number;
};

export type LessonQuestion = {
  id: string;
  timestamp_seconds: number;
  question_type: LessonQuestionType;
  prompt: string;
  explanation: string | null;
  display_order: number;
  is_required: boolean;
  options: QuestionOption[];
};

export type LessonResource = {
  id: string;
  title: string;
  resource_type: string;
  description: string | null;
  external_url: string | null;
  media_url: string | null;
  is_downloadable: boolean;
};

export type DiscussionComment = {
  id: string;
  user_id: string;
  user_display_name: string;
  parent_comment_id: string | null;
  body: string;
  is_instructor_response: boolean;
  is_solution: boolean;
  created_at: string;
};

export type DiscussionThread = {
  id: string;
  title: string;
  body: string;
  status: "open" | "answered" | "closed";
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  user_display_name: string;
  comments: DiscussionComment[];
};

export type LessonDiscussionListResponse = {
  items: DiscussionThread[];
};

export type LessonProgress = {
  status: LearningProgressStatus;
  progress_percent: number;
  watched_seconds: number;
  time_spent_seconds: number;
  last_position_seconds: number | null;
  completed_at: string | null;
};

export type LessonDetail = {
  id: string;
  course_id: string;
  course_slug: string;
  title: string;
  slug: string;
  lesson_type: LessonType;
  status: LessonStatus;
  summary: string | null;
  content_markdown: string | null;
  duration_seconds: number | null;
  is_preview: boolean;
  accessible: boolean;
  video_provider: "bunny" | "youtube" | "vimeo" | "internal" | null;
  video_provider_asset_id: string | null;
  video_url: string | null;
  transcript: Transcript | null;
  questions: LessonQuestion[];
  resources: LessonResource[];
  progress: LessonProgress | null;
  discussions: DiscussionThread[];
  access: AccessSummary | null;
};

export type LessonAIArtifact = {
  id: string;
  artifact_type: AIArtifactType;
  content_markdown: string;
  payload_json: Record<string, unknown> | Array<Record<string, unknown>> | null;
  generated_at: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  keepalive?: boolean;
  token?: string | null;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();
const COURSE_LIST_TTL_MS = 60_000;
const COURSE_DETAIL_TTL_MS = 180_000;

function buildViewerScope(viewerKey?: string | null): string {
  return viewerKey ?? "anon";
}

function readCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache<T>(key: string, value: T, ttlMs: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function buildCourseListCacheKey(params?: {
  query?: string;
  categories?: string[];
  level?: CourseLevel;
  page?: number;
  pageSize?: number;
  viewerKey?: string | null;
}): string {
  const normalizedCategories = [...(params?.categories ?? [])].sort();
  return JSON.stringify({
    type: "course-list",
    viewer: buildViewerScope(params?.viewerKey),
    query: params?.query?.trim().toLowerCase() || "",
    categories: normalizedCategories,
    level: params?.level ?? null,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 12,
  });
}

function buildCourseDetailCacheKey(
  slug: string,
  options?: { viewerKey?: string | null },
): string {
  return JSON.stringify({
    type: "course-detail",
    viewer: buildViewerScope(options?.viewerKey),
    slug,
  });
}

export const learningCache = {
  getCourseList(params?: {
    query?: string;
    categories?: string[];
    level?: CourseLevel;
    page?: number;
    pageSize?: number;
    viewerKey?: string | null;
  }): CourseListResponse | null {
    return readCache<CourseListResponse>(buildCourseListCacheKey(params));
  },
  setCourseList(
    response: CourseListResponse,
    params?: {
      query?: string;
      categories?: string[];
      level?: CourseLevel;
      page?: number;
      pageSize?: number;
      viewerKey?: string | null;
    },
  ): void {
    writeCache(buildCourseListCacheKey(params), response, COURSE_LIST_TTL_MS);
  },
  getCourseDetail(
    slug: string,
    options?: { viewerKey?: string | null },
  ): CourseDetail | null {
    return readCache<CourseDetail>(buildCourseDetailCacheKey(slug, options));
  },
  setCourseDetail(
    course: CourseDetail,
    options?: { viewerKey?: string | null },
  ): void {
    writeCache(buildCourseDetailCacheKey(course.slug, options), course, COURSE_DETAIL_TTL_MS);
  },
  invalidateCourseDetail(
    slug: string,
    options?: { viewerKey?: string | null },
  ): void {
    memoryCache.delete(buildCourseDetailCacheKey(slug, options));
  },
};

async function learningRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const requestKey =
    method === "GET" && !options.body
      ? `${method}:${path}:${options.token ?? "anon"}`
      : null;

  if (requestKey) {
    const existing = inflightRequests.get(requestKey) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }
  }

  const request = (async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      keepalive: options.keepalive ?? false,
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      credentials: "include",
      cache: options.token || method !== "GET" ? "no-store" : "default",
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const payload = (await response.json()) as { detail?: string };
        message = payload.detail ?? message;
      } catch {
        message = response.statusText || message;
      }
      throw new LearningApiError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  })();

  if (!requestKey) {
    return request;
  }

  inflightRequests.set(requestKey, request);
  try {
    return await request;
  } finally {
    inflightRequests.delete(requestKey);
  }
}

export const learningClient = {
  listCourses(params?: {
    query?: string;
    categories?: string[];
    level?: CourseLevel;
    page?: number;
    pageSize?: number;
    token?: string | null;
  }) {
    const search = new URLSearchParams();
    if (params?.query) search.set("query", params.query);
    if (params?.categories?.length) search.set("categories", params.categories.join(","));
    if (params?.level) search.set("level", params.level);
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("page_size", String(params.pageSize));
    const suffix = search.size ? `?${search.toString()}` : "";
    return learningRequest<CourseListResponse>(`/learning/courses${suffix}`, {
      token: params?.token,
    });
  },
  getCourseDetail(slug: string, options?: { token?: string | null }) {
    return learningRequest<CourseDetail>(`/learning/courses/${slug}`, {
      token: options?.token,
    });
  },
  enrollFree(slug: string, token: string) {
    return learningRequest<{ access: AccessSummary }>(`/learning/courses/${slug}/enroll/free`, {
      method: "POST",
      token,
      body: {},
    });
  },
  getLessonDetail(
    courseSlug: string,
    lessonSlug: string,
    options?: { token?: string | null; includeTranscript?: boolean },
  ) {
    const search = new URLSearchParams();
    if (options?.includeTranscript) search.set("include_transcript", "true");
    const suffix = search.size ? `?${search.toString()}` : "";
    return learningRequest<LessonDetail>(
      `/learning/courses/${courseSlug}/lessons/${lessonSlug}${suffix}`,
      { token: options?.token },
    );
  },
  updateLessonProgress(
    courseSlug: string,
    lessonSlug: string,
    token: string,
    payload: {
      watchedSeconds: number;
      timeSpentSeconds?: number;
      lastPositionSeconds?: number;
      markCompleted?: boolean;
    },
    options?: { keepalive?: boolean },
  ) {
    return learningRequest<LessonProgress>(
      `/learning/courses/${courseSlug}/lessons/${lessonSlug}/progress`,
      {
        method: "PATCH",
        keepalive: options?.keepalive ?? false,
        token,
        body: {
          watched_seconds: payload.watchedSeconds,
          time_spent_seconds: payload.timeSpentSeconds,
          last_position_seconds: payload.lastPositionSeconds,
          mark_completed: payload.markCompleted ?? false,
        },
      },
    );
  },
  submitQuestionAttempt(
    courseSlug: string,
    lessonSlug: string,
    questionId: string,
    token: string,
    payload: { selectedOptionId?: string | null; answerText?: string | null },
  ) {
    return learningRequest<{
      id: string;
      is_correct: boolean;
      attempted_at: string;
      explanation: string | null;
    }>(
      `/learning/courses/${courseSlug}/lessons/${lessonSlug}/questions/${questionId}/attempts`,
      {
        method: "POST",
        token,
        body: {
          selected_option_id: payload.selectedOptionId ?? null,
          answer_text: payload.answerText ?? null,
        },
      },
    );
  },
  createDiscussion(
    courseSlug: string,
    lessonSlug: string,
    token: string,
    payload: { body: string; title?: string | null },
  ) {
    return learningRequest<DiscussionThread>(
      `/learning/courses/${courseSlug}/lessons/${lessonSlug}/discussions`,
      {
        method: "POST",
        token,
        body: payload,
      },
    );
  },
  listLessonDiscussions(courseSlug: string, lessonSlug: string, token?: string | null) {
    return learningRequest<LessonDiscussionListResponse>(
      `/learning/courses/${courseSlug}/lessons/${lessonSlug}/discussions`,
      { token },
    );
  },
  addDiscussionComment(threadId: string, token: string, payload: { body: string; parentCommentId?: string | null }) {
    return learningRequest<DiscussionComment>(`/learning/discussions/${threadId}/comments`, {
      method: "POST",
      token,
      body: {
        body: payload.body,
        parent_comment_id: payload.parentCommentId ?? null,
      },
    });
  },
  upsertReview(slug: string, token: string, payload: { rating: number; reviewText?: string }) {
    return learningRequest<CourseReview>(`/learning/courses/${slug}/reviews/me`, {
      method: "PUT",
      token,
      body: {
        rating: payload.rating,
        review_text: payload.reviewText ?? null,
      },
    });
  },
  generateArtifact(
    courseSlug: string,
    lessonSlug: string,
    token: string,
    artifactType: AIArtifactType,
  ) {
    return learningRequest<LessonAIArtifact>(
      `/learning/courses/${courseSlug}/lessons/${lessonSlug}/ai-artifacts`,
      {
        method: "POST",
        token,
        body: { artifact_type: artifactType },
      },
    );
  },
};

export function formatMinutes(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "TBD";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours}h`;
  return `${remaining}m`;
}

export function formatSeconds(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "TBD";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function formatPrice(option: PricingOption | null): string {
  if (!option) return "Pricing unavailable";
  if (option.base_price_minor === 0) return "Free";
  const priceMinor = option.display_price_minor ?? option.base_price_minor;
  const currencyCode = option.display_currency_code ?? option.currency_code;
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  });
  return formatter.format(priceMinor / 100);
}
