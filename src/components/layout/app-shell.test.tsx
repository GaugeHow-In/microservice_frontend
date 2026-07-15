import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { LearningContextProvider } from "@/components/providers/learning-context-provider";
import { mockUsePathname } from "@/test/mocks/next";

const logout = vi.fn();

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    accessToken: null,
    user: {
      display_name: "Aarav Mehta",
      email: "aarav@example.com",
      roles: ["student"],
    },
    isLoading: false,
    logout,
  }),
}));

/**
 * The shell renders one <aside> that is an overlay drawer on mobile and an
 * in-flow column on desktop, so elements scoped to a single breakpoint (the
 * two brand logos, the drawer's close button) are all present in jsdom, where
 * Tailwind's responsive classes never apply. Queries here take the first match
 * rather than assuming a single element.
 */
describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
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

  function getSidebar() {
    const sidebar = document.querySelector("aside");
    if (!sidebar) throw new Error("sidebar not rendered");
    return sidebar;
  }

  it("derives the active section label from nested routes", () => {
    renderShell();

    // Signed in, the lockup goes to the dashboard rather than the marketing home.
    for (const logo of screen.getAllByRole("link", { name: /gaugehowlearning os/i })) {
      expect(logo).toHaveAttribute("href", "/dashboard");
    }
    expect(screen.getAllByText("Courses").length).toBeGreaterThan(0);
    expect(screen.getByText("Search courses")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /courses/i })[0]).toHaveAttribute("href", "/courses");
    expect(screen.getByText("Aarav Mehta")).toBeInTheDocument();
  });

  it("opens and closes the mobile drawer", async () => {
    const user = userEvent.setup();

    renderShell();

    expect(getSidebar()).toHaveAttribute("data-drawer-open", "false");

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(getSidebar()).toHaveAttribute("data-drawer-open", "true");

    // The backdrop is the first "Close navigation" control in DOM order.
    await user.click(screen.getAllByRole("button", { name: "Close navigation" })[0]);
    expect(getSidebar()).toHaveAttribute("data-drawer-open", "false");
  });

  it("collapses the sidebar and remembers the choice", async () => {
    const user = userEvent.setup();

    const { unmount } = renderShell();

    expect(getSidebar()).toHaveAttribute("data-collapsed", "false");

    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    expect(getSidebar()).toHaveAttribute("data-collapsed", "true");

    unmount();
    renderShell();

    expect(getSidebar()).toHaveAttribute("data-collapsed", "true");
    expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  });

  it("opens the account menu from the avatar", async () => {
    const user = userEvent.setup();

    renderShell();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("aarav@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /profile/i })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("menuitem", { name: /settings/i })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("menuitem", { name: /log out/i })).toBeInTheDocument();
  });

  it("asks for confirmation before logging out", async () => {
    const user = userEvent.setup();

    renderShell();

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(screen.getByRole("menuitem", { name: /log out/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Log out of GaugeHow?")).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out only after the warning is confirmed", async () => {
    const user = userEvent.setup();

    renderShell();

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(screen.getByRole("menuitem", { name: /log out/i }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(logout).toHaveBeenCalledOnce();
  });
});
