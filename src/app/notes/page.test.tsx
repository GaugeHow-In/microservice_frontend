import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotesPage from "@/app/notes/page";
import { notes } from "@/lib/mock-data";

describe("NotesPage", () => {
  it("renders unique categories and note cards from the dataset", () => {
    render(createElement(NotesPage));

    expect(screen.getByRole("heading", { name: /read smarter notes with highlights and progress/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search dbms, dsa, os, ai\/ml notes/i)).toBeInTheDocument();

    const uniqueCategories = [...new Set(notes.map((note) => note.category))];
    for (const category of uniqueCategories) {
      expect(screen.getAllByText(category).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByRole("link", { name: /read note/i })).toHaveLength(notes.length);
  });
});
