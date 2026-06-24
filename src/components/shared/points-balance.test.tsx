import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PointsBalance } from "@/components/shared/points-balance";

const summaryPayload = {
  available_points: 610,
  lifetime_points: 610,
  level: {
    code: "pathfinder",
    name: "Pathfinder",
    min_points: 500,
    max_points: 1500,
    next_level_name: "Craft Scholar",
    points_to_next_level: 890,
    progress_percent: 11,
  },
  badges: [
    {
      code: "book_finisher",
      name: "Book Finisher",
      description: "Complete one library book.",
      earned: true,
    },
    {
      code: "course_finisher",
      name: "Course Finisher",
      description: "Complete one course.",
      earned: true,
    },
  ],
  daily_check_in: {
    points: 10,
    available: false,
    checked_in_today: true,
    streak_days: 3,
    next_reset_at: "2026-06-25T00:00:00Z",
  },
  recent_transactions: [
    {
      id: "txn-1",
      event_type: "daily_login",
      points: 10,
      source_label: "Daily login",
      description: "Daily login check-in",
      created_at: "2026-06-24T00:00:00Z",
    },
  ],
};

describe("PointsBalance", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("claims the daily check-in and renders the rewards panel", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        awarded: true,
        awarded_points: 10,
        summary: summaryPayload,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PointsBalance accessToken="test-token" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Points balance" })).toHaveTextContent("610 pts");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/gamification/daily-check-in",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );

    await user.click(screen.getByRole("button", { name: "Points balance" }));

    expect(screen.getAllByText("Pathfinder")).toHaveLength(2);
    expect(screen.getByText("890 to Craft Scholar")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("Book Finisher")).toBeInTheDocument();
    expect(screen.getByText("Redeem coming soon")).toBeInTheDocument();
  });

  it("does not render when the user has no access token", () => {
    render(<PointsBalance accessToken={null} />);

    expect(screen.queryByRole("button", { name: "Points balance" })).not.toBeInTheDocument();
  });
});
