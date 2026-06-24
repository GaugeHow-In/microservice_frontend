"use client";

import { API_BASE_URL } from "@/lib/api-base";

export type GamificationLevel = {
  code: string;
  name: string;
  min_points: number;
  max_points: number | null;
  next_level_name: string | null;
  points_to_next_level: number | null;
  progress_percent: number;
};

export type GamificationBadge = {
  code: string;
  name: string;
  description: string;
  earned: boolean;
};

export type DailyCheckIn = {
  points: number;
  available: boolean;
  checked_in_today: boolean;
  streak_days: number;
  next_reset_at: string;
};

export type PointsTransaction = {
  id: string;
  event_type: string;
  points: number;
  source_label: string | null;
  description: string | null;
  created_at: string;
};

export type GamificationSummary = {
  available_points: number;
  lifetime_points: number;
  level: GamificationLevel;
  badges: GamificationBadge[];
  daily_check_in: DailyCheckIn;
  recent_transactions: PointsTransaction[];
};

export type DailyCheckInClaim = {
  awarded: boolean;
  awarded_points: number;
  summary: GamificationSummary;
};

async function gamificationRequest<T>(path: string, token: string, method = "GET"): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    let detail = response.statusText || "Gamification request failed";
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

export const gamificationClient = {
  getSummary(token: string) {
    return gamificationRequest<GamificationSummary>("/gamification/me", token);
  },
  claimDailyCheckIn(token: string) {
    return gamificationRequest<DailyCheckInClaim>("/gamification/daily-check-in", token, "POST");
  },
};
