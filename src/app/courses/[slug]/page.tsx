"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Globe2,
  GraduationCap,
  Languages,
  Play,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const currentCourseSlug = course.slug;
  const leadInstructor = course.instructors[0] ?? null;
  const access = course.access;
  const isFree = course.recommended_pricing?.base_price_minor === 0;
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
  const accessLabel = access?.has_access
    ? access.is_lifetime_access
      ? "Lifetime access"
      : access.days_left
        ? `${access.days_left} days left`
        : "Active access"
    : "Enrollment required";
  function renderPrimaryAction(className = "w-full sm:w-auto") {
    if (access?.has_access && continueLessonSlug) {
      return (
        <Button asChild size="lg" className={className}>
          <Link href={`/courses/${currentCourseSlug}/learn?lesson=${continueLessonSlug}`}>
            <Play />
            {access.progress_percent ? "Continue learning" : "Start learning"}
          </Link>
        </Button>
      );
    }

    if (isFree) {
      return (
        <Button size="lg" className={className} onClick={handleEnroll} disabled={enrolling}>
          <Ticket />
          {enrolling ? "Enrolling..." : "Enroll for free"}
        </Button>
      );
    }

    return (
      <Button
        size="lg"
        className={className}
        onClick={handlePurchase}
        disabled={purchasing || !accessToken}
      >
        <Ticket />
        {purchasing ? "Starting checkout..." : "Buy course"}
      </Button>
    );
  }

  return (
    <AppShell>
      <div className="space-y-0">
        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-rose-600">{error}</CardContent>
          </Card>
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
              <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] backdrop-blur-xl">
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
                    <p className="text-3xl font-extrabold text-slate-950">
                      {formatPrice(course.recommended_pricing)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{accessLabel}</p>
                  </div>
                  {renderPrimaryAction("w-full")}
                  <div className="space-y-3 border-t border-[color:var(--border)] pt-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-orange-500" />
                      {course.certificate_enabled ? "Shareable certificate" : "Completion tracking"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="size-4 text-orange-500" />
                      {formatMinutes(course.duration_minutes)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe2 className="size-4 text-orange-500" />
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
              { icon: Clock3, label: "Schedule", value: "Flexible" },
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

        <nav className="sticky top-16 z-20 mt-8 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-glass)] px-3 py-2 backdrop-blur-xl">
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
                    <CheckCircle2 className="mt-1 size-5 shrink-0 text-orange-500" />
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
                  { icon: Award, title: "Certificate", text: course.certificate_enabled ? "Included" : "Not included" },
                  { icon: Clock3, title: "Duration", text: formatMinutes(course.duration_minutes) },
                  { icon: Languages, title: "Language", text: course.language_code.toUpperCase() },
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
                  className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] backdrop-blur"
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
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-primary)] px-3 py-2 text-xs font-bold text-slate-600">
                      Module details
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
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
                          className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-primary)] px-3 py-3"
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
                <div className="mt-6 space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-4">
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
                      className="group rounded-xl border border-[color:var(--border)]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                      <p className="font-semibold text-slate-950">{faq.question}</p>
                        <ChevronDown className="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
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
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>{course.lesson_count} lessons across {moduleCount} modules</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>{course.certificate_enabled ? "Certificate-ready learning path" : "Structured progress tracking"}</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>Self-paced, online access</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>{accessLabel}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--border)] pt-5">
              <h2 className="text-lg font-extrabold text-slate-950">Pricing and access</h2>
              {course.recommended_pricing ? (
                <div className="mt-4">
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
                      <p className="font-bold text-slate-950">
                        {formatPrice(course.recommended_pricing)}
                      </p>
                      {course.recommended_pricing.is_display_price_estimated ? (
                        <p className="mt-1 text-xs text-slate-500">Estimated local price</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Pricing is not available yet.</p>
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
