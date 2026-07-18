import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourseCard } from "@/components/shared/course-card";
import type { CourseCatalogItem } from "@/lib/learning-client";

function makeCourse(overrides: Partial<CourseCatalogItem> = {}): CourseCatalogItem {
  return {
    id: "c1",
    title: "AutoCAD Design & Drafting",
    slug: "autocad-design-drafting",
    short_description: "Master 2D drafting.",
    status: "published",
    level: "beginner",
    duration_minutes: 200,
    lesson_count: 24,
    certificate_enabled: true,
    average_rating: 4.6,
    total_reviews: 312,
    thumbnail_url: null,
    categories: [{ id: "cat1", name: "Mechanical", slug: "mechanical" }],
    instructors: [
      {
        id: "i1",
        display_name: "Rehman Khan",
        handle: null,
        one_line_description: null,
        linkedin_url: null,
      },
    ],
    is_free: false,
    requires_plus: true,
    access: null,
    ...overrides,
  };
}

describe("CourseCard", () => {
  it("renders a whole-card link to the course detail page", () => {
    render(createElement(CourseCard, { course: makeCourse() }));

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/courses/autocad-design-drafting");
    // Coursera-style: the entire card is the link, no separate CTA button.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the rating, lessons and duration in the footer", () => {
    render(createElement(CourseCard, { course: makeCourse() }));

    expect(screen.getByText("4.6")).toBeInTheDocument();
    expect(screen.getByText("(312)")).toBeInTheDocument();
    expect(screen.getByText("24 lessons")).toBeInTheDocument();
    expect(screen.getByText("3h 20m")).toBeInTheDocument();
    expect(screen.getByText("Rehman Khan")).toBeInTheDocument();
  });

  it("surfaces enrolled state with a progress readout", () => {
    render(
      createElement(CourseCard, {
        course: makeCourse({
          access: {
            status: "active",
            has_access: true,
            unlocked_by: "plus",
            is_enrolled: true,
            free_trial_lesson_count: 2,
            progress_percent: 42,
            current_lesson_id: null,
          } as CourseCatalogItem["access"],
        }),
      }),
    );

    expect(screen.getByText("Enrolled")).toBeInTheDocument();
    expect(screen.getByText("42% complete")).toBeInTheDocument();
  });
});
