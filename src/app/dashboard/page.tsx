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
      <div className="relative left-1/2 -my-6 min-h-screen w-screen -translate-x-1/2 overflow-hidden bg-[color:var(--background)] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-12">
          <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-accent">Dashboard</p>
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
                  className="flex items-center gap-3 rounded-full surface-secondary px-4 py-2 text-slate-600"
                >
                  <LucideIcon className="size-4 text-accent" />
                  <span className="text-slate-500">{label}</span>
                  <span className="max-w-36 truncate font-bold text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </header>

          <section className="mx-auto max-w-5xl pt-1 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 to-orange-500 text-slate-950 shadow-[var(--shadow-sm)]">
              <Bot className="size-7" />
            </div>
            <h2 className="mt-5 text-4xl font-extrabold text-slate-950 md:text-5xl">
              Engineering Copilot
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
              Ask anything about your courses or technical queries.
            </p>

            <form onSubmit={openMentor} className="mx-auto mt-7 max-w-4xl">
              <div className="relative rounded-full surface-secondary p-2">
                <input
                  value={mentorQuery}
                  onChange={(event) => setMentorQuery(event.target.value)}
                  placeholder="Ask about lessons, roadmaps, formulas, or your next practice plan..."
                  className="h-16 w-full rounded-full bg-transparent pl-6 pr-16 text-base text-slate-950 outline-none placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={!mentorQuery.trim()}
                  className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-orange-400 text-slate-950 transition hover:bg-orange-300 disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="size-5" />
                </button>
              </div>
            </form>
            <div className="mx-auto mt-4 flex max-w-4xl flex-wrap justify-center gap-2">
              {promptChips.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMentorQuery(prompt)}
                  className="rounded-full surface-secondary px-4 py-2 text-xs font-bold text-slate-500 transition hover:text-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-5xl overflow-hidden rounded-2xl surface-secondary">
            <div className="grid lg:grid-cols-[0.82fr_1fr]">
              <Link
                href={currentCourse ? `/courses/${currentCourse.slug}` : "/courses"}
                className="group relative min-h-[13rem] overflow-hidden lg:min-h-[15rem]"
              >
                <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-[#241a10]/70 px-3 py-1 text-xs font-bold uppercase text-orange-300 backdrop-blur">
                  <Play className="size-4" />
                  Continue Learning
                </div>
                {currentCourse?.thumbnail_url ? (
                  <Image
                    src={currentCourse.thumbnail_url}
                    alt={currentCourse.title}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 42vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="industrial-hero-media absolute inset-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#241a10]/88 via-[#241a10]/36 to-transparent" />
                <div className="absolute inset-0 surface-grid opacity-20" />
                <div className="relative z-10 flex h-full min-h-[13rem] items-center p-5 lg:min-h-[15rem]">
                  <span className="flex size-14 items-center justify-center rounded-full bg-orange-400/20 text-orange-200 backdrop-blur transition group-hover:bg-orange-400 group-hover:text-slate-950">
                    <Play className="ml-0.5 size-7 fill-current" />
                  </span>
                </div>
              </Link>

              <div className="flex flex-col justify-center p-5 md:p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase text-accent">
                    Module 4: Variables
                  </span>
                  <span className="text-xs text-slate-500">
                    {dashboard.nextSessionMinutes} mins remaining
                  </span>
                </div>
                <h2 className="max-w-xl text-2xl font-extrabold text-slate-950 md:text-3xl">
                  {currentCourse?.title ?? "Advanced Figma Prototyping"}
                </h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                  {currentCourse?.short_description ??
                    "Master conditional logic, component sets, and advanced micro-interactions for engineering dashboards."}
                </p>
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-950">{progress}% Complete</span>
                    <span className="text-slate-500">{currentCourse?.lesson_count ?? 14} lessons</span>
                  </div>
                  <Progress value={progress} />
                </div>
                <Button asChild className="mt-5 w-fit">
                  <Link href={currentCourse ? `/courses/${currentCourse.slug}` : "/courses"}>
                    Resume module
                    <Play />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-slate-950">Recommended for You</h2>
              <Link href="/courses" className="text-sm font-bold text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {isDashboardLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="browse-card p-4">
                      <Skeleton className="h-48 rounded-xl" />
                      <Skeleton className="mt-4 h-5 w-3/4 rounded" />
                      <Skeleton className="mt-2 h-4 w-1/2 rounded" />
                    </div>
                  ))
                : recommendations.map((course, index) => (
                    <Link key={course.slug} href={`/courses/${course.slug}`} className="browse-card group p-4">
                      <div className="industrial-hero-media relative h-48 overflow-hidden rounded-xl">
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
                        <div className="absolute inset-0 bg-gradient-to-t from-[#241a10]/80 via-transparent to-transparent" />
                        <span className="absolute right-3 top-3 rounded bg-[#241a10]/80 px-2 py-1 text-[10px] font-bold text-orange-300 backdrop-blur">
                          {index === 0 ? "ADVANCED" : index === 1 ? "INTERMEDIATE" : "BEGINNER"}
                        </span>
                      </div>
                      <div className="pt-4">
                        <h3 className="font-bold text-slate-950 transition group-hover:text-accent">
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

          <section className="grid gap-8 pt-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="mb-5 text-2xl font-extrabold text-slate-950">Your Certifications</h2>
              <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-xl surface-secondary">
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
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
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
                  <div key={String(label)} className="flex gap-4 border-b border-[color:var(--border)] pb-4 last:border-b-0">
                    <LucideIcon className="mt-1 size-5 shrink-0 text-accent" />
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
