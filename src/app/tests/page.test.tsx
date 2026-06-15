import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TestsPage from "@/app/tests/page";
import { performanceTrend, tests } from "@/lib/mock-data";

describe("TestsPage", () => {
  it("renders test summaries, performance trend points, and quick links", () => {
    render(createElement(TestsPage));

    expect(screen.getByRole("heading", { name: /practice, analyze, and improve with measurable feedback/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /analytics/i })[0]).toHaveAttribute("href", "/tests/analytics");

    for (const test of tests) {
      expect(screen.getByText(test.title)).toBeInTheDocument();
    }

    for (const day of performanceTrend) {
      expect(screen.getByText(day.label)).toBeInTheDocument();
    }

    expect(screen.getAllByRole("link", { name: /active tests|previous tests|results|analytics/i })).toHaveLength(5);
  });
});
