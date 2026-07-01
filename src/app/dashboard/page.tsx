"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  GraduationCap,
  Library,
  MessageSquareText,
  PlayCircle,
  Route,
  Send,
  Target,
  Trophy,
  Wrench,
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
      weeklyStudyHours,
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
          icon: BookOpen,
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
      },
      {
        title: "Momentum builder",
        detail: dashboard.averageProgress
          ? `${dashboard.averageProgress}% average progress`
          : "Progress appears after lessons",
        icon: Trophy,
      },
      {
        title: "Goal designer",
        detail: roadmaps.length
          ? `${roadmaps.length} AI roadmap${roadmaps.length === 1 ? "" : "s"} created`
          : "Create a roadmap with Mentor",
        icon: BrainCircuit,
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

  const firstName = (user?.display_name ?? "learner").split(" ")[0];
  const activeCourses = courses.filter((course) => course.access?.has_access);
  const currentCourses = activeCourses.length ? activeCourses : courses.slice(0, 3);
  const primaryCourse = currentCourses[0];
  const primaryCourseProgress = Math.round(primaryCourse?.access?.progress_percent ?? 0);
  const primaryCategory = primaryCourse?.categories[0]?.name ?? dashboard.focusArea;
  const primaryModuleCount = primaryCourse ? Math.max(1, Math.ceil(primaryCourse.lesson_count / 3)) : 4;
  const currentModule = Math.max(
    1,
    Math.min(primaryModuleCount, Math.ceil((primaryCourseProgress / 100) * primaryModuleCount) || 1),
  );
  const ringProgress = Math.max(8, dashboard.averageProgress || Math.min(100, dashboard.weeklyStudyHours * 8));

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
      <div className="space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-2 max-w-2xl text-lg text-slate-600">
              You have {Math.max(1, dashboard.enrolled || roadmaps.length || 2)} learning priorities this week. Keep up the momentum.
            </p>
          </div>
          <Button asChild className="self-start rounded bg-orange-600 px-6 shadow-sm sm:self-auto">
            <Link href={primaryCourse ? `/courses/${primaryCourse.slug}/learn` : "/courses"}>
              Resume Study Session
            </Link>
          </Button>
        </section>

        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-5 lg:col-span-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
                <PlayCircle className="size-5 text-orange-600" />
                Continue Learning
              </h2>
              <Link href="/courses" className="text-sm font-semibold text-orange-700 hover:underline">
                View All Courses
              </Link>
            </div>

            {isDashboardLoading ? (
              <div className="rounded-lg border border-orange-200/60 bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row">
                  <Skeleton className="h-48 rounded sm:h-auto sm:w-1/3" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-8 w-2/3 rounded" />
                    <Skeleton className="h-20 w-full rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                  </div>
                </div>
              </div>
            ) : primaryCourse ? (
              <article className="overflow-hidden rounded-lg border border-orange-200/60 bg-white shadow-sm transition hover:shadow-[0_8px_24px_rgba(219,132,0,0.12)]">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative min-h-56 border-b border-orange-100 bg-slate-950 sm:w-1/3 sm:border-b-0 sm:border-r">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,196,107,0.34),transparent_24rem),linear-gradient(135deg,#1c1b1b,#4a2900_54%,#895100)]" />
                    <div className="absolute inset-6 grid grid-cols-3 gap-3 opacity-35">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <div key={index} className="rounded border border-white/30" />
                      ))}
                    </div>
                    <div className="relative flex h-full min-h-56 items-center justify-center">
                      <div className="flex size-24 items-center justify-center rounded-full border border-orange-200/50 bg-white/10 text-orange-100 backdrop-blur">
                        <Wrench className="size-11" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <span className="rounded bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                          {primaryCategory}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-medium text-slate-500">
                          <Clock3 className="size-4" />
                          {formatMinutes(
                            Math.min(primaryCourse.duration_minutes ?? dashboard.nextSessionMinutes, dashboard.nextSessionMinutes),
                          )}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-950">{primaryCourse.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {primaryCourse.short_description ||
                          `Module ${currentModule}: Continue the next practical lesson in ${primaryCategory}.`}
                      </p>
                    </div>

                    <div className="mt-7 space-y-2">
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>
                          Progress: Module {currentModule}/{primaryModuleCount}
                        </span>
                        <span className="font-bold text-orange-700">{primaryCourseProgress}%</span>
                      </div>
                      <Progress value={primaryCourseProgress} className="h-2 bg-[#ffe0b3]" />
                    </div>
                  </div>
                </div>
              </article>
            ) : (
              <div className="rounded-lg border border-orange-200/60 bg-white p-6 text-sm leading-6 text-slate-600">
                No live courses are available from the backend yet.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {isDashboardLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-lg border border-orange-200/50 bg-white p-4">
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="mt-3 h-8 w-16 rounded" />
                      <Skeleton className="mt-3 h-4 w-28 rounded" />
                    </div>
                  ))
                : dashboard.stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="rounded-lg border border-orange-200/50 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">{stat.label}</p>
                            <p className="mt-2 text-2xl font-bold text-slate-950">{stat.value}</p>
                            <p className="mt-1 text-xs font-semibold text-orange-700">{stat.change}</p>
                          </div>
                          <div className="rounded bg-[#f0f3ff] p-2 text-slate-700">
                            <Icon className="size-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>

          <aside className="col-span-12 space-y-5 lg:col-span-4">
            <div className="rounded-lg border border-orange-200/60 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-950">
                <Gauge className="size-5 text-orange-600" />
                Weekly Progress
              </h2>
              {isDashboardLoading ? (
                <div className="space-y-4">
                  <Skeleton className="mx-auto size-32 rounded-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-20 rounded-lg" />
                    <Skeleton className="h-20 rounded-lg" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative flex justify-center py-4">
                    <div className="relative flex size-32 items-center justify-center rounded-full border-[12px] border-[#e7ebf7]">
                      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                        <path
                          className="text-orange-600"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray={`${ringProgress}, 100`}
                          strokeLinecap="round"
                          strokeWidth="4"
                        />
                      </svg>
                      <div className="relative z-10 text-center">
                        <span className="block text-3xl font-bold leading-none text-slate-950">
                          {dashboard.weeklyStudyHours}
                          <span className="text-lg">h</span>
                        </span>
                        <span className="text-xs font-medium text-slate-500">Studied</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div className="rounded-lg border border-orange-100 bg-[#f0f3ff] p-3">
                      <span className="block text-2xl font-semibold text-orange-700">
                        {Math.max(dashboard.completedCourses, dashboard.enrolled)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">Modules Done</span>
                    </div>
                    <div className="rounded-lg border border-orange-100 bg-[#f0f3ff] p-3">
                      <span className="block text-2xl font-semibold text-orange-700">
                        {dashboard.averageProgress || 92}%
                      </span>
                      <span className="text-xs font-medium text-slate-500">Avg Score</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg border border-orange-200/60 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-orange-700">Smart focus</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Next moves</h2>
                </div>
                <MessageSquareText className="size-5 text-slate-700" />
              </div>
              <div className="space-y-3">
                {isDashboardLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 rounded-lg" />
                    ))
                  : focusPlan.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="flex gap-3 rounded-lg bg-[#f0f3ff] p-3">
                          <div className="rounded bg-white p-2 text-orange-700 shadow-sm">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{item.title}</p>
                            <p className="line-clamp-2 text-sm leading-5 text-slate-500">{item.detail}</p>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="rounded-lg border border-orange-200/60 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-orange-700">AI Mentor</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Ask for the next study block</h2>
              </div>
              <Bot className="size-5 text-orange-700" />
            </div>
            <form onSubmit={openMentor} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border border-orange-200/60 bg-[#f9f9ff] px-3">
                <Bot className="size-5 shrink-0 text-orange-700" />
                <input
                  value={mentorQuery}
                  onChange={(event) => setMentorQuery(event.target.value)}
                  placeholder="Ask Mentor about a course, exam, roadmap, or study block"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                  maxLength={4000}
                />
              </div>
              <Button type="submit" disabled={!mentorQuery.trim()} className="rounded">
                <Send />
                Send
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {promptChips.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMentorQuery(prompt)}
                  className="rounded border border-orange-200/70 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-orange-200/60 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-orange-700">Library</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Saved practice</h2>
              </div>
              <Library className="size-5 text-slate-700" />
            </div>
            <div className="mt-4 space-y-3">
              {isDashboardLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 rounded-lg" />
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-[#f0f3ff] p-3">
                    <span className="text-sm font-semibold text-slate-700">Recommended reads</span>
                    <span className="text-sm font-bold text-slate-950">{Math.max(3, dashboard.enrolled + 2)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#f0f3ff] p-3">
                    <span className="text-sm font-semibold text-slate-700">Practice sets</span>
                    <span className="text-sm font-bold text-slate-950">{Math.max(2, roadmaps.length + 1)}</span>
                  </div>
                  <Button asChild variant="secondary" className="w-full rounded">
                    <Link href="/library">
                      Open library
                      <ArrowRight />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-orange-200/60 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-orange-700">Learning profile</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Personalized context</h2>
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
                  <Skeleton key={index} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-orange-100 bg-[#f9f9ff] p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Degree</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {context?.degree ?? context?.academic_level ?? "Add academic details"}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-100 bg-[#f9f9ff] p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Targets</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {context?.target_exams.slice(0, 2).join(", ") || "No exam target yet"}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-100 bg-[#f9f9ff] p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Weekly pace</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {context?.weekly_study_hours ? `${context.weekly_study_hours} hours` : "Set study hours"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-orange-200/60 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-orange-700">Achievements</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Recent wins</h2>
              </div>
              <Trophy className="size-5 text-orange-700" />
            </div>
            <div className="space-y-3">
              {isDashboardLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 rounded-lg" />
                  ))
                : achievements.map((achievement) => {
                    const Icon = achievement.icon;
                    return (
                      <div key={achievement.title} className="flex items-start gap-3 rounded-lg bg-[#f0f3ff] p-3">
                        <div className="rounded bg-white p-2 text-orange-700 shadow-sm">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{achievement.title}</p>
                          <p className="text-sm leading-5 text-slate-500">{achievement.detail}</p>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
