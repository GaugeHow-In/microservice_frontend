import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, vi } from "vitest";
import "./mocks/next";

vi.mock("@/components/providers/auth-provider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    accessToken: "test-token",
    user: {
      id: "user-1",
      display_name: "Aarav Mehta",
      email: "aarav@example.com",
      handle: "aarav-mehta",
      status: "active",
      timezone: null,
      locale: "en",
      is_email_verified: true,
      roles: ["student"],
      permissions: ["course.read"],
      profile: {
        avatar_key: "orbit",
        first_name: null,
        last_name: null,
        phone_number: null,
        bio: null,
        city: null,
        country: null,
        date_of_birth: null,
        website_url: null,
        linkedin_url: null,
        github_url: null,
        public_bio: null,
        visibility: "public",
      },
    },
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    beginOAuth: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

vi.mock("@/components/shared/theme-toggle", () => ({
  ThemeToggle: () => createElement("button", { type: "button" }, "Theme"),
}));

afterEach(() => {
  cleanup();
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

Element.prototype.scrollIntoView = vi.fn();
