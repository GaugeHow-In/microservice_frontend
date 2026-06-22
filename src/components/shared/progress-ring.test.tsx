import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressRing } from "@/components/shared/progress-ring";

describe("ProgressRing", () => {
  it("renders value, label, and computed conic gradient", () => {
    render(createElement(ProgressRing, { value: 72, label: "Goal", size: "lg" }));

    const ring = screen.getByLabelText("Goal 72%");
    expect(ring).toHaveTextContent("72%");
    expect(ring).toHaveTextContent("Goal");
    expect(ring).toHaveClass("size-32");
    expect(ring).toHaveStyle({
      background: "conic-gradient(var(--color-orange-400) 259.2deg, var(--color-slate-200) 0deg)",
    });
  });

  it("uses the default progress label when a custom label is absent", () => {
    render(createElement(ProgressRing, { value: 46 }));

    expect(screen.getByLabelText("Progress 46%")).toHaveTextContent("46%");
  });
});
