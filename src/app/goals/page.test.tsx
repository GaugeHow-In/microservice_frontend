import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GoalsPage from "@/app/goals/page";

describe("GoalsPage", () => {
  it("renders the backend-pending state instead of mock goals", () => {
    render(createElement(GoalsPage));

    expect(screen.getByRole("heading", { name: /goals are waiting for the real backend/i })).toBeInTheDocument();
    expect(screen.getByText(/no mock data is rendered here/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open live courses/i })).toHaveAttribute("href", "/courses");
  });
});
