import { createElement } from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockReplace } from "@/test/mocks/next";
import type { AuthUser } from "@/lib/auth-client";
import Home from "@/app/page";

const authState: { user: AuthUser | null; isLoading: boolean } = {
  user: null,
  isLoading: false,
};

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => authState,
}));

function signedIn() {
  authState.user = { id: "user-1" } as AuthUser;
  authState.isLoading = false;
}

describe("Home (apex bouncer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.isLoading = false;
  });

  it("sends a signed-in visitor to the dashboard", () => {
    signedIn();

    render(createElement(Home));

    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("sends a signed-out visitor to the login page", () => {
    render(createElement(Home));

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("waits for the session check before redirecting", () => {
    authState.isLoading = true;

    render(createElement(Home));

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects once the pending session resolves to a user", () => {
    authState.isLoading = true;
    const { rerender } = render(createElement(Home));

    signedIn();
    rerender(createElement(Home));

    expect(mockReplace).toHaveBeenCalledExactlyOnceWith("/dashboard");
  });
});
