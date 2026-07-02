"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Bot,
  ClipboardCheck,
  Flame,
  Play,
  Send,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { aiClient, type Roadmap, type StudentAIContext } from "@/lib/ai-client";
import { formatMinutes, learningClient, type CourseCatalogItem } from "@/lib/learning-client";

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [context, setContext] = useState<StudentAIContext | null>(null);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [mentorQuery, setMentorQuery] = useState("");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadDashboard() {
      setIsDashboardLoading(true);
      const [courseResult, contextResult, roadmapResult] = await Promise.allSettled([
        learningClient.listCourses({ pageSize: 6, token: accessToken }),
        accessToken ? aiClient.getContext(accessToken) : Promise.resolve(null),
        accessToken ? aiClient.listRoadmaps(accessToken) : Promise.resolve([]),
      ]);

      if (cancelled) return;
      setCourses(courseResult.status === "fulfilled" ? courseResult.value.items : []);
      setContext(contextResult.status === "fulfilled" ? contextResult.value : null);
      setRoadmaps(roadmapResult.status === "fulfilled" ? roadmapResult.value : []);
      setIsDashboardLoading(false);
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  const dashboard = useMemo(() => {
    const activeCourses = courses.filter((course) => course.access?.has_access);
    const lessonCount = courses.reduce((total, course) => total + course.lesson_count, 0);
    const averageProgress = activeCourses.length
      ? Math.round(
          activeCourses.reduce(
            (total, course) => total + (course.access?.progress_percent ?? 0),
            0,
          ) / activeCourses.length,
        )
      : 0;
    const weeklyStudyHours = context?.weekly_study_hours ?? 8;
    const focusArea =
      context?.interests[0] ??
      roadmaps[0]?.answers.focus_areas[0] ??
      courses.find((course) => course.access?.has_access)?.categories[0]?.name ??
      "Core engineering";

    return {
      activeCourses,
      averageProgress,
      focusArea,
      lessonCount,
      nextSessionMinutes: Math.max(25, Math.min(90, Math.round((weeklyStudyHours * 60) / 5))),
      primaryGoal: context?.goals[0] ?? roadmaps[0]?.answers.goal ?? "Build your next skill",
      weeklyStudyHours,
    };
  }, [context, courses, roadmaps]);

  function openMentor(event: FormEvent) {
    event.preventDefault();
    const query = mentorQuery.trim();
    if (!query) return;
    router.push(`/mentor?prompt=${encodeURIComponent(query)}`);
  }

  if (isAuthLoading) {
    return null;
  }

  const firstName = (user?.display_name ?? "learner").split(" ")[0];
  const currentCourse = dashboard.activeCourses[0] ?? courses[0] ?? null;
  const recommendations = courses.filter((course) => course.slug !== currentCourse?.slug).slice(0, 3);
  const progress = Math.max(
    8,
    Math.round(currentCourse?.access?.progress_percent ?? (dashboard.averageProgress || 72)),
  );
  const promptChips = ["How do I use auto-layout?", "Summarize Lesson 4", "Engineering math cheat sheet"];

  return (
    <AppShell>
      <div className="dark-system -mx-4 -my-6 min-h-screen overflow-hidden px-4 py-7 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-16">
          <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-orange-400">Dashboard</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-extrabold text-slate-950 md:text-5xl">
                Welcome back, {firstName}!
              </h1>
              <p className="mt-3 text-lg text-slate-500">
                {progress}% through this week. Keep the learning loop moving.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                { label: "Streak", value: "24 days", icon: Flame },
                { label: "Focus", value: dashboard.focusArea, icon: BookOpen },
                { label: "Planned", value: `${dashboard.weeklyStudyHours}h`, icon: ClipboardCheck },
              ].map(({ label, value, icon: LucideIcon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-600 backdrop-blur"
                >
                  <LucideIcon className="size-4 text-orange-400" />
                  <span className="text-slate-500">{label}</span>
                  <span className="max-w-36 truncate font-bold text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </header>

          <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl">
            <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
              <Link
                href={currentCourse ? `/courses/${currentCourse.slug}` : "/courses"}
                className="group relative min-h-[25rem] overflow-hidden"
              >
                <div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-orange-300/25 bg-[#020617]/70 px-3 py-1 text-xs font-bold uppercase text-orange-300 backdrop-blur">
                  <Play className="size-4" />
                  Continue Learning
                </div>
                {currentCourse?.thumbnail_url ? (
                  <Image
                    src={currentCourse.thumbnail_url}
                    alt={currentCourse.title}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 56vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="industrial-hero-media absolute inset-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/90 via-[#020617]/42 to-transparent" />
                <div className="absolute inset-0 surface-grid opacity-25" />
                <div className="relative z-10 flex h-full min-h-[25rem] items-center p-6 md:p-10">
                  <span className="flex size-20 items-center justify-center rounded-full border border-orange-300/40 bg-orange-400/20 text-orange-200 backdrop-blur transition group-hover:bg-orange-400 group-hover:text-slate-950">
                    <Play className="ml-1 size-10 fill-current" />
                  </span>
                </div>
              </Link>

              <div className="flex flex-col justify-center border-t border-white/10 p-6 md:p-10 lg:border-l lg:border-t-0">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs font-bold uppercase text-orange-300">
                    Module 4: Variables
                  </span>
                  <span className="text-sm text-slate-500">
                    {dashboard.nextSessionMinutes} mins remaining
                  </span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-950 md:text-4xl">
                  {currentCourse?.title ?? "Advanced Figma Prototyping"}
                </h2>
                <p className="mt-4 line-clamp-3 text-slate-500">
                  {currentCourse?.short_description ??
                    "Master conditional logic, component sets, and advanced micro-interactions for engineering dashboards."}
                </p>
                <div className="mt-8 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-950">{progress}% Complete</span>
                    <span className="text-slate-500">{currentCourse?.lesson_count ?? 14} lessons</span>
                  </div>
                  <Progress value={progress} />
                </div>
                <Button asChild className="mt-8 w-fit">
                  <Link href={currentCourse ? `/courses/${currentCourse.slug}` : "/courses"}>
                    Resume module
                    <Play />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#0f172a]/60 p-5 backdrop-blur-xl md:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-300 to-orange-500 text-slate-950">
                <Bot className="size-6" />
              </span>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-950">Engineering Copilot</h2>
                <p className="text-sm text-slate-500">
                  Ask anything about your courses or technical queries.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/5 bg-[#070e1e]/55 p-4">
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-300/15 text-orange-300">
                  <Bot className="size-4" />
                </span>
                <div className="max-w-[82%] rounded-xl rounded-tl-sm bg-white/[0.07] p-3 text-sm leading-6 text-slate-600">
                  Hello {firstName}. I see you&apos;re focused on {dashboard.focusArea}. Would you
                  like a quick explanation or a practice plan?
                </div>
              </div>
            </div>

            <form onSubmit={openMentor} className="relative mt-4">
              <input
                value={mentorQuery}
                onChange={(event) => setMentorQuery(event.target.value)}
                placeholder="Type your engineering query here..."
                className="w-full rounded-xl border border-white/10 bg-[#020617]/60 py-4 pl-5 pr-16 text-slate-950 outline-none transition focus:border-orange-300"
              />
              <button
                type="submit"
                disabled={!mentorQuery.trim()}
                className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-lg bg-orange-400 text-slate-950 transition hover:bg-orange-300 disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </form>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {promptChips.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMentorQuery(prompt)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-orange-300/40 hover:text-orange-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-slate-950">Recommended for You</h2>
              <Link href="/courses" className="text-sm font-bold text-orange-300 hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {isDashboardLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <Skeleton className="h-40 rounded-lg" />
                      <Skeleton className="mt-4 h-5 w-3/4 rounded" />
                    </div>
                  ))
                : recommendations.map((course, index) => (
                    <Link
                      key={course.slug}
                      href={`/courses/${course.slug}`}
                      className="group overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/60 transition hover:border-orange-300/35"
                    >
                      <div className="industrial-hero-media relative h-48 overflow-hidden">
                        {course.thumbnail_url ? (
                          <Image
                            src={course.thumbnail_url}
                            alt={course.title}
                            fill
                            unoptimized
                            sizes="(min-width: 768px) 33vw, 100vw"
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/80 via-transparent to-transparent" />
                        <span className="absolute right-3 top-3 rounded bg-[#020617]/80 px-2 py-1 text-[10px] font-bold text-orange-300 backdrop-blur">
                          {index === 0 ? "ADVANCED" : index === 1 ? "INTERMEDIATE" : "BEGINNER"}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-950 transition group-hover:text-orange-300">
                          {course.title}
                        </h3>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span>{formatMinutes(course.duration_minutes)}</span>
                          <span className="size-1 rounded-full bg-slate-500" />
                          <span className="flex items-center gap-1">
                            <Star className="size-3" />
                            {course.average_rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
            </div>
          </section>

          <section className="grid gap-8 border-t border-white/10 pt-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="mb-5 text-2xl font-extrabold text-slate-950">Your Certifications</h2>
              <div className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/45">
                {[
                  {
                    title: "UX Engineering Professional",
                    detail: "Issued June 12, 2024 · ID: GH-889-21",
                    icon: Award,
                  },
                  {
                    title: "Applied Systems Thinking",
                    detail: `${dashboard.lessonCount} lessons available`,
                    icon: ClipboardCheck,
                  },
                ].map(({ title, detail, icon: LucideIcon }) => (
                  <div key={String(title)} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-orange-300/12 text-orange-300">
                        <LucideIcon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-950">{title}</h3>
                        <p className="truncate text-xs text-slate-500">{detail}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">
                      Download PDF
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-5 text-2xl font-extrabold text-slate-950">This Week</h2>
              <div className="space-y-4">
                {[
                  { label: "Focus area", value: dashboard.focusArea, icon: BookOpen },
                  { label: "Primary goal", value: dashboard.primaryGoal, icon: ClipboardCheck },
                  { label: "Study rhythm", value: `${dashboard.weeklyStudyHours} hours planned`, icon: Flame },
                ].map(({ label, value, icon: LucideIcon }) => (
                  <div key={String(label)} className="flex gap-4 border-b border-white/10 pb-4 last:border-b-0">
                    <LucideIcon className="mt-1 size-5 shrink-0 text-orange-300" />
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                      <p className="mt-1 font-bold text-slate-950">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
