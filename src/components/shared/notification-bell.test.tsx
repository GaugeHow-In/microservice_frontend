import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/components/shared/notification-bell";

const feedPayload = {
  unread_count: 2,
  items: [
    {
      id: "announcement-1",
      title: "New GD&T course",
      body_text: "The GD&T fundamentals course is live.",
      category: "course",
      action_url: "https://gaugehow.com/courses/gdt",
      action_label: "View course",
      published_at: new Date().toISOString(),
      read: false,
    },
    {
      id: "announcement-2",
      title: "Scheduled maintenance",
      body_text: "We are upgrading tonight.",
      category: "maintenance",
      action_url: null,
      action_label: null,
      published_at: new Date().toISOString(),
      read: false,
    },
  ],
};

function mockFetch(handler: (url: string) => unknown) {
  const fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    json: async () => handler(url),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("NotificationBell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the unread count on the bell", async () => {
    mockFetch(() => ({ unread_count: 2 }));

    render(<NotificationBell accessToken="test-token" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Notifications, 2 unread" }),
      ).toHaveTextContent("2");
    });
  });

  it("caps the badge at 99+", async () => {
    mockFetch(() => ({ unread_count: 140 }));

    render(<NotificationBell accessToken="test-token" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /140 unread/ })).toHaveTextContent("99+");
    });
  });

  it("loads the feed when opened and marks an item read on click", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      if (url.endsWith("/notifications/me")) return feedPayload;
      if (url.endsWith("/read")) return { unread_count: 1 };
      return { unread_count: 2 };
    });

    render(<NotificationBell accessToken="test-token" />);

    await user.click(await screen.findByRole("button", { name: /Notifications/ }));

    expect(await screen.findByText("New GD&T course")).toBeInTheDocument();
    expect(screen.getByText("Scheduled maintenance")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View course" })).toHaveAttribute(
      "href",
      "https://gaugehow.com/courses/gdt",
    );

    await user.click(screen.getByText("New GD&T course"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/v1/notifications/announcement-1/read",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument();
    });
  });

  it("removes an item from the feed when dismissed", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      if (url.endsWith("/notifications/me")) return feedPayload;
      if (url.endsWith("/dismiss")) return { unread_count: 1 };
      return { unread_count: 2 };
    });

    render(<NotificationBell accessToken="test-token" />);
    await user.click(await screen.findByRole("button", { name: /Notifications/ }));
    await screen.findByText("New GD&T course");

    await user.click(screen.getByRole("button", { name: "Dismiss New GD&T course" }));

    await waitFor(() => {
      expect(screen.queryByText("New GD&T course")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/notifications/announcement-1/dismiss",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an empty state when there is nothing to read", async () => {
    const user = userEvent.setup();
    mockFetch((url) =>
      url.endsWith("/notifications/me") ? { items: [], unread_count: 0 } : { unread_count: 0 },
    );

    render(<NotificationBell accessToken="test-token" />);
    await user.click(await screen.findByRole("button", { name: "Notifications" }));

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });

  it("does not render when the user has no access token", () => {
    render(<NotificationBell accessToken={null} />);

    expect(screen.queryByRole("button", { name: /Notifications/ })).not.toBeInTheDocument();
  });
});
