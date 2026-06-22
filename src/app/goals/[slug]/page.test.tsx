import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GoalDetailPage from "@/app/goals/[slug]/page";

describe("GoalDetailPage", () => {
  it("renders the backend-pending state instead of mock goal details", () => {
    render(createElement(GoalDetailPage));

    expect(screen.getByRole("heading", { name: /goal details are not connected yet/i })).toBeInTheDocument();
    expect(screen.getByText(/static goal fixtures/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open live courses/i })).toHaveAttribute("href", "/courses");
  });
});
