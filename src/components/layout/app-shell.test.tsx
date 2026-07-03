import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { LearningContextProvider } from "@/components/providers/learning-context-provider";
import { mockUsePathname } from "@/test/mocks/next";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    accessToken: null,
    user: {
      display_name: "Aarav Mehta",
      email: "aarav@example.com",
      roles: ["student"],
    },
    isLoading: false,
    logout: vi.fn(),
  }),
}));

describe("AppShell", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/courses/autocad-design-drafting");
  });

  function renderShell() {
    return render(
      createElement(
        LearningContextProvider,
        null,
        createElement(AppShell, null, createElement("div", null, "Inner content")),
      ),
    );
  }

  it("derives the active section label from nested routes", () => {
    renderShell();

    expect(screen.getByRole("link", { name: /gaugehowlearning os/i })).toHaveAttribute("href", "/");
    expect(screen.getAllByText("Courses").length).toBeGreaterThan(0);
    expect(screen.getByText("Search courses")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /courses/i })[0]).toHaveAttribute("href", "/courses");
    expect(screen.getByText("Aarav Mehta")).toBeInTheDocument();
  });

  it("opens and closes the mobile drawer", async () => {
    const user = userEvent.setup();

    renderShell();

    expect(screen.queryByRole("button", { name: "Close navigation" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getAllByRole("button", { name: "Close navigation" })).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Close navigation" })[1]);
    expect(screen.queryByRole("button", { name: "Close navigation" })).not.toBeInTheDocument();
  });
});
