import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TestsPage from "@/app/tests/page";

describe("TestsPage", () => {
  it("renders the backend-pending state instead of mock tests", () => {
    render(createElement(TestsPage));

    expect(screen.getByRole("heading", { name: /practice tests are not connected yet/i })).toBeInTheDocument();
    expect(screen.getByText(/static test cards and fake performance trends have been removed/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /analytics/i })).not.toBeInTheDocument();
  });
});
