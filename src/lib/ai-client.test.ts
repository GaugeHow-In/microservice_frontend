import { describe, expect, it } from "vitest";
import { needsPersonalization, type StudentAIContext } from "@/lib/ai-client";

const base: StudentAIContext = {
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

describe("needsPersonalization", () => {
  it("prompts a brand-new learner with no context row", () => {
    expect(needsPersonalization(null)).toBe(true);
  });

  it("prompts when the context exists but holds no meaningful signal", () => {
    expect(needsPersonalization(base)).toBe(true);
  });

  it("does not prompt once the learner has explicitly skipped", () => {
    expect(needsPersonalization({ ...base, onboarding_skipped: true })).toBe(false);
  });

  it("does not prompt once any answer is present", () => {
    expect(needsPersonalization({ ...base, academic_level: "beginner" })).toBe(false);
    expect(needsPersonalization({ ...base, interests: ["Design Engineer"] })).toBe(false);
    expect(needsPersonalization({ ...base, referral_source: "Instagram" })).toBe(false);
  });
});
