"use client";

import { API_BASE_URL } from "@/lib/api-base";

type FieldErrors = Partial<Record<"displayName" | "email" | "password" | "code" | "newPassword", string>>;

type ApiValidationIssue = {
  loc?: Array<string | number>;
  msg?: string;
};

export class AuthApiError extends Error {
  fieldErrors: FieldErrors;
  status: number;

  constructor(message: string, options: { fieldErrors?: FieldErrors; status: number }) {
    super(message);
    this.name = "AuthApiError";
    this.fieldErrors = options.fieldErrors ?? {};
    this.status = options.status;
  }
}

export type AuthUser = {
  id: string;
  display_name: string;
  email: string;
  handle: string | null;
  status: string;
  timezone: string | null;
  locale: string | null;
  is_email_verified: boolean;
  roles: string[];
  permissions: string[];
  profile: {
    avatar_key: string | null;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    date_of_birth: string | null;
    website_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    public_bio: string | null;
    visibility: string;
  } | null;
};

export type ProfileUpdateInput = {
  display_name?: string;
  timezone?: string | null;
  locale?: string | null;
  avatar_key?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  public_bio?: string | null;
  visibility?: string | null;
};

export type AuthPayload = {
  access_token: string;
  expires_at: string;
  csrf_token: string;
  token_type: "bearer";
  user: AuthUser;
};

const CSRF_STORAGE_KEY = "gaugehow_csrf_token";

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  csrfToken?: string | null;
};

function mapValidationField(field: string): keyof FieldErrors | null {
  switch (field) {
    case "display_name":
      return "displayName";
    case "email":
      return "email";
    case "password":
      return "password";
    case "code":
      return "code";
    case "new_password":
      return "newPassword";
    default:
      return null;
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.csrfToken ? { "X-CSRF-Token": options.csrfToken } : {}),
      },
      credentials: "include",
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new AuthApiError(
      "Unable to reach the authentication service. Check that the backend is running and the frontend origin is allowed.",
      { status: 0 },
    );
  }

  if (!response.ok) {
    let detail = "Request failed";
    const fieldErrors: FieldErrors = {};
    try {
      const payload = (await response.json()) as { detail?: string | ApiValidationIssue[] };
      if (Array.isArray(payload.detail)) {
        for (const issue of payload.detail) {
          const field = issue.loc?.[issue.loc.length - 1];
          if (typeof field === "string") {
            const mappedField = mapValidationField(field);
            if (mappedField && issue.msg) {
              fieldErrors[mappedField] = issue.msg;
            }
          }
        }
        detail = Object.values(fieldErrors)[0] ?? "Please review the highlighted fields.";
      } else {
        detail = payload.detail ?? detail;
      }
    } catch {
      detail = response.statusText || detail;
    }
    throw new AuthApiError(detail, { fieldErrors, status: response.status });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getCsrfCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("gaugehow_csrf_token="));
  if (cookie) {
    return decodeURIComponent(cookie.split("=")[1] ?? "");
  }
  return window.localStorage.getItem(CSRF_STORAGE_KEY);
}

export function storeCsrfToken(csrfToken: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CSRF_STORAGE_KEY, csrfToken);
}

export function clearStoredCsrfToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(CSRF_STORAGE_KEY);
}

export const authClient = {
  register(input: { displayName: string; email: string; password: string }) {
    return apiRequest<{ message: string }>("/auth/register", {
      method: "POST",
      body: {
        display_name: input.displayName,
        email: input.email,
        password: input.password,
        device: { platform: "web", device_name: "Browser" },
      },
    });
  },
  login(input: { email: string; password: string }) {
    return apiRequest<AuthPayload>("/auth/login", {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
        device: { platform: "web", device_name: "Browser" },
      },
    });
  },
  refresh(csrfToken: string) {
    return apiRequest<AuthPayload>("/auth/refresh", {
      method: "POST",
      csrfToken,
    });
  },
  logout(token: string) {
    return apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      token,
    });
  },
  logoutAll(token: string) {
    return apiRequest<{ message: string }>("/auth/logout-all", {
      method: "POST",
      token,
    });
  },
  verifyEmail(input: { email: string; code: string }) {
    return apiRequest<AuthPayload>("/auth/verify-email", {
      method: "POST",
      body: input,
    });
  },
  resendVerification(email: string) {
    return apiRequest<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: { email },
    });
  },
  forgotPassword(email: string) {
    return apiRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  },
  resetPassword(input: { email: string; code: string; newPassword: string }) {
    return apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: {
        email: input.email,
        code: input.code,
        new_password: input.newPassword,
      },
    });
  },
  getMe(token: string) {
    return apiRequest<AuthUser>("/auth/me", { token });
  },
  updateProfile(token: string, input: ProfileUpdateInput) {
    return apiRequest<AuthUser>("/users/me", {
      method: "PATCH",
      token,
      body: input,
    });
  },
  getOAuthUrl(provider: "google", redirectTo = "/dashboard") {
    return apiRequest<{ authorization_url: string }>(
      `/auth/oauth/${provider}?redirect_to=${encodeURIComponent(redirectTo)}`,
    );
  },
};
