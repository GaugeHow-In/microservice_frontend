import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TestsPage from "@/app/tests/page";

const fetchMock = vi.fn();

describe("TestsPage", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "test-1",
            course_id: null,
            title: "Machine Design Practice",
            slug: "machine-design-practice",
            description: "Standalone timed practice.",
            status: "published",
            duration_seconds: 1800,
            passing_percent: 40,
            is_certificate_required: false,
            question_count: 12,
            max_score: 20,
            access: {
              has_access: true,
              access_type: "free",
              locked_reason: null,
              course_slug: null,
              requires_plus: false,
            },
          },
        ],
        total: 1,
        page: 1,
        page_size: 100,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("renders real backend tests instead of the pending state", async () => {
    render(createElement(TestsPage));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /machine design practice/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /explore tests/i })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByText(/practice tests are not connected yet/i)).not.toBeInTheDocument();
  });
});
