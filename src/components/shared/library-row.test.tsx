import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryRow } from "@/components/shared/library-row";
import type { LibraryDocumentCatalogItem } from "@/lib/library-client";

function makeDocument(
  overrides: Partial<LibraryDocumentCatalogItem> = {},
): LibraryDocumentCatalogItem {
  return {
    id: "doc-1",
    title: "GD&T Handbook",
    slug: "gdt-handbook",
    short_description: null,
    author_name: "GaugeHow",
    status: "published",
    page_count: 120,
    estimated_read_minutes: 40,
    thumbnail_url: null,
    category: { id: "cat-1", name: "Metrology", slug: "metrology" },
    points_price: 500,
    is_free: false,
    requires_plus: false,
    has_access: false,
    access: null,
    progress: null,
    ...overrides,
  };
}

describe("LibraryRow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redeems a book with points and notifies the parent", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ access: { has_access: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onRedeemed = vi.fn();

    render(
      <LibraryRow document={makeDocument()} accessToken="test-token" onRedeemed={onRedeemed} />,
    );

    // The redeem control surfaces the cost.
    const redeemButton = screen.getByRole("button", { name: /500/ });
    await user.click(redeemButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/v1/library/documents/gdt-handbook/access/redeem",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
        }),
      ),
    );
    await waitFor(() => expect(onRedeemed).toHaveBeenCalledWith("gdt-handbook"));
  });

  it("shows the server error and does not notify the parent when redeem fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Not enough points. This needs 500 points and you have 100." }),
      }),
    );
    const onRedeemed = vi.fn();

    render(
      <LibraryRow document={makeDocument()} accessToken="test-token" onRedeemed={onRedeemed} />,
    );

    await user.click(screen.getByRole("button", { name: /500/ }));

    expect(await screen.findByText(/Not enough points/)).toBeInTheDocument();
    expect(onRedeemed).not.toHaveBeenCalled();
  });

  it("hides the redeem control once the book is unlocked", () => {
    render(
      <LibraryRow
        document={makeDocument({ has_access: true, points_price: 500 })}
        accessToken="test-token"
      />,
    );

    expect(screen.queryByRole("button", { name: /500/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Unlocked")).toBeInTheDocument();
  });

  it("does not offer redemption for a book with no points price", () => {
    render(
      <LibraryRow document={makeDocument({ points_price: null })} accessToken="test-token" />,
    );

    expect(screen.queryByRole("button", { name: /500/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View/ })).toBeInTheDocument();
  });

  it("resumes an in-progress unlocked book", () => {
    render(
      <LibraryRow
        document={makeDocument({
          has_access: true,
          points_price: null,
          progress: {
            current_page: 12,
            page_count: 120,
            progress_percent: 40,
            time_spent_seconds: 0,
            completed_at: null,
            last_accessed_at: null,
          },
        })}
        accessToken="test-token"
      />,
    );

    expect(screen.getByRole("link", { name: /Resume/ })).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
