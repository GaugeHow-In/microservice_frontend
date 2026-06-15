import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import GoalDetailPage from "@/app/goals/[slug]/page";
import { mockNotFound } from "@/test/mocks/next";

describe("GoalDetailPage", () => {
  beforeEach(() => {
    mockNotFound.mockClear();
  });

  it("renders the requested goal workspace", async () => {
    const page = await GoalDetailPage({
      params: Promise.resolve({ slug: "placement-goal" }),
    });

    render(page);

    expect(screen.getByRole("heading", { name: "Placement Goal" })).toBeInTheDocument();
    expect(screen.getByText("Milestone timeline")).toBeInTheDocument();
    expect(screen.getByText("Remaining tasks")).toBeInTheDocument();
    expect(screen.getByText("AI suggestions")).toBeInTheDocument();
  });

  it("delegates missing goal slugs to next/notFound", async () => {
    await expect(
      GoalDetailPage({
        params: Promise.resolve({ slug: "missing-goal" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });
});
