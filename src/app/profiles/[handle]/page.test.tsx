import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicProfilePage from "@/app/profiles/[handle]/page";

const publicProfilePayload = {
  id: "user-1",
  display_name: "Mira Shah",
  handle: "mira-shah",
  joined_at: "2026-01-15T00:00:00Z",
  public_bio: "Mechanical design learner focused on GD&T and CAD workflows.",
  city: "Pune",
  country: "India",
  website_url: "https://mira.example.test",
  linkedin_url: null,
  github_url: null,
  stats: {
    enrolled_courses: 1,
    completed_courses: 1,
    certificates: 1,
    completed_lessons: 12,
    completed_books: 2,
    correct_checkpoints: 9,
    lifetime_points: 550,
  },
  gamification: {
    lifetime_points: 550,
    level: {
      code: "pathfinder",
      name: "Pathfinder",
      min_points: 500,
      max_points: 1499,
      next_level_name: "Artisan",
      points_to_next_level: 950,
      progress_percent: 5,
    },
    earned_badges: [
      {
        code: "course_finisher",
        name: "Course Finisher",
        description: "Completed a course.",
        earned: true,
      },
    ],
  },
  courses: [
    {
      id: "course-1",
      title: "GD&T Fundamentals",
      slug: "gdt-fundamentals",
      short_description: "Tolerance stackups and inspection-ready drawings.",
      level: "beginner",
      progress_percent: 100,
      status: "completed",
      enrolled_at: "2026-03-01T00:00:00Z",
      completed_at: "2026-03-12T00:00:00Z",
      certificate_enabled: true,
    },
  ],
  certificates: [
    {
      certificate_number: "GH-GDT-000000000001",
      course_title: "GD&T Fundamentals",
      course_slug: "gdt-fundamentals",
      issued_at: "2026-03-12T00:00:00Z",
      verification_url: "https://example.test/verify-certificate/GH-GDT-000000000001",
    },
  ],
};

describe("PublicProfilePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(publicProfilePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("loads and renders a shareable learner profile", async () => {
    render(
      createElement(PublicProfilePage, {
        params: Promise.resolve({ handle: "mira-shah" }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Mira Shah" })).toBeInTheDocument();
    });

    expect(screen.getByText("@mira-shah")).toBeInTheDocument();
    expect(screen.getAllByText("Pathfinder").length).toBeGreaterThan(0);
    expect(screen.getByText("Course Finisher")).toBeInTheDocument();
    expect(screen.getAllByText("GD&T Fundamentals")).toHaveLength(2);
    expect(screen.getByText("GH-GDT-000000000001 issued Mar 2026")).toBeInTheDocument();
  });

  it("shows a private or missing profile state for 404 responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      createElement(PublicProfilePage, {
        params: Promise.resolve({ handle: "private-learner" }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/private or does not exist/i)).toBeInTheDocument();
    });
  });
});
