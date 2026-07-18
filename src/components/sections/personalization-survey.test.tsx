import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalizationSurvey } from "@/components/sections/personalization-survey";
import type { StudentAIContext } from "@/lib/ai-client";

const updateContext = vi.fn().mockResolvedValue({});
const updateProfile = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/ai-client", () => ({
  aiClient: { updateContext: (...args: unknown[]) => updateContext(...args) },
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ accessToken: "test-token", updateProfile }),
}));

const emptyContext: StudentAIContext = {
  academic_level: null,
  degree: null,
  institution: null,
  target_exams: [],
  goals: [],
  interests: [],
  preferred_language: null,
  weekly_study_hours: null,
  referral_source: null,
  onboarding_skipped: false,
};

function renderSurvey(overrides: Partial<Parameters<typeof PersonalizationSurvey>[0]> = {}) {
  const onDone = vi.fn();
  render(
    createElement(PersonalizationSurvey, {
      baseContext: emptyContext,
      initialPhone: "",
      mode: "onboarding",
      onDone,
      ...overrides,
    }),
  );
  return { onDone };
}

describe("PersonalizationSurvey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("walks through every step and saves the answers plus phone", async () => {
    const { onDone } = renderSurvey();

    // Step 0 requires a role before advancing.
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    fireEvent.click(screen.getByText("3rd or 4th year student"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 1 — interests (multi-select).
    fireEvent.click(screen.getByText("Design Engineer"));
    fireEvent.click(screen.getByText("EV/Battery Engineer"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2 — referral.
    fireEvent.click(screen.getByText("Instagram"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3 — phone, then finish.
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), {
      target: { value: "+91 9876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));

    await vi.waitFor(() => expect(updateContext).toHaveBeenCalledTimes(1));
    expect(updateContext).toHaveBeenCalledWith("test-token", {
      ...emptyContext,
      academic_level: "intermediate",
      interests: ["Design Engineer", "EV/Battery Engineer"],
      referral_source: "Instagram",
      onboarding_skipped: false,
    });
    expect(updateProfile).toHaveBeenCalledWith({ phone_number: "+91 9876543210" });
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("blocks finishing on an invalid phone number", async () => {
    renderSurvey({ baseContext: { ...emptyContext, academic_level: "beginner" } });

    fireEvent.click(screen.getByText("1st or 2nd year student"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), {
      target: { value: "abc" },
    });
    expect(screen.getByText("Enter a valid phone number.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finish/i })).toBeDisabled();
    expect(updateContext).not.toHaveBeenCalled();
  });

  it("skip records the dismissal without collecting answers", async () => {
    const { onDone } = renderSurvey();

    fireEvent.click(screen.getByRole("button", { name: "skip" }));

    await vi.waitFor(() => expect(updateContext).toHaveBeenCalledTimes(1));
    expect(updateContext).toHaveBeenCalledWith("test-token", {
      ...emptyContext,
      onboarding_skipped: true,
    });
    expect(updateProfile).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("edit mode shows a plain Cancel instead of the subtle skip", () => {
    const onDone = vi.fn();
    renderSurvey({ mode: "edit", onDone });

    expect(screen.queryByRole("button", { name: "skip" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
