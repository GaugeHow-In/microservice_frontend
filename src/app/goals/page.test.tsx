import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GoalsPage from "@/app/goals/page";
import { goals } from "@/lib/mock-data";

describe("GoalsPage", () => {
  it("renders every goal from the inventory with its CTA", () => {
    render(createElement(GoalsPage));

    expect(screen.getByRole("heading", { name: /turn ambition into visible milestones/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create goal/i })).toBeInTheDocument();

    for (const goal of goals) {
      expect(screen.getByText(goal.title)).toBeInTheDocument();
    }

    expect(screen.getAllByRole("link", { name: /open goal/i })).toHaveLength(goals.length);
    expect(screen.getByText(/ai goal coach/i)).toBeInTheDocument();
  });
});
