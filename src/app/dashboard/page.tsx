"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
  Library,
  ListChecks,
  MessageSquareText,
  Route,
  Send,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CourseCard } from "@/components/shared/course-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { aiClient, type Roadmap, type StudentAIContext } from "@/lib/ai-client";
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";

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
    const enrolled = courses.filter((course) => course.access?.has_access).length;
    const lessonCount = courses.reduce((total, course) => total + course.lesson_count, 0);
    const activeCourses = courses.filter((course) => course.access?.has_access);
    const completedCourses = activeCourses.filter(
      (course) => (course.access?.progress_percent ?? 0) >= 100,
    ).length;
    const averageProgress = activeCourses.length
      ? Math.round(
          activeCourses.reduce(
            (total, course) => total + (course.access?.progress_percent ?? 0),
            0,
          ) / activeCourses.length,
        )
      : 0;
    const weeklyStudyHours = context?.weekly_study_hours ?? 8;
    const nextSessionMinutes = Math.max(25, Math.min(90, Math.round((weeklyStudyHours * 60) / 5)));
    const primaryGoal = context?.goals[0] ?? roadmaps[0]?.answers.goal ?? "Build your next skill";
    const focusArea =
      context?.interests[0] ??
      roadmaps[0]?.answers.focus_areas[0] ??
      courses.find((course) => course.access?.has_access)?.categories[0]?.name ??
      "Core concepts";

    return {
      averageProgress,
      completedCourses,
      enrolled,
      focusArea,
      lessonCount,
      nextSessionMinutes,
      primaryGoal,
      stats: [
        {
          label: "Active courses",
          value: String(enrolled),
          change: courses.length ? `${courses.length} live in catalog` : "Catalog syncing",
          icon: GraduationCap,
        },
        {
          label: "Progress",
          value: `${averageProgress}%`,
          change: activeCourses.length ? "Across enrolled courses" : "Start a course",
          icon: Target,
        },
        {
          label: "Lessons",
          value: String(lessonCount),
          change: "Available to study",
          icon: ListChecks,
        },
        {
          label: "AI roadmaps",
          value: String(roadmaps.length),
          change: context?.goals.length ? `${context.goals.length} goals in context` : "Ready to plan",
          icon: Route,
        },
      ],
    };
  }, [context, courses, roadmaps]);

  const achievements = useMemo(
    () => [
      {
        title: "Course starter",
        detail: dashboard.enrolled
          ? `${dashboard.enrolled} active course${dashboard.enrolled === 1 ? "" : "s"} unlocked`
          : "Pick your first course",
        icon: BookOpen,
        accent: "bg-[#e7f8f1] text-[#087f5b]",
      },
      {
        title: "Momentum builder",
        detail: dashboard.averageProgress
          ? `${dashboard.averageProgress}% average progress`
          : "Progress appears after lessons",
        icon: Flame,
        accent: "bg-orange-50 text-orange-600",
      },
      {
        title: "Goal designer",
        detail: roadmaps.length
          ? `${roadmaps.length} AI roadmap${roadmaps.length === 1 ? "" : "s"} created`
          : "Create a roadmap with Mentor",
        icon: Trophy,
        accent: "bg-[#eaf2ff] text-[#1f5fbf]",
      },
    ],
    [dashboard.averageProgress, dashboard.enrolled, roadmaps.length],
  );

  function openMentor(event: FormEvent) {
    event.preventDefault();
    const query = mentorQuery.trim();
    if (!query) return;
    router.push(`/mentor?prompt=${encodeURIComponent(query)}`);
  }

  function applyPrompt(prompt: string) {
    setMentorQuery(prompt);
  }

  const firstName = (user?.display_name ?? "learner").split(" ")[0];
  const activeCourses = courses.filter((course) => course.access?.has_access);
  const currentCourses = activeCourses.length ? activeCourses : courses.slice(0, 3);
  const focusPlan = [
    {
      title: `Study ${dashboard.focusArea}`,
      detail: `${dashboard.nextSessionMinutes} min focused session`,
      icon: Clock3,
    },
    {
      title: dashboard.primaryGoal,
      detail: roadmaps[0]?.plan.summary ?? "Ask Mentor to refine the next milestone",
      icon: BrainCircuit,
    },
    {
      title: "Review course progress",
      detail: dashboard.enrolled
        ? `${dashboard.completedCourses} completed course${dashboard.completedCourses === 1 ? "" : "s"}`
        : "Choose a course to personalize this area",
      icon: CheckCircle2,
    },
  ];

  const promptChips = [
    "Plan my next 45 minutes",
    "Explain today's weakest topic",
    "Make a revision checklist",
  ];

  if (isAuthLoading) {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="dashboard-mentor-bg reveal-up relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-5 shadow-[var(--shadow-md)] sm:px-6 lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute inset-0 opacity-80" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-center">
            <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/75 px-3 py-1 text-xs font-semibold text-orange-700 shadow-[var(--shadow-sm)]">
                <Sparkles className="size-3.5" />
                AI native student workspace
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
                Welcome back, {firstName}. What should we solve next?
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base lg:mx-0">
                Your courses, goals, and mentor stay together so the dashboard can load live data
                in pieces without slowing down the first screen.
              </p>

              <form
                onSubmit={openMentor}
                className="mx-auto mt-5 flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-[var(--shadow-lg)] sm:flex-row lg:mx-0"
              >
                <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl bg-slate-50 px-3">
                  <Bot className="size-5 shrink-0 text-orange-600" />
                  <input
                    value={mentorQuery}
                    onChange={(event) => setMentorQuery(event.target.value)}
                    placeholder="Ask Mentor about a course, exam, roadmap, or study block"
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                    maxLength={4000}
                  />
                </div>
                <Button type="submit" disabled={!mentorQuery.trim()} className="sm:min-w-32">
                  <Send />
                  Send
                </Button>
              </form>

              <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
                {promptChips.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="rounded-full border border-orange-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-700"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="soft-float hidden rounded-2xl border border-white/60 bg-slate-950 p-4 text-white shadow-[var(--shadow-lg)] lg:block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-white/55">Today</p>
                  <p className="mt-1 text-2xl font-bold">{dashboard.nextSessionMinutes}m</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <CalendarDays className="size-5 text-orange-200" />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-white/70">
                    <span>Learning flow</span>
                    <span>{dashboard.averageProgress}%</span>
                  </div>
                  <Progress
                    value={dashboard.averageProgress}
                    className="mt-2 bg-white/10"
                    indicatorClassName="bg-[#6ee7b7]"
                  />
                </div>
                <p className="rounded-xl bg-white/10 p-3 text-sm leading-5 text-white/78">
                  {dashboard.primaryGoal}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isDashboardLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="space-y-4 p-5">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-9 w-20 rounded-lg" />
                    <Skeleton className="h-4 w-36 rounded-md" />
                  </CardContent>
                </Card>
              ))
            : dashboard.stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="panel-depth overflow-hidden">
                    <CardContent className="relative flex items-start justify-between gap-4 p-5">
                      <div className="absolute inset-x-0 top-0 h-px bg-orange-300/40" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
                        <p className="text-sm font-semibold text-orange-600">{stat.change}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-slate-800 shadow-[var(--shadow-sm)]">
                        <Icon className="size-5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <div className="surface-elevated reveal-delay-1 reveal-up rounded-2xl p-4 shadow-[var(--shadow-sm)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-orange-600">Your courses</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Continue learning</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/courses">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isDashboardLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-4 p-5">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-8 w-4/5 rounded-lg" />
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-11 rounded-lg" />
                    </CardContent>
                  </Card>
                ))
              ) : currentCourses.length ? (
                currentCourses.map((course) => <CourseCard key={course.slug} course={course} />)
              ) : (
                <Card className="md:col-span-2 xl:col-span-3">
                  <CardContent className="p-6 text-sm leading-6 text-slate-600">
                    No live courses are available from the backend yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-orange-600">Achievements</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">Recent wins</h2>
                  </div>
                  <Award className="size-5 text-orange-600" />
                </div>
                {isDashboardLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex gap-3">
                        <Skeleton className="size-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32 rounded-md" />
                          <Skeleton className="h-3 w-full rounded-md" />
                        </div>
                      </div>
                    ))
                  : achievements.map((achievement) => {
                      const Icon = achievement.icon;
                      return (
                        <div
                          key={achievement.title}
                          className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/70 p-3"
                        >
                          <div className={`rounded-xl p-2.5 ${achievement.accent}`}>
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-950">{achievement.title}</p>
                            <p className="text-sm leading-5 text-slate-500">{achievement.detail}</p>
                          </div>
                        </div>
                      );
                    })}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-orange-600">Smart focus</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">Next moves</h2>
                  </div>
                  <MessageSquareText className="size-5 text-[#1f5fbf]" />
                </div>
                {isDashboardLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 rounded-xl" />
                    ))
                  : focusPlan.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                          <div className="rounded-lg bg-white p-2 text-slate-700 shadow-[var(--shadow-sm)]">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{item.title}</p>
                            <p className="line-clamp-2 text-sm leading-5 text-slate-500">{item.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/roadmaps">
                    Open roadmaps
                    <Route />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-orange-600">Learning profile</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Personalized context</h2>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/settings">
                    Update
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
              {isDashboardLoading ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Degree</p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {context?.degree ?? context?.academic_level ?? "Add academic details"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Targets</p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {context?.target_exams.slice(0, 2).join(", ") || "No exam target yet"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">Weekly pace</p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {context?.weekly_study_hours ? `${context.weekly_study_hours} hours` : "Set study hours"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-orange-600">Library</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Saved practice</h2>
                </div>
                <Library className="size-5 text-[#087f5b]" />
              </div>
              <div className="mt-4 space-y-3">
                {isDashboardLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 rounded-xl" />
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <span className="text-sm font-semibold text-slate-700">Recommended reads</span>
                      <span className="text-sm font-bold text-slate-950">{Math.max(3, dashboard.enrolled + 2)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <span className="text-sm font-semibold text-slate-700">Practice sets</span>
                      <span className="text-sm font-bold text-slate-950">{Math.max(2, roadmaps.length + 1)}</span>
                    </div>
                    <Button asChild variant="secondary" className="w-full">
                      <Link href="/library">
                        Open library
                        <ArrowRight />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
