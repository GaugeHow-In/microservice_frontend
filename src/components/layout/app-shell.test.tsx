import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { mockUsePathname } from "@/test/mocks/next";

describe("AppShell", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/notes/dbms-transactions");
  });

  it("derives the active section label from nested routes", () => {
    render(
      createElement(AppShell, null, createElement("div", null, "Inner content")),
    );

    expect(screen.getByRole("link", { name: /gaugehowlearning os/i })).toHaveAttribute("href", "/");
    expect(screen.getAllByText("Notes").length).toBeGreaterThan(0);
    expect(screen.getByText("Search courses, notes, books, tests")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /notes/i })[0]).toHaveAttribute("href", "/notes");
    expect(screen.getByText("Aarav Mehta")).toBeInTheDocument();
  });

  it("opens and closes the mobile drawer", async () => {
    const user = userEvent.setup();

    render(
      createElement(AppShell, null, createElement("div", null, "Inner content")),
    );

    expect(screen.queryByRole("button", { name: "Close navigation" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getAllByRole("button", { name: "Close navigation" })).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Close navigation" })[1]);
    expect(screen.queryByRole("button", { name: "Close navigation" })).not.toBeInTheDocument();
  });
});
