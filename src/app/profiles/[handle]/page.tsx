"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, BookOpen, CalendarDots, Globe, GraduationCap, MapPin, Medal, MedalMilitary, SealCheck, ShareNetwork, ShieldCheck, Sparkle, Trophy } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  profileClient,
  ProfileApiError,
  type PublicProfile,
  type PublicProfileCertificate,
  type PublicProfileCourse,
} from "@/lib/profile-client";
import { getProfileAvatar } from "@/lib/profile-avatars";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ handle: string }>;
};

const statCards = [
  {
    key: "lifetime_points",
    label: "lifetime points",
    icon: Sparkle,
  },
  {
    key: "completed_courses",
    label: "completed courses",
    icon: GraduationCap,
  },
  {
    key: "certificates",
    label: "certificates",
    icon: ShieldCheck,
  },
  {
    key: "completed_lessons",
    label: "lessons completed",
    icon: BookOpen,
  },
] as const;

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatMonthYear(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function toTitle(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function publicProfileUrl(handle: string) {
  // Public-facing short link; a rewrite maps /p/<handle> to this route.
  if (typeof window === "undefined") return `/p/${handle}`;
  return `${window.location.origin}/p/${handle}`;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl surface-secondary p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-4 w-full max-w-xl rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg surface-secondary p-5 text-sm text-slate-500">
      {title}
    </div>
  );
}

function CourseCard({ course }: { course: PublicProfileCourse }) {
  return (
    <article className="browse-card p-4">
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
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <span>{toTitle(course.level)}</span>
          <span>{Math.round(course.progress_percent)}%</span>
        </div>
        <Progress value={course.progress_percent} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>Joined {formatMonthYear(course.enrolled_at)}</span>
        {course.completed_at && <span>Completed {formatMonthYear(course.completed_at)}</span>}
      </div>
    </article>
  );
}

function CertificateCard({ certificate }: { certificate: PublicProfileCertificate }) {
  return (
    <article className="browse-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500">
          <Medal className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-950">{certificate.course_title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {certificate.certificate_number} issued {formatMonthYear(certificate.issued_at)}
          </p>
          <div className="mt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/verify-certificate/${certificate.certificate_number}`}>
                <SealCheck />
                Verify
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProfileContent({ profile }: { profile: PublicProfile }) {
  const [copied, setCopied] = useState(false);
  const initials = getInitials(profile.display_name);
  const selectedAvatar = getProfileAvatar(profile.avatar_key);
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const shareUrl = publicProfileUrl(profile.handle);
  const socialLinks: Array<{ href: string | null; label: string; icon: Icon }> = [
    { href: profile.website_url, label: "Website", icon: Globe },
    { href: profile.linkedin_url, label: "LinkedIn", icon: ArrowSquareOut },
    { href: profile.github_url, label: "GitHub", icon: ArrowSquareOut },
  ];
  const hasSocialLinks = socialLinks.some((item) => item.href);

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: `${profile.display_name} on GaugeHow`,
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl surface-secondary p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            {selectedAvatar ? (
              <Image
                src={selectedAvatar.url}
                alt=""
                width={96}
                height={96}
                unoptimized
                className="size-24 rounded-full border border-orange-200 bg-orange-50 object-cover"
              />
            ) : (
              <Avatar className="size-24 border border-orange-200 bg-orange-50">
                <AvatarFallback className="text-2xl text-orange-500">{initials}</AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="type-h2 text-slate-950">{profile.display_name}</h1>
                <Badge variant="dark">
                  <Trophy className="size-3" />
                  {profile.gamification.level.name}
                </Badge>
              </div>
              {profile.public_bio && (
                <p className="mt-3 max-w-2xl text-slate-600">{profile.public_bio}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                {location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-orange-500" />
                    {location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDots className="size-4 text-orange-500" />
                  Joined {formatMonthYear(profile.joined_at)}
                </span>
                {profile.birthday && (
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkle className="size-4 text-orange-500" />
                    Birthday {profile.birthday}
                  </span>
                )}
              </div>
              {hasSocialLinks && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {socialLinks.map(({ href, label, icon: Icon }) =>
                    href ? (
                      <Button key={label} asChild variant="secondary" size="sm">
                        <a href={href} target="_blank" rel="noreferrer">
                          <Icon />
                          {label}
                        </a>
                      </Button>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </div>
          <Button type="button" variant="default" onClick={handleShare}>
            <ShareNetwork />
            {copied ? "Copied" : "Share profile"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="rounded-lg surface-secondary p-4"
          >
            <Icon className="size-5 text-orange-500" />
            <p className="mt-3 type-h3 text-slate-950">{formatNumber(profile.stats[key])}</p>
            <p className="type-caption font-semibold uppercase text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div>
            <h2 className="type-h3 text-slate-950">Level progress</h2>
            <p className="type-small text-slate-500">
              {profile.gamification.level.points_to_next_level === null
                ? "Top level reached."
                : `${formatNumber(profile.gamification.level.points_to_next_level)} points to ${profile.gamification.level.next_level_name}.`}
            </p>
          </div>
          <div className="rounded-lg surface-secondary p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="type-caption font-semibold uppercase text-slate-500">Current level</p>
                <p className="type-h4 text-slate-950">{profile.gamification.level.name}</p>
              </div>
              <MedalMilitary className="size-8 text-orange-500" />
            </div>
            <Progress
              className="mt-5"
              value={profile.gamification.level.progress_percent}
            />
            <p className="mt-3 text-sm text-slate-500">
              {formatNumber(profile.gamification.lifetime_points)} lifetime points earned.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="type-h3 text-slate-950">Badges</h2>
            <p className="type-small text-slate-500">Achievements earned across learning activity.</p>
          </div>
          {profile.gamification.earned_badges.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.gamification.earned_badges.map((badge) => (
                <article
                  key={badge.code}
                  className="rounded-lg surface-secondary p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-500">
                      <MedalMilitary className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-950">{badge.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{badge.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No public badges earned yet." />
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="type-h3 text-slate-950">Courses</h2>
              <p className="type-small text-slate-500">Published courses this learner is taking.</p>
            </div>
            <Badge variant="orange">{profile.stats.enrolled_courses} enrolled</Badge>
          </div>
          {profile.courses.length ? (
            <div className="grid gap-3">
              {profile.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState title="No public course activity yet." />
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="type-h3 text-slate-950">Certificates</h2>
              <p className="type-small text-slate-500">Issued credentials visible on this profile.</p>
            </div>
            <Badge variant="green">{profile.stats.certificates} issued</Badge>
          </div>
          {profile.certificates.length ? (
            <div className="grid gap-3">
              {profile.certificates.map((certificate) => (
                <CertificateCard
                  key={certificate.certificate_number}
                  certificate={certificate}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No certificates have been issued yet." />
          )}
        </div>
      </section>
    </div>
  );
}

export default function PublicProfilePage({ params }: Props) {
  const [handle, setHandle] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(params).then((value) => {
      if (!cancelled) setHandle(value.handle);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    const profileHandle = handle;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const payload = await profileClient.getPublicProfile(profileHandle);
        if (!cancelled) setProfile(payload);
      } catch (cause) {
        if (!cancelled) {
          const message =
            cause instanceof ProfileApiError && cause.status === 404
              ? "This profile is private or does not exist."
              : cause instanceof Error
                ? cause.message
                : "Unable to load this profile.";
          setError(message);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const pageTitle = useMemo(() => {
    if (profile) return `${profile.display_name} on GaugeHow`;
    if (handle) return `@${handle} on GaugeHow`;
    return "GaugeHow profile";
  }, [handle, profile]);

  return (
    <main className="premium-bg min-h-screen px-4 py-6 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <BrandLogo />
          <Button asChild variant="secondary">
            <Link href="/courses">
              <ArrowSquareOut />
              Browse courses
            </Link>
          </Button>
        </header>

        <div className={cn("mt-8", loading && "animate-pulse")}>
          {loading ? (
            <ProfileSkeleton />
          ) : error ? (
            <section className="rounded-2xl bg-rose-50 p-6 text-rose-700">
              <h1 className="type-h3 text-rose-700">{pageTitle}</h1>
              <p className="mt-2">{error}</p>
            </section>
          ) : profile ? (
            <ProfileContent profile={profile} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
