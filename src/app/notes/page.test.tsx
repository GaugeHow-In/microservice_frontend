import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotesPage from "@/app/notes/page";

describe("NotesPage", () => {
  it("renders the backend-pending state instead of mock notes", () => {
    render(createElement(NotesPage));

    expect(screen.getByRole("heading", { name: /notes need a live content api/i })).toBeInTheDocument();
    expect(screen.getByText(/no mock data is rendered here/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /read note/i })).not.toBeInTheDocument();
  });
});
