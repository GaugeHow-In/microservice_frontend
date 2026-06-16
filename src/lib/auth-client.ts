"use client";

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

export type AuthPayload = {
  access_token: string;
  expires_at: string;
  csrf_token: string;
  token_type: "bearer";
  user: AuthUser;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "http://localhost:8000/api/v1";

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  csrfToken?: string | null;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.csrfToken ? { "X-CSRF-Token": options.csrfToken } : {}),
    },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
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
  return cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null;
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
    return apiRequest<{ message: string }>("/auth/verify-email", {
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
  getOAuthUrl(provider: "google" | "github", redirectTo = "/dashboard") {
    return apiRequest<{ authorization_url: string }>(
      `/auth/oauth/${provider}?redirect_to=${encodeURIComponent(redirectTo)}`,
    );
  },
};
