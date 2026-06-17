"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Clock3,
  FileText,
  MessageSquareText,
  Play,
  Star,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMinutes,
  formatPrice,
  learningClient,
  type CourseDetail,
} from "@/lib/learning-client";

type Props = {
  params: Promise<{ slug: string }>;
};

export default function CourseDetailPage({ params }: Props) {
  const { accessToken } = useAuth();
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
    void params.then((value) => {
      if (!cancelled) setSlug(value.slug);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const courseSlug = slug;
    let cancelled = false;

    async function loadCourse() {
      setLoading(true);
      setError(null);
      try {
        const payload = await learningClient.getCourseDetail(courseSlug, {
          countryCode: "IN",
          token: accessToken,
        });
        if (!cancelled) {
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
  }, [accessToken, slug]);

  const firstAccessibleLesson = useMemo(() => {
    return (
      course?.modules
        .flatMap((module) => module.lessons)
        .find((lesson) => lesson.accessible)?.slug ?? null
    );
  }, [course]);

  async function handleEnroll() {
    if (!accessToken || !slug) return;
    setEnrolling(true);
    setError(null);
    try {
      await learningClient.enrollFree(slug, accessToken, "IN");
      const refreshed = await learningClient.getCourseDetail(slug, {
        countryCode: "IN",
        token: accessToken,
      });
      setCourse(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enrollment failed.");
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
      const refreshed = await learningClient.getCourseDetail(slug, {
        countryCode: "IN",
        token: accessToken,
      });
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
        <Card className="h-72 animate-pulse border-slate-200 bg-white" />
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell>
        <Card>
          <CardContent className="p-5 text-sm text-rose-600">
            {error ?? "Course not found."}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const instructorLine =
    course.instructors.map((item) => item.display_name).join(", ") || "GaugeHow Faculty";
  const access = course.access;
  const isFree = course.recommended_pricing?.base_price_minor === 0;
  const canReview = Boolean(access?.has_access);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={course.categories.map((item) => item.name).join(" · ")}
          title={course.title}
          description={course.long_description ?? course.short_description ?? "Course details"}
          action={
            access?.has_access && firstAccessibleLesson ? (
              <Button asChild>
                <Link href={`/courses/${course.slug}/learn?lesson=${firstAccessibleLesson}`}>
                  <Play />
                  {access.progress_percent ? "Continue learning" : "Start learning"}
                </Link>
              </Button>
            ) : isFree ? (
              <Button onClick={handleEnroll} disabled={enrolling}>
                <Ticket />
                {enrolling ? "Enrolling..." : "Enroll for free"}
              </Button>
            ) : (
              <Button disabled>
                <Ticket />
                Purchase flow pending
              </Button>
            )
          }
        />

        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-rose-600">{error}</CardContent>
          </Card>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="aspect-video rounded-lg bg-slate-950 p-6 text-white">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="orange">Backend-backed course</Badge>
                    {access?.has_access ? (
                      <Badge variant="green">
                        {access.is_lifetime_access
                          ? "Lifetime access"
                          : access.days_left
                            ? `${access.days_left} days left`
                            : "Active access"}
                      </Badge>
                    ) : (
                      <Badge variant="dark">{formatPrice(course.recommended_pricing)}</Badge>
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{course.title}</h2>
                    <p className="mt-2 text-slate-300">Instructor: {instructorLine}</p>
                    {access?.has_access && (
                      <div className="mt-5 max-w-sm space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">Course progress</span>
                          <span className="font-semibold text-white">
                            {Math.round(access.progress_percent ?? 0)}%
                          </span>
                        </div>
                        <Progress value={access.progress_percent ?? 0} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["Lessons", course.lesson_count],
                  ["Duration", formatMinutes(course.duration_minutes)],
                  ["Rating", course.average_rating.toFixed(1)],
                  ["Level", course.level.replaceAll("_", " ")],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-1 font-bold capitalize text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What works right now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  icon: FileText,
                  title: "Transcript-backed lessons",
                  text: "Lesson playback, transcript, and generated notes/flashcards use real learning APIs.",
                },
                {
                  icon: MessageSquareText,
                  title: "Discussion threads",
                  text: "Learners can open lesson discussions and reply after they have course access.",
                },
                {
                  icon: BadgeCheck,
                  title: "Reviews",
                  text: "Enrolled users can rate the course and leave an optional review.",
                },
                {
                  icon: Clock3,
                  title: "Access tracking",
                  text: "The UI shows active access, lifetime access, and days-left state from the backend.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                  <Icon className="mt-0.5 size-5 text-orange-500" />
                  <div>
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{text}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Modules and lessons</CardTitle>
                <span className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                  <Star className="size-4 fill-orange-400 text-orange-400" />
                  {course.average_rating.toFixed(1)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {course.modules.map((module, index) => (
                <div key={module.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                        Module {index + 1}
                      </p>
                      <h3 className="mt-1 font-bold text-slate-950">{module.title}</h3>
                      {module.description && (
                        <p className="mt-1 text-sm text-slate-500">{module.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-slate-950">
                      {module.lessons.length} lessons
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
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
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing and access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {course.pricing_options.map((option) => (
                  <div key={option.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize text-slate-950">
                          {option.purchase_type.replace("_", " ")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{option.region.name}</p>
                      </div>
                      <p className="font-bold text-slate-950">{formatPrice(option)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canReview && (
                  <div className="space-y-3 rounded-lg border border-slate-200 p-4">
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

                {course.reviews.length ? (
                  course.reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-950">{review.user_display_name}</p>
                        <span className="text-sm font-bold text-orange-600">
                          {review.rating}/5
                        </span>
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
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
