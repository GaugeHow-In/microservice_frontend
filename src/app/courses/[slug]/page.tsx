"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Play,
  Tags,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMinutes,
  formatPrice,
  learningCache,
  learningClient,
  type CourseDetail,
} from "@/lib/learning-client";
import { paymentClient, type PaymentCheckout } from "@/lib/payment-client";

type Props = {
  params: Promise<{ slug: string }>;
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function findLessonSlugById(course: CourseDetail, lessonId: string | null | undefined): string | null {
  if (!lessonId) return null;
  return course.modules
    .flatMap((module) => module.lessons)
    .find((item) => item.id === lessonId)?.slug ?? null;
}

function ensureRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-razorpay-checkout="true"]',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load Razorpay.")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
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
  const [purchasing, setPurchasing] = useState(false);

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
      await learningClient.enrollFree(slug, accessToken);
      learningCache.invalidateCourseDetail(slug, { viewerKey: user?.id ?? null });
      const refreshed = await learningClient.getCourseDetail(slug, {
        token: accessToken,
      });
      learningCache.setCourseDetail(refreshed, { viewerKey: user?.id ?? null });
      setCourse(refreshed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  }

  async function refreshCourseAfterPayment() {
    if (!slug) return;
    learningCache.invalidateCourseDetail(slug, { viewerKey: user?.id ?? null });
    const refreshed = await learningClient.getCourseDetail(slug, {
      token: accessToken,
    });
    learningCache.setCourseDetail(refreshed, { viewerKey: user?.id ?? null });
    setCourse(refreshed);
  }

  async function handlePurchase() {
    if (!accessToken || !slug || !course) return;
    setPurchasing(true);
    setError(null);
    try {
      const checkout = await paymentClient.createCourseCheckout(accessToken, {
        courseSlug: slug,
        successUrl: `${window.location.origin}/courses/${slug}?payment=success`,
        cancelUrl: `${window.location.origin}/courses/${slug}?payment=cancelled`,
      });
      await launchCheckout(checkout);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start payment.");
    } finally {
      setPurchasing(false);
    }
  }

  async function launchCheckout(checkout: PaymentCheckout) {
    if (!accessToken) return;
    if (checkout.gateway === "stripe") {
      if (!checkout.gateway_checkout_url) throw new Error("Stripe checkout URL is missing.");
      window.location.href = checkout.gateway_checkout_url;
      return;
    }

    if (checkout.gateway === "mock") {
      await paymentClient.completeMock(accessToken, checkout.id);
      await refreshCourseAfterPayment();
      return;
    }

    if (!checkout.razorpay_key_id || !checkout.gateway_order_id) {
      throw new Error("Razorpay checkout is not configured.");
    }
    await ensureRazorpayScript();
    if (!window.Razorpay) {
      throw new Error("Razorpay checkout is unavailable.");
    }
    const razorpay = new window.Razorpay({
      key: checkout.razorpay_key_id,
      amount: checkout.amount_minor,
      currency: checkout.currency_code,
      name: "GaugeHow",
      description: checkout.course_title,
      order_id: checkout.gateway_order_id,
      prefill: {
        name: user?.display_name ?? undefined,
      },
      theme: {
        color: "#f97316",
      },
      handler: (response) => {
        void paymentClient
          .verifyRazorpay(accessToken, {
            paymentOrderId: checkout.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
          .then(() => refreshCourseAfterPayment())
          .catch((cause) => {
            setError(cause instanceof Error ? cause.message : "Payment verification failed.");
          });
      },
    });
    razorpay.open();
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
        <div className="grid gap-6">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-3">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-12 w-3/4 rounded-lg" />
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-2/3 rounded-md" />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardContent className="space-y-5 p-5">
                <Skeleton className="aspect-video rounded-xl" />
                <div className="grid gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-xl" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-xl" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
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
  const leadInstructor = course.instructors[0] ?? null;
  const access = course.access;
  const isFree = course.recommended_pricing?.base_price_minor === 0;
  const canReview = Boolean(access?.has_access);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={course.categories.map((item) => item.name).join(" · ")}
          title={course.title}
          description={course.short_description ?? "Course details"}
          action={
            access?.has_access && continueLessonSlug ? (
              <Button asChild>
                <Link href={`/courses/${course.slug}/learn?lesson=${continueLessonSlug}`}>
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
              <Button onClick={handlePurchase} disabled={purchasing || !accessToken}>
                <Ticket />
                {purchasing ? "Starting checkout..." : "Buy course"}
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
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950 p-6 text-white">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/20" />
                <div className="relative flex h-full flex-col justify-between">
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
              <CardTitle>Instructor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-950">
                  {leadInstructor?.display_name ?? "GaugeHow Faculty"}
                </p>
                {leadInstructor?.one_line_description ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {leadInstructor.one_line_description}
                  </p>
                ) : null}
                {leadInstructor?.linkedin_url ? (
                  <Button asChild className="mt-3" variant="secondary">
                    <a href={leadInstructor.linkedin_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      LinkedIn
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-950">
                  <Tags className="size-4 text-orange-500" />
                  Skills you&apos;ll gain
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.skills.length ? (
                    course.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)
                  ) : (
                    <span className="text-sm text-slate-500">Skills will be added soon.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>What you&apos;ll learn</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {course.long_description ?? "Learning outcomes will be added soon."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pre-requisites</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {course.prerequisites_markdown ?? "No pre-requisites listed."}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Curriculum</CardTitle>
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
                {course.recommended_pricing ? (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize text-slate-950">
                          {course.recommended_pricing.purchase_type.replace("_", " ")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {course.recommended_pricing.subscription_days
                            ? `${course.recommended_pricing.subscription_days} days access`
                            : "Lifetime access"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-950">{formatPrice(course.recommended_pricing)}</p>
                        {course.recommended_pricing.is_display_price_estimated ? (
                          <p className="mt-1 text-xs text-slate-500">Estimated local price</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Pricing is not available yet.</p>
                )}
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">Language</p>
                  <p className="mt-1 text-sm uppercase text-slate-500">{course.language_code}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAQs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {course.faqs.length ? (
                  course.faqs.map((faq, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 p-4">
                      <p className="font-semibold text-slate-950">{faq.question}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No FAQs yet.</p>
                )}
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
