"use client";

import { API_BASE_URL } from "@/lib/api-base";

export type NotificationCategory = "general" | "course" | "maintenance" | "promotion";

export type NotificationItem = {
  id: string;
  title: string;
  body_text: string;
  category: NotificationCategory;
  action_url: string | null;
  action_label: string | null;
  published_at: string;
  read: boolean;
};

export type NotificationFeed = {
  items: NotificationItem[];
  unread_count: number;
};

export type UnreadCount = {
  unread_count: number;
};

async function notificationRequest<T>(path: string, token: string, method = "GET"): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    let detail = response.statusText || "Notification request failed";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      // Keep the status text fallback.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export const notificationClient = {
  getFeed(token: string) {
    return notificationRequest<NotificationFeed>("/notifications/me", token);
  },
  getUnreadCount(token: string) {
    return notificationRequest<UnreadCount>("/notifications/me/unread-count", token);
  },
  markRead(token: string, id: string) {
    return notificationRequest<UnreadCount>(`/notifications/${id}/read`, token, "POST");
  },
  markAllRead(token: string) {
    return notificationRequest<UnreadCount>("/notifications/me/read-all", token, "POST");
  },
  dismiss(token: string, id: string) {
    return notificationRequest<UnreadCount>(`/notifications/${id}/dismiss`, token, "POST");
  },
};
