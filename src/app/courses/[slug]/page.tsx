"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CaretDown, CheckCircle, ClockAfternoon, Globe, GraduationCap, Medal, Play, Sparkle, Star, Ticket, Translate, Users } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMinutes,
  learningCache,
  learningClient,
  type CourseDetail,
} from "@/lib/learning-client";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

function findLessonSlugById(course: CourseDetail, lessonId: string | null | undefined): string | null {
  if (!lessonId) return null;
  return course.modules
    .flatMap((module) => module.lessons)
    .find((item) => item.id === lessonId)?.slug ?? null;
}

function splitCourseText(value: string | null | undefined, fallback: string[]): string[] {
  if (!value?.trim()) return fallback;

  const lineItems = value
    .split("\n")
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (lineItems.length > 1) return lineItems.slice(0, 4);

  const sentences = value
    .replace(/\s+/g, " ")
    .split(/(?:\. |\? |! )/)
    .map((item) => item.trim())
    .filter(Boolean);

  return sentences.slice(0, 4).map((item) => (/[.!?]$/.test(item) ? item : `${item}.`));
}

export default function CourseDetailPage({ params }: Props) {
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(params).then((value) => {
      if (!cancelled) setSlug(value.slug);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!slug || isAuthLoading) return;
    const courseSlug = slug;
    let cancelled = false;
    const cacheOptions = { viewerKey: user?.id ?? null };
    const cached = learningCache.getCourseDetail(courseSlug, cacheOptions);

    if (cached) {
      setCourse(cached);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadCourse() {
      setLoading(true);
      setError(null);
      try {
        const payload = await learningClient.getCourseDetail(courseSlug, {
          token: accessToken,
        });
        if (!cancelled) {
          learningCache.setCourseDetail(payload, cacheOptions);
          setCourse(payload);
        }
      } catch (cause) {
        if (!cancelled) {
          const message = cause instanceof Error ? cause.message : "Unable to load course.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCourse();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading, slug, user?.id]);

  useEffect(() => {
    if (!course) return;
    learningCache.setCourseDetail(course, { viewerKey: user?.id ?? null });
  }, [course, user?.id]);

  const firstAccessibleLesson = useMemo(() => {
    return (
      course?.modules
        .flatMap((module) => module.lessons)
        .find((lesson) => lesson.accessible)?.slug ?? null
    );
  }, [course]);
  const continueLessonSlug = useMemo(() => {
    if (!course) return null;
    return findLessonSlugById(course, course.access?.current_lesson_id) ?? firstAccessibleLesson;
  }, [course, firstAccessibleLesson]);

  async function handleEnroll() {
    if (!accessToken || !slug) return;
    setEnrolling(true);
    setError(null);
    try {
      // Enrolling only starts progress tracking; a Plus user or free course is
      // already unlocked, so we send them straight into the first lesson.
      await learningClient.enroll(slug, accessToken);
      learningCache.invalidateCourseDetail(slug, { viewerKey: user?.id ?? null });
      const refreshed = await learningClient.getCourseDetail(slug, {
        token: accessToken,
      });
      learningCache.setCourseDetail(refreshed, { viewerKey: user?.id ?? null });
      setCourse(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start this course.");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleReviewSubmit() {
    if (!accessToken || !slug) return;
    setSubmittingReview(true);
    setError(null);
    try {
      await learningClient.upsertReview(slug, accessToken, {
        rating: reviewRating,
        reviewText,
      });
      learningCache.invalidateCourseDetail(slug, { viewerKey: user?.id ?? null });
      const refreshed = await learningClient.getCourseDetail(slug, {
        token: accessToken,
      });
      learningCache.setCourseDetail(refreshed, { viewerKey: user?.id ?? null });
      setCourse(refreshed);
      setReviewText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!slug || loading) {
    return (
      <AppShell>
        <div className="grid gap-10">
          <div className="space-y-3">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-12 w-3/4 rounded-lg" />
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-5 w-2/3 rounded-md" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <Skeleton className="aspect-video rounded-xl" />
              <div className="grid gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell>
        <div className="rounded-2xl surface-secondary p-5 text-sm text-rose-600">
          {error ?? "Course not found."}
        </div>
      </AppShell>
    );
  }

  const instructorLine =
    course.instructors.map((item) => item.display_name).join(", ") || "GaugeHow Faculty";
  const currentCourseSlug = course.slug;
  const leadInstructor = course.instructors[0] ?? null;
  const access = course.access;
  const isPlusMember = Boolean(user?.subscription?.is_plus);
  const hasFullAccess = Boolean(access?.has_access) || course.is_free || isPlusMember;
  const trialLessonCount = access?.free_trial_lesson_count ?? 2;
  const canReview = Boolean(access?.has_access);
  const categoryLine = course.categories.map((item) => item.name).join(" > ") || "Engineering";
  const primaryCategory = course.categories[0]?.name ?? "Engineering";
  const moduleCount = course.modules.length;
  const outcomes = splitCourseText(course.long_description, [
    `Build practical confidence with ${course.title}.`,
    "Apply engineering concepts through guided lessons and applied examples.",
    "Develop job-relevant skills with structured practice and checkpoints.",
    "Prepare for projects, interviews, and real technical workflows.",
  ]);
  const skills = course.skills.length
    ? course.skills
    : course.categories.map((item) => item.name).filter(Boolean);
  const accessLabel = course.is_free
    ? "Free course"
    : hasFullAccess
      ? "Unlocked with Plus"
      : `First ${trialLessonCount} lessons free`;
  function renderPrimaryAction(className = "w-full sm:w-auto") {
    if (hasFullAccess && continueLessonSlug) {
      return (
        <Button asChild size="lg" className={className}>
          <Link href={`/courses/${currentCourseSlug}/learn?lesson=${continueLessonSlug}`}>
            <Play />
            {access?.progress_percent ? "Continue learning" : "Start learning"}
          </Link>
        </Button>
      );
    }

    // Free course or Plus member without an enrolment row yet: enrol to begin.
    if (hasFullAccess) {
      return (
        <Button size="lg" className={className} onClick={handleEnroll} disabled={enrolling || !accessToken}>
          <Ticket />
          {enrolling ? "Starting..." : "Start course"}
        </Button>
      );
    }

    // Locked course: offer the free trial plus the upgrade path.
    return (
      <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
        <Button asChild size="lg" variant="soft" className="w-full sm:w-auto">
          <Link
            href={
              continueLessonSlug
                ? `/courses/${currentCourseSlug}/learn?lesson=${continueLessonSlug}`
                : `/courses/${currentCourseSlug}/learn`
            }
          >
            <Play />
            Start free trial
          </Link>
        </Button>
        <Button asChild size="lg" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 sm:w-auto">
          <Link href="/plus">
            <Sparkle weight="fill" />
            Unlock with Plus
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-0">
        {error && (
          <div className="rounded-2xl surface-secondary p-4 text-sm text-rose-600">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden py-4">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-orange-600">
                <Link href="/courses" className="hover:text-orange-700">
                  Browse
                </Link>
                <span className="text-slate-400">/</span>
                <span>{categoryLine}</span>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="flex -space-x-2">
                  {course.instructors.slice(0, 3).map((instructor) => (
                    <div
                      key={instructor.id}
                      className="flex size-10 items-center justify-center rounded-full border-2 border-[color:var(--surface-elevated)] bg-orange-100 text-sm font-bold text-orange-700"
                    >
                      {instructor.display_name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {!course.instructors.length && (
                    <div className="flex size-10 items-center justify-center rounded-full border-2 border-[color:var(--surface-elevated)] bg-orange-100 text-sm font-bold text-orange-700">
                      G
                    </div>
                  )}
                </div>
                <Badge variant="orange">{primaryCategory}</Badge>
                <Badge variant="green">Top Instructor</Badge>
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-extrabold text-slate-950 sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                {course.short_description ??
                  "Build career-ready engineering skills through focused lessons, hands-on practice, and guided technical learning."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-600">
                <span>
                  Instructor: <span className="font-bold text-slate-950">{instructorLine}</span>
                </span>
                <span className="flex items-center gap-1 font-bold text-orange-600">
                  <Star className="size-4 fill-current" />
                  {course.average_rating.toFixed(1)}
                </span>
                <span>{course.total_reviews} reviews</span>
                <span>{course.lesson_count} learners enrolled</span>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                {renderPrimaryAction()}
                <p className="text-sm text-slate-500">
                  Starts today. Learn on your schedule.
                </p>
              </div>

              {access?.has_access && (
                <div className="mt-8 max-w-xl border-t border-[color:var(--border)] pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-950">Your course progress</span>
                    <span className="font-bold text-orange-600">
                      {Math.round(access.progress_percent ?? 0)}%
                    </span>
                  </div>
                  <Progress className="mt-3" value={access.progress_percent ?? 0} />
                </div>
              )}
            </div>

            <aside className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-3xl surface-secondary">
                <div className="course-visual relative aspect-video overflow-hidden">
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 23rem, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <GraduationCap className="size-16 text-orange-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-orange-400 text-white shadow-lg">
                      <Play className="ml-1 size-8 fill-current" />
                    </div>
                  </div>
                </div>
                <div className="space-y-5 p-5">
                  <div>
                    <p className="flex items-center gap-2 text-2xl font-extrabold text-slate-950">
                      {course.is_free ? (
                        "Free"
                      ) : hasFullAccess ? (
                        <>
                          <Sparkle weight="fill" className="size-6 text-amber-500" />
                          Included in Plus
                        </>
                      ) : (
                        <>
                          <Sparkle weight="fill" className="size-6 text-amber-500" />
                          GaugeHow-Plus
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{accessLabel}</p>
                  </div>
                  {renderPrimaryAction("w-full")}
                  <div className="space-y-3 border-t border-[color:var(--border)] pt-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Medal className="size-4 text-orange-500" />
                      {course.certificate_enabled ? "Shareable certificate" : "Completion tracking"}
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockAfternoon className="size-4 text-orange-500" />
                      {formatMinutes(course.duration_minutes)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-orange-500" />
                      Fully online
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-10 grid border-y border-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, label: `${moduleCount} modules`, value: `${course.lesson_count} lessons` },
              { icon: Star, label: `${course.average_rating.toFixed(1)} rating`, value: `${course.total_reviews} reviews` },
              { icon: Users, label: "Level", value: course.level.replaceAll("_", " ") },
              { icon: ClockAfternoon, label: "Schedule", value: "Flexible" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="border-t border-[color:var(--border)] p-5 first:border-t-0 sm:border-l sm:first:border-l-0 lg:border-t-0">
                  <div className="flex items-center gap-3">
                    <Icon className="size-5 text-orange-500" />
                    <div>
                      <p className="font-bold capitalize text-slate-950">{item.label}</p>
                      <p className="text-sm capitalize text-slate-500">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <nav className="sticky top-16 z-20 mt-8 rounded-full surface-secondary px-3 py-2 backdrop-blur-xl">
          <div className="flex gap-1 overflow-x-auto text-sm font-bold text-slate-600">
            {["About", "Outcomes", "Modules", "Instructor", "Reviews", "FAQ"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="shrink-0 rounded-lg px-4 py-2 transition hover:bg-orange-50 hover:text-orange-700"
              >
                {item}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <main className="space-y-12">
            <section id="about" className="scroll-mt-28">
              <h2 className="text-2xl font-extrabold text-slate-950">What you&apos;ll learn</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {outcomes.map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle className="mt-1 size-5 shrink-0 text-orange-500" />
                    <p className="text-sm leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>

              <div id="outcomes" className="mt-10 border-t border-[color:var(--border)] pt-8">
                <h3 className="text-xl font-extrabold text-slate-950">Skills you&apos;ll gain</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.length ? (
                    skills.map((skill) => <Badge key={skill}>{skill}</Badge>)
                  ) : (
                    <span className="text-sm text-slate-500">Skills will be added soon.</span>
                  )}
                </div>
              </div>
            </section>

            <section className="border-t border-[color:var(--border)] pt-10">
              <h2 className="text-2xl font-extrabold text-slate-950">Details to know</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Medal, title: "Certificate", text: course.certificate_enabled ? "Included" : "Not included" },
                  { icon: ClockAfternoon, title: "Duration", text: formatMinutes(course.duration_minutes) },
                  { icon: Translate, title: "Language", text: course.language_code.toUpperCase() },
                  { icon: Users, title: "Experience", text: course.level.replaceAll("_", " ") },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="border-l border-[color:var(--border)] pl-4">
                      <Icon className="size-5 text-orange-500" />
                      <p className="mt-3 font-bold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm capitalize text-slate-500">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="modules" className="scroll-mt-28 border-t border-[color:var(--border)] pt-10">
              <h2 className="text-2xl font-extrabold text-slate-950">
                There are {moduleCount} modules in this course
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Move through each module at your own pace. Module content is collapsed by default,
                so the page stays clean until you choose what to inspect.
              </p>

              <div className="mt-6 space-y-4">
              {course.modules.map((module, index) => (
                <details
                  key={module.id}
                  className="group rounded-2xl surface-secondary"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
                    <div>
                      <p className="text-xs font-bold uppercase text-orange-600">
                        Module {index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-950">{module.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {module.lessons.length} lessons
                        {module.duration_minutes ? ` · ${formatMinutes(module.duration_minutes)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-full surface-primary px-3 py-2 text-xs font-bold text-slate-600">
                      Module details
                      <CaretDown className="size-4 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="border-t border-[color:var(--border)] p-5 pt-0">
                    {module.description && (
                      <p className="mb-4 pt-5 text-sm leading-7 text-slate-600">{module.description}</p>
                    )}
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 rounded-lg surface-primary px-3 py-3"
                        >
                        <div>
                          <p className="font-medium text-slate-950">{lesson.title}</p>
                          <p className="text-xs text-slate-500">
                            {lesson.duration_seconds
                              ? `${Math.ceil(lesson.duration_seconds / 60)} min`
                              : "Duration pending"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {lesson.is_preview && <Badge variant="blue">Preview</Badge>}
                          {lesson.accessible && (
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/courses/${course.slug}/learn?lesson=${lesson.slug}`}>
                                Open
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
              </div>
            </section>

            <section id="instructor" className="scroll-mt-28 border-t border-[color:var(--border)] pt-10">
              <h2 className="text-2xl font-extrabold text-slate-950">Instructor</h2>
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-orange-100 text-xl font-extrabold text-orange-700">
                  {(leadInstructor?.display_name ?? "GaugeHow Faculty").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-extrabold text-slate-950">
                    {leadInstructor?.display_name ?? "GaugeHow Faculty"}
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    {leadInstructor?.one_line_description ??
                      "Industry-focused technical instruction from the GaugeHow learning team."}
                  </p>
                  {leadInstructor?.linkedin_url ? (
                    <a
                      href={leadInstructor.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-bold text-orange-600 hover:text-orange-700"
                    >
                      View profile
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section id="reviews" className="scroll-mt-28 border-t border-[color:var(--border)] pt-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-950">Learner reviews</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {course.average_rating.toFixed(1)} average rating from {course.total_reviews} reviews.
                  </p>
                </div>
                <Badge variant="orange">
                  <Star className="size-3 fill-current" />
                  {course.average_rating.toFixed(1)}
                </Badge>
              </div>

              {canReview && (
                <div className="mt-6 space-y-3 rounded-2xl surface-secondary p-4">
                  <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                    <label className="text-sm font-semibold text-slate-700">Your rating</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={reviewRating}
                      onChange={(event) => setReviewRating(Number(event.target.value))}
                    />
                  </div>
                  <Textarea
                    placeholder="Write an optional review"
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                  />
                  <Button onClick={handleReviewSubmit} disabled={submittingReview}>
                    {submittingReview ? "Saving..." : "Save review"}
                  </Button>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {course.reviews.length ? (
                  course.reviews.map((review) => (
                    <div key={review.id} className="border-b border-[color:var(--border)] pb-4 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-950">{review.user_display_name}</p>
                        <span className="text-sm font-bold text-orange-600">{review.rating}/5</span>
                      </div>
                      {review.review_text && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {review.review_text}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No reviews yet.</p>
                )}
              </div>
            </section>

            <section id="faq" className="scroll-mt-28 border-t border-[color:var(--border)] pt-10">
              <h2 className="text-2xl font-extrabold text-slate-950">Frequently asked questions</h2>
              <div className="mt-5 space-y-3">
                {course.faqs.length ? (
                  course.faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-xl surface-secondary"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                      <p className="font-semibold text-slate-950">{faq.question}</p>
                        <CaretDown className="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="border-t border-[color:var(--border)] p-4 text-sm leading-6 text-slate-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No FAQs yet.</p>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-8 lg:sticky lg:top-40 lg:self-start">
            <div className="border-t border-[color:var(--border)] pt-5">
              <h2 className="text-lg font-extrabold text-slate-950">Included with this course</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>{course.lesson_count} lessons across {moduleCount} modules</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>{course.certificate_enabled ? "Certificate-ready learning path" : "Structured progress tracking"}</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>Self-paced, online access</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>{accessLabel}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--border)] pt-5">
              <h2 className="text-lg font-extrabold text-slate-950">Access</h2>
              {course.is_free ? (
                <p className="mt-4 text-sm text-slate-600">
                  This is a free course — every lesson is open, no subscription needed.
                </p>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>
                    The first {trialLessonCount} lessons are free to preview. Unlock the full course
                    — plus every other course, test and document — with GaugeHow-Plus.
                  </p>
                  {!hasFullAccess ? (
                    <Button asChild variant="soft" className="mt-1">
                      <Link href="/plus">
                        <Sparkle weight="fill" />
                        See Plus plans
                      </Link>
                    </Button>
                  ) : (
                    <p className="flex items-center gap-2 font-semibold text-amber-600">
                      <Sparkle weight="fill" className="size-4" />
                      You have full access with Plus.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-[color:var(--border)] pt-5">
              <h2 className="text-lg font-extrabold text-slate-950">Pre-requisites</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {course.prerequisites_markdown ?? "No pre-requisites listed."}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
