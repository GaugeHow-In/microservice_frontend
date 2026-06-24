import { API_BASE_URL } from "@/lib/api-base";
import type { CourseLevel, EnrollmentStatus } from "@/lib/learning-client";

export class ProfileApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProfileApiError";
    this.status = status;
  }
}

export type PublicProfileLevel = {
  code: string;
  name: string;
  min_points: number;
  max_points: number | null;
  next_level_name: string | null;
  points_to_next_level: number | null;
  progress_percent: number;
};

export type PublicProfileBadge = {
  code: string;
  name: string;
  description: string;
  earned: boolean;
};

export type PublicProfileStats = {
  enrolled_courses: number;
  completed_courses: number;
  certificates: number;
  completed_lessons: number;
  completed_books: number;
  correct_checkpoints: number;
  lifetime_points: number;
};

export type PublicProfileCourse = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  level: CourseLevel;
  progress_percent: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  certificate_enabled: boolean;
};

export type PublicProfileCertificate = {
  certificate_number: string;
  course_title: string;
  course_slug: string;
  issued_at: string;
  verification_url: string;
};

export type PublicProfile = {
  id: string;
  display_name: string;
  handle: string;
  joined_at: string;
  public_bio: string | null;
  city: string | null;
  country: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  stats: PublicProfileStats;
  gamification: {
    lifetime_points: number;
    level: PublicProfileLevel;
    earned_badges: PublicProfileBadge[];
  };
  courses: PublicProfileCourse[];
  certificates: PublicProfileCertificate[];
};

async function profileRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    let message = response.statusText || "Profile request failed";
    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail ?? message;
    } catch {
      // Keep the status text fallback.
    }
    throw new ProfileApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const profileClient = {
  getPublicProfile(handle: string) {
    return profileRequest<PublicProfile>(`/profiles/${encodeURIComponent(handle)}`);
  },
};
