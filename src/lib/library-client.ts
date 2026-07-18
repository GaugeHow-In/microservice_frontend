import { API_BASE_URL } from "@/lib/api-base";

export class LibraryApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LibraryApiError";
    this.status = status;
  }
}

export type LibraryDocumentStatus = "draft" | "published" | "archived";
export type LibraryAccessStatus = "active" | "expired" | "cancelled";
export type LibraryAnnotationType = "highlight" | "note" | "bookmark";

export type LibraryCategory = {
  id: string;
  name: string;
  slug: string;
};

export type LibraryAccess = {
  status: LibraryAccessStatus | null;
  is_started: boolean;
  last_accessed_at: string | null;
};

export type LibraryProgress = {
  current_page: number;
  page_count: number | null;
  progress_percent: number;
  time_spent_seconds: number;
  completed_at: string | null;
  last_accessed_at: string | null;
};

export type LibraryAnnotation = {
  id: string;
  annotation_type: LibraryAnnotationType;
  page_number: number;
  body: string | null;
  selected_text: string | null;
  geometry_json: Record<string, unknown> | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type LibraryDocumentCatalogItem = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  author_name: string | null;
  status: LibraryDocumentStatus;
  page_count: number | null;
  estimated_read_minutes: number | null;
  thumbnail_url: string | null;
  category: LibraryCategory | null;
  /** Cost to unlock with points. Null means this book is not redeemable. */
  points_price: number | null;
  is_free: boolean;
  requires_plus: boolean;
  has_access: boolean;
  access: LibraryAccess | null;
  progress: LibraryProgress | null;
};

export type LibraryDocumentListResponse = {
  items: LibraryDocumentCatalogItem[];
  total: number;
  page: number;
  page_size: number;
};

export type LibraryDocumentDetail = LibraryDocumentCatalogItem & {
  annotations: LibraryAnnotation[];
  security: {
    watermark_enabled: boolean;
    allow_download: boolean;
    allow_print: boolean;
  };
};

export type LibraryViewerSession = {
  document_id: string;
  document_slug: string;
  pdf_url: string;
  expires_at: string;
  watermark: string | null;
  allow_download: boolean;
  allow_print: boolean;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  keepalive?: boolean;
  token?: string | null;
};

async function libraryRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
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
    throw new LibraryApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const libraryClient = {
  listDocuments(params?: {
    query?: string;
    categories?: string[];
    page?: number;
    pageSize?: number;
    token?: string | null;
  }) {
    const search = new URLSearchParams();
    if (params?.query) search.set("query", params.query);
    if (params?.categories?.length) search.set("categories", params.categories.join(","));
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("page_size", String(params.pageSize));
    const suffix = search.size ? `?${search.toString()}` : "";
    return libraryRequest<LibraryDocumentListResponse>(`/library/documents${suffix}`, {
      token: params?.token,
    });
  },
  getDocument(slug: string, options?: { token?: string | null }) {
    return libraryRequest<LibraryDocumentDetail>(`/library/documents/${slug}`, {
      token: options?.token,
    });
  },
  startReading(slug: string, token: string) {
    return libraryRequest<{ access: LibraryAccess }>(`/library/documents/${slug}/read`, {
      method: "POST",
      token,
      body: {},
    });
  },
  redeemWithPoints(slug: string, token: string) {
    return libraryRequest<{ access: LibraryAccess }>(`/library/documents/${slug}/access/redeem`, {
      method: "POST",
      token,
      body: {},
    });
  },
  createViewerSession(slug: string, token: string) {
    return libraryRequest<LibraryViewerSession>(`/library/documents/${slug}/viewer-session`, {
      method: "POST",
      token,
      body: {},
    });
  },
  updateProgress(
    slug: string,
    token: string,
    payload: {
      currentPage: number;
      pageCount?: number | null;
      timeSpentSeconds?: number;
      markCompleted?: boolean;
    },
    options?: { keepalive?: boolean },
  ) {
    return libraryRequest<LibraryProgress>(`/library/documents/${slug}/progress`, {
      method: "PATCH",
      keepalive: options?.keepalive ?? false,
      token,
      body: {
        current_page: payload.currentPage,
        page_count: payload.pageCount ?? null,
        time_spent_seconds: payload.timeSpentSeconds ?? 0,
        mark_completed: payload.markCompleted ?? false,
      },
    });
  },
  createAnnotation(
    slug: string,
    token: string,
    payload: {
      annotationType: LibraryAnnotationType;
      pageNumber: number;
      body?: string | null;
      selectedText?: string | null;
      geometryJson?: Record<string, unknown> | null;
      color?: string | null;
    },
  ) {
    return libraryRequest<LibraryAnnotation>(`/library/documents/${slug}/annotations`, {
      method: "POST",
      token,
      body: {
        annotation_type: payload.annotationType,
        page_number: payload.pageNumber,
        body: payload.body ?? null,
        selected_text: payload.selectedText ?? null,
        geometry_json: payload.geometryJson ?? null,
        color: payload.color ?? null,
      },
    });
  },
  deleteAnnotation(annotationId: string, token: string) {
    return libraryRequest<void>(`/library/annotations/${annotationId}`, {
      method: "DELETE",
      token,
    });
  },
};
