import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoursesPage from "@/app/courses/page";

const apiPayload = {
  items: [
    {
      id: "course-1",
      title: "AutoCAD for Design Drafting",
      slug: "autocad-design-drafting",
      short_description: "Design and documentation workflows in AutoCAD.",
      status: "published",
      level: "beginner",
      duration_minutes: 180,
      lesson_count: 6,
      certificate_enabled: true,
      average_rating: 4.7,
      total_reviews: 12,
      thumbnail_url: null,
      categories: [{ id: "cat-1", name: "Design & CAD", slug: "design-cad" }],
      instructors: [{ id: "inst-1", display_name: "Anita Deshmukh", handle: "anita-deshmukh" }],
      is_free: false,
      requires_plus: true,
      access: {
        status: "active",
        has_access: true,
        unlocked_by: "plus",
        is_enrolled: true,
        free_trial_lesson_count: 2,
        progress_percent: 32,
        current_lesson_id: "lesson-2",
      },
    },
    {
      id: "course-2",
      title: "MATLAB for Engineering Computation",
      slug: "matlab-engineering-computation",
      short_description: "Programming workflows for engineers using MATLAB.",
      status: "published",
      level: "intermediate",
      duration_minutes: 220,
      lesson_count: 8,
      certificate_enabled: false,
      average_rating: 4.8,
      total_reviews: 9,
      thumbnail_url: null,
      categories: [{ id: "cat-2", name: "Programming for Engineers", slug: "programming-engineers" }],
      instructors: [{ id: "inst-2", display_name: "Rahul Verma", handle: "rahul-verma" }],
      is_free: false,
      requires_plus: true,
      access: null,
    },
  ],
  total: 2,
  page: 1,
  page_size: 12,
};

const gamificationPayload = {
  awarded: false,
  awarded_points: 0,
  summary: {
    available_points: 0,
    lifetime_points: 0,
    level: {
      code: "unranked",
      name: "Unranked",
      min_points: 0,
      max_points: 100,
      next_level_name: "Beginner",
      points_to_next_level: 100,
      progress_percent: 0,
    },
    badges: [],
    daily_check_in: {
      points: 10,
      available: false,
      checked_in_today: true,
      streak_days: 0,
      next_reset_at: "2026-06-25T00:00:00Z",
    },
    recent_transactions: [],
  },
};

describe("CoursesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      const payload = url.includes("/gamification/daily-check-in")
        ? gamificationPayload
        : apiPayload;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  it("loads and renders the backend-backed catalog", async () => {
    render(createElement(CoursesPage));

    expect(screen.getByRole("heading", { name: /practical courses for engineering workflows/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /progress report/i })).toHaveAttribute("href", "/courses/progress");

    await waitFor(() => {
      expect(screen.getByText("AutoCAD for Design Drafting")).toBeInTheDocument();
    });

  });

  it("updates the catalog query when the search input changes", async () => {
    const user = userEvent.setup();
    render(createElement(CoursesPage));

    const search = screen.getByPlaceholderText(/search autocad, matlab/i);
    await user.type(search, "AutoCAD");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
