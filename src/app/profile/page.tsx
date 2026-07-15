"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowSquareOut, BookOpen, CalendarDots, FloppyDisk, GraduationCap, MapPin, Medal, MedalMilitary, Pencil, SealCheck, ShareNetwork, Shield, Sparkle, Trophy } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PROFILE_AVATARS, getProfileAvatar } from "@/lib/profile-avatars";
import { profileClient, type PublicProfile } from "@/lib/profile-client";
import { cn } from "@/lib/utils";

type ProfileFormState = {
  avatar_key: string;
  display_name: string;
  phone_number: string;
  date_of_birth: string;
  public_bio: string;
  city: string;
  country: string;
  website_url: string;
  linkedin_url: string;
  github_url: string;
  visibility: "public" | "private" | "connections";
};

type ProfileStatCard = {
  label: string;
  value: number;
  icon: Icon;
};

const emptyStats = {
  enrolled_courses: 0,
  completed_courses: 0,
  certificates: 0,
  completed_lessons: 0,
  completed_books: 0,
  correct_checkpoints: 0,
  lifetime_points: 0,
};

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatMonthYear(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toTitle(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function publicProfileUrl(handle: string) {
  if (typeof window === "undefined") return `/profiles/${handle}`;
  return `${window.location.origin}/profiles/${handle}`;
}

function birthdayLabel(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null;
  const [, month, day] = dateOfBirth.split("-").map(Number);
  if (!month || !day) return null;
  const date = new Date(Date.UTC(2000, month - 1, day));
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(date);
  return `${monthName} ${day}`;
}

function createInitialForm(user: ReturnType<typeof useAuth>["user"]): ProfileFormState {
  const profile = user?.profile;
  return {
    avatar_key: profile?.avatar_key ?? "orbit",
    display_name: user?.display_name ?? "",
    phone_number: profile?.phone_number ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    public_bio: profile?.public_bio ?? "",
    city: profile?.city ?? "",
    country: profile?.country ?? "",
    website_url: profile?.website_url ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    github_url: profile?.github_url ?? "",
    visibility:
      profile?.visibility === "private" || profile?.visibility === "connections"
        ? profile.visibility
        : "public",
  };
}

function ProfileAvatar({
  avatarKey,
  displayName,
  className,
}: {
  avatarKey: string | null | undefined;
  displayName: string;
  className?: string;
}) {
  const avatar = getProfileAvatar(avatarKey);
  if (avatar) {
    return (
      <Image
        src={avatar.url}
        alt=""
        width={96}
        height={96}
        unoptimized
        className={cn(
          "rounded-full border border-orange-200 bg-orange-50 object-cover",
          className,
        )}
      />
    );
  }

  return (
    <Avatar className={cn("border border-orange-200 bg-orange-50", className)}>
      <AvatarFallback className="text-xl text-orange-500">
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

export default function ProfilePage() {
  const {
    user,
    accessToken,
    isLoading: isAuthLoading,
    updateProfile,
  } = useAuth();
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [isPublicLoading, setIsPublicLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(() => createInitialForm(null));

  useEffect(() => {
    setForm(createInitialForm(user));
  }, [user]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user?.handle || (user.profile?.visibility && user.profile.visibility !== "public")) {
      setPublicProfile(null);
      setIsPublicLoading(false);
      return;
    }

    let cancelled = false;
    setIsPublicLoading(true);
    void profileClient
      .getPublicProfile(user.handle)
      .then((payload) => {
        if (!cancelled) setPublicProfile(payload);
      })
      .catch(() => {
        if (!cancelled) setPublicProfile(null);
      })
      .finally(() => {
        if (!cancelled) setIsPublicLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user?.handle, user?.profile?.visibility]);

  const displayName = publicProfile?.display_name ?? user?.display_name ?? "GaugeHow learner";
  const avatarKey = publicProfile?.avatar_key ?? user?.profile?.avatar_key ?? form.avatar_key;
  const location = [
    publicProfile?.city ?? user?.profile?.city,
    publicProfile?.country ?? user?.profile?.country,
  ]
    .filter(Boolean)
    .join(", ");
  const birthday = publicProfile?.birthday ?? birthdayLabel(user?.profile?.date_of_birth);
  const stats = publicProfile?.stats ?? emptyStats;
  const level = publicProfile?.gamification.level;
  const badges = publicProfile?.gamification.earned_badges ?? [];
  const courses = publicProfile?.courses ?? [];
  const certificates = publicProfile?.certificates ?? [];
  const profileUrl = user?.handle ? publicProfileUrl(user.handle) : null;
  const visibility = user?.profile?.visibility ?? "public";
  const isPublic = visibility === "public";
  const statCards: ProfileStatCard[] = [
    { label: "Lifetime points", value: stats.lifetime_points, icon: Sparkle },
    { label: "Completed courses", value: stats.completed_courses, icon: GraduationCap },
    { label: "Certificates", value: stats.certificates, icon: SealCheck },
    { label: "Lessons completed", value: stats.completed_lessons, icon: BookOpen },
  ];

  async function handleShare() {
    if (!profileUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: `${displayName} on GaugeHow`,
        url: profileUrl,
      });
      return;
    }
    await navigator.clipboard?.writeText(profileUrl);
    setMessage("Profile link copied.");
  }

  async function handleSave() {
    if (!accessToken) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        avatar_key: form.avatar_key,
        display_name: form.display_name.trim(),
        phone_number: nullable(form.phone_number),
        date_of_birth: form.date_of_birth || null,
        public_bio: nullable(form.public_bio),
        city: nullable(form.city),
        country: nullable(form.country),
        website_url: nullable(form.website_url),
        linkedin_url: nullable(form.linkedin_url),
        github_url: nullable(form.github_url),
        visibility: form.visibility,
      });
      setIsEditing(false);
      setMessage("Profile updated.");
      if (user?.handle && form.visibility === "public") {
        const refreshed = await profileClient.getPublicProfile(user.handle);
        setPublicProfile(refreshed);
      } else {
        setPublicProfile(null);
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-2xl surface-secondary p-5 md:p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <ProfileAvatar avatarKey={avatarKey} displayName={displayName} className="size-24" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="type-h2 text-slate-950">{displayName}</h1>
                  <Badge variant={isPublic ? "green" : "default"}>
                    <Shield className="size-3" />
                    {toTitle(visibility)}
                  </Badge>
                  {level && (
                    <Badge variant="dark">
                      <Trophy className="size-3" />
                      {level.name}
                    </Badge>
                  )}
                </div>
                {(publicProfile?.public_bio ?? user?.profile?.public_bio) && (
                  <p className="mt-3 max-w-2xl text-slate-600">
                    {publicProfile?.public_bio ?? user?.profile?.public_bio}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  {location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-orange-500" />
                      {location}
                    </span>
                  )}
                  {birthday && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDots className="size-4 text-orange-500" />
                      Birthday {birthday}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkle className="size-4 text-orange-500" />
                    {formatNumber(stats.lifetime_points)} lifetime points
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileUrl && (
                <Button type="button" variant="secondary" onClick={handleShare}>
                  <ShareNetwork />
                  Share
                </Button>
              )}
              <Button type="button" onClick={() => setIsEditing((current) => !current)}>
                <Pencil />
                Edit
              </Button>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-lg bg-orange-50 px-4 py-3 type-small font-semibold text-orange-700">
            {message}
          </div>
        )}

        {isEditing && (
          <Card className="panel-depth">
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="type-small font-semibold text-slate-950">Avatar</p>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {PROFILE_AVATARS.map((avatar) => {
                    const selected = form.avatar_key === avatar.key;
                    return (
                      <button
                        key={avatar.key}
                        type="button"
                        className={cn(
                          "rounded-lg p-2 text-center transition",
                          selected
                            ? "bg-orange-100"
                            : "surface-secondary hover:bg-orange-50",
                        )}
                        onClick={() =>
                          setForm((current) => ({ ...current, avatar_key: avatar.key }))
                        }
                      >
                        <Image
                          src={avatar.url}
                          alt=""
                          width={56}
                          height={56}
                          unoptimized
                          className="mx-auto size-14 rounded-full bg-orange-50 object-cover"
                        />
                        <span className="mt-2 block type-caption font-semibold text-slate-600">
                          {avatar.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    Display name
                  </span>
                  <Input
                    value={form.display_name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, display_name: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    Phone number private
                  </span>
                  <Input
                    value={form.phone_number}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone_number: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    Date of birth
                  </span>
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, date_of_birth: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    Visibility
                  </span>
                  <select
                    className="ui-field h-11 w-full rounded-lg px-4 type-small text-slate-950"
                    value={form.visibility}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        visibility: event.target.value as ProfileFormState["visibility"],
                      }))
                    }
                  >
                    <option value="public">Public</option>
                    <option value="connections">Connections</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    City
                  </span>
                  <Input
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, city: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    Country
                  </span>
                  <Input
                    value={form.country}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, country: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    Website
                  </span>
                  <Input
                    value={form.website_url}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, website_url: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    LinkedIn
                  </span>
                  <Input
                    value={form.linkedin_url}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, linkedin_url: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    GitHub
                  </span>
                  <Input
                    value={form.github_url}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, github_url: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="type-caption font-semibold uppercase text-slate-500">
                    Public bio
                  </span>
                  <Textarea
                    value={form.public_bio}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, public_bio: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  <FloppyDisk />
                  {isSaving ? "Saving" : "Save profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="panel-depth">
              <CardContent className="p-4">
                <Icon className="size-5 text-orange-500" />
                <p className="mt-3 type-h3 text-slate-950">{formatNumber(value)}</p>
                <p className="type-caption font-semibold uppercase text-slate-500">
                  {label}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="panel-depth">
            <CardHeader>
              <CardTitle>Level progress</CardTitle>
            </CardHeader>
            <CardContent>
              {isPublicLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ) : level ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="type-caption font-semibold uppercase text-slate-500">
                        Current level
                      </p>
                      <p className="type-h4 text-slate-950">{level.name}</p>
                    </div>
                    <MedalMilitary className="size-8 text-orange-500" />
                  </div>
                  <Progress className="mt-5" value={level.progress_percent} />
                  <p className="mt-3 text-sm text-slate-500">
                    {level.points_to_next_level === null
                      ? "Top level reached."
                      : `${formatNumber(level.points_to_next_level)} points to ${level.next_level_name}.`}
                  </p>
                </>
              ) : (
                <p className="type-small text-slate-500">
                  Make the profile public to show level progress here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="panel-depth">
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent>
              {badges.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {badges.map((badge) => (
                    <div key={badge.code} className="rounded-lg surface-primary p-4">
                      <div className="flex items-start gap-3">
                        <Medal className="size-5 shrink-0 text-orange-500" />
                        <div>
                          <p className="font-semibold text-slate-950">{badge.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{badge.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="type-small text-slate-500">No badges earned yet.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="panel-depth">
            <CardHeader>
              <CardTitle>Courses</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-[color:var(--border)]">
              {courses.length ? (
                courses.map((course) => (
                  <div key={course.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="font-semibold text-slate-950 transition hover:text-orange-500"
                        >
                          {course.title}
                        </Link>
                        {course.short_description && (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {course.short_description}
                          </p>
                        )}
                      </div>
                      <Badge variant={course.status === "completed" ? "green" : "orange"}>
                        {toTitle(course.status)}
                      </Badge>
                    </div>
                    <Progress className="mt-4" value={course.progress_percent} />
                  </div>
                ))
              ) : (
                <p className="type-small text-slate-500">No public course activity yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="panel-depth">
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-[color:var(--border)]">
              {certificates.length ? (
                certificates.map((certificate) => (
                  <div key={certificate.certificate_number} className="py-4 first:pt-0">
                    <p className="font-semibold text-slate-950">{certificate.course_title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {certificate.certificate_number} issued{" "}
                      {formatMonthYear(certificate.issued_at)}
                    </p>
                    <Button asChild variant="secondary" size="sm" className="mt-3">
                      <Link href={`/verify-certificate/${certificate.certificate_number}`}>
                        <ArrowSquareOut />
                        Verify
                      </Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="type-small text-slate-500">No certificates issued yet.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
