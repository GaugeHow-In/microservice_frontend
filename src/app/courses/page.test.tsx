import { createElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CoursesPage from "@/app/courses/page";
import { courses } from "@/lib/mock-data";

describe("CoursesPage", () => {
  it("shows the full catalog on initial render", () => {
    render(createElement(CoursesPage));

    expect(screen.getByRole("heading", { name: /courses built around outcomes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /progress report/i })).toHaveAttribute("href", "/courses/progress");
    expect(screen.getByPlaceholderText(/search dsa, gate, ai\/ml, web development/i)).toBeInTheDocument();

    for (const course of courses) {
      expect(screen.getByText(course.title)).toBeInTheDocument();
    }
  });

  it("filters courses by tab, including the GATE-specific view", async () => {
    const user = userEvent.setup();
    render(createElement(CoursesPage));

    await user.click(screen.getByRole("tab", { name: "gate" }));

    const gatePanel = screen.getByRole("tabpanel");
    expect(within(gatePanel).getByText("GATE Core CS Mastery")).toBeInTheDocument();
    expect(within(gatePanel).queryByText("DSA Interview Sprint")).not.toBeInTheDocument();
  });
});
