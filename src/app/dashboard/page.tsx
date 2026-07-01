"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  ClipboardCheck,
  Flame,
  Gauge,
  NotebookText,
  Send,
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
    };
  }, [context, courses, roadmaps]);

  const achievements = useMemo(
    () => [
      {
        title: "CAD Pro",
        detail: dashboard.enrolled
          ? `${dashboard.enrolled} active course${dashboard.enrolled === 1 ? "" : "s"}`
          : "Start your first course",
        icon: Award,
      },
      {
        title: "Math Wizard",
        detail: dashboard.lessonCount ? `${dashboard.lessonCount} lessons available` : "Lessons syncing",
        icon: ClipboardCheck,
      },
      {
        title: "Week Streak",
        detail: dashboard.averageProgress ? `${dashboard.averageProgress}% average progress` : "Build momentum",
        icon: Flame,
      },
    ],
    [dashboard.averageProgress, dashboard.enrolled, dashboard.lessonCount],
  );

  function openMentor(event: FormEvent) {
    event.preventDefault();
    const query = mentorQuery.trim();
    if (!query) return;
    router.push(`/mentor?prompt=${encodeURIComponent(query)}`);
  }

  const firstName = (user?.display_name ?? "learner").split(" ")[0];
  const activeCourses = courses.filter((course) => course.access?.has_access);
  const currentCourses = activeCourses.length ? activeCourses : courses.slice(0, 2);
  const progressPercent = Math.max(8, dashboard.averageProgress || 52);
  const weeklyProgress = Math.min(100, Math.max(progressPercent, dashboard.weeklyStudyHours * 8));
  const nextMoves = [
    {
      title: `Assignment: ${dashboard.focusArea}`,
      detail: `${dashboard.nextSessionMinutes} min focus block`,
      icon: ClipboardCheck,
    },
    {
      title: "Recommended reading",
      detail: roadmaps[0]?.plan.summary ?? dashboard.primaryGoal,
      icon: BookOpen,
    },
  ];
  const profileRows = [
    {
      label: "CAD & Modeling",
      value: context?.interests.slice(0, 2).join(", ") || dashboard.focusArea,
      score: dashboard.enrolled ? 4 : 2,
    },
    {
      label: "FEA Analysis",
      value: context?.target_exams.slice(0, 2).join(", ") || "Set exam targets",
      score: roadmaps.length ? 4 : 3,
    },
    {
      label: "Project Management",
      value: context?.degree ?? context?.academic_level ?? "Add academic context",
      score: context ? 4 : 2,
    },
  ];

  const promptChips = [
    "Calculate gear ratios",
    "Explain stress-strain curve",
    "Verify FEA mesh",
    "Create study plan",
  ];

  if (isAuthLoading) {
    return null;
  }

  return (
    <AppShell>
      <div className="rounded-[28px] border border-orange-200/70 bg-[#fffaf2] p-3 text-[#1c1b1b] shadow-[var(--shadow-md)] [--background:#fffaf2] [--border:rgba(219,132,0,0.2)] [--card:#ffffff] [--foreground:#1c1b1b] [--muted:#544435] [--slate-50:#fffaf2] [--slate-100:#fff7eb] [--slate-200:#ffe0b3] [--slate-300:#d9c2af] [--slate-400:#877462] [--slate-500:#6f5f4e] [--slate-600:#544435] [--slate-700:#402e0f] [--slate-800:#281900] [--slate-900:#1c1b1b] [--slate-950:#1c1b1b] [--surface-elevated:#ffffff] [--surface-primary:#ffffff] [--surface-secondary:#fff7eb] sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-2xl border border-orange-200/70 bg-white px-5 py-7 shadow-sm sm:px-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(219,132,0,0.16),transparent_18rem),radial-gradient(circle_at_82%_12%,rgba(255,196,107,0.22),transparent_16rem),linear-gradient(rgba(148,89,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,89,0,0.045)_1px,transparent_1px)] bg-[size:auto,auto,28px_28px,28px_28px]" />
              <div className="relative z-10 mx-auto max-w-2xl text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
                  Engineering workspace
                </p>
                <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
                  Welcome back, {firstName}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Ready to continue your engineering journey today?
                </p>

                <form
                  onSubmit={openMentor}
                  className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-xl border border-orange-200/80 bg-[#fff7eb] p-2 shadow-sm"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                    <Bot className="size-4 shrink-0 text-orange-700" />
                    <input
                      value={mentorQuery}
                      onChange={(event) => setMentorQuery(event.target.value)}
                      placeholder="Ask GaugeHow anything about mechanical engineering..."
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                      maxLength={4000}
                    />
                  </div>
                  <Button type="submit" size="icon" disabled={!mentorQuery.trim()} className="size-9 rounded-lg">
                    <Send className="size-4" />
                  </Button>
                </form>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {promptChips.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setMentorQuery(prompt)}
                      className="rounded-lg border border-orange-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-orange-400 hover:text-orange-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-950">Your Courses</h2>
                <Link href="/courses" className="text-xs font-bold text-orange-700 hover:underline">
                  View All
                </Link>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {isDashboardLoading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-xl border border-orange-200 bg-white">
                      <Skeleton className="h-32 rounded-none" />
                      <div className="space-y-3 p-4">
                        <Skeleton className="h-4 w-36 rounded" />
                        <Skeleton className="h-6 w-2/3 rounded" />
                        <Skeleton className="h-3 w-full rounded" />
                      </div>
                    </div>
                  ))
                ) : currentCourses.length ? (
                  currentCourses.map((course, index) => {
                    const progress = Math.round(course.access?.progress_percent ?? 0);
                    const category = course.categories[0]?.name ?? (index === 0 ? "CAD & Modeling" : "Thermodynamics");
                    return (
                      <article
                        key={course.slug}
                        className="overflow-hidden rounded-xl border border-orange-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(148,89,0,0.12)]"
                      >
                        <div className="relative h-32 overflow-hidden bg-slate-950">
                          <div
                            className={
                              index % 2 === 0
                                ? "absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,196,107,0.38),transparent_10rem),linear-gradient(135deg,#2c1600,#895100_58%,#ffb86d)]"
                                : "absolute inset-0 bg-[radial-gradient(circle_at_74%_28%,rgba(219,132,0,0.34),transparent_10rem),linear-gradient(135deg,#1c1b1b,#544435_48%,#d9c2af)]"
                            }
                          />
                          <div className="absolute inset-4 grid grid-cols-5 gap-2 opacity-35">
                            {Array.from({ length: 15 }).map((_, gridIndex) => (
                              <span key={gridIndex} className="rounded border border-white/40" />
                            ))}
                          </div>
                          <div className="relative flex h-full items-center justify-center text-white">
                            <div className="flex size-16 items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur">
                              {index % 2 === 0 ? <Wrench className="size-8" /> : <Gauge className="size-8" />}
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="rounded bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                              {category}
                            </span>
                            <span className="text-[11px] font-semibold text-orange-700">
                              {course.lesson_count} Modules
                            </span>
                          </div>
                          <h3 className="line-clamp-1 font-semibold text-slate-950">{course.title}</h3>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            Instructor: {course.instructors[0]?.display_name ?? "GaugeHow Faculty"}
                          </p>
                          <div className="mt-4 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                              <span>{formatMinutes(course.duration_minutes ?? dashboard.nextSessionMinutes)}</span>
                              <span className="text-orange-700">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-orange-100" />
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-orange-200 bg-white p-6 text-sm text-slate-600 lg:col-span-2">
                    No live courses are available from the backend yet.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-950">Recent Achievements</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div key={achievement.title} className="rounded-xl border border-orange-200/70 bg-white p-4 shadow-sm">
                      <div className="flex size-10 items-center justify-center rounded-full bg-orange-50 text-orange-700">
                        <Icon className="size-5" />
                      </div>
                      <p className="mt-3 font-semibold text-slate-950">{achievement.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{achievement.detail}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-orange-200/70 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-950">Weekly Progress</h2>
                <Gauge className="size-4 text-orange-700" />
              </div>
              {isDashboardLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-2 rounded" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Learning hours</span>
                    <span className="text-orange-700">
                      {dashboard.weeklyStudyHours}h / {Math.max(12, dashboard.weeklyStudyHours + 4)}h
                    </span>
                  </div>
                  <Progress value={weeklyProgress} className="mt-2 h-2 bg-orange-100" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-orange-100 bg-[#fff7eb] p-3">
                      <p className="text-lg font-bold text-orange-700">
                        {Math.max(dashboard.completedCourses, dashboard.enrolled)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">Modules Done</p>
                    </div>
                    <div className="rounded-lg border border-orange-100 bg-[#fff7eb] p-3">
                      <p className="text-lg font-bold text-orange-700">{dashboard.averageProgress || 92}%</p>
                      <p className="text-[11px] font-semibold text-slate-500">Avg Score</p>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-xl border border-orange-200/70 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-950">Next Moves</h2>
              <div className="mt-3 space-y-2">
                {nextMoves.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3 rounded-lg bg-[#fff7eb] p-3">
                      <div className="mt-0.5 text-orange-700">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-950">{item.title}</p>
                        <p className="line-clamp-1 text-[11px] text-slate-500">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-orange-200/70 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-950">Learning Profile</h2>
              <div className="mt-3 space-y-3">
                {profileRows.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{row.label}</p>
                        <p className="truncate text-[11px] text-slate-500">{row.value}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <span
                            key={index}
                            className={
                              index < row.score
                                ? "size-1.5 rounded-full bg-orange-500"
                                : "size-1.5 rounded-full bg-orange-100"
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="secondary" size="sm" className="mt-4 w-full rounded-lg">
                <Link href="/settings">Download Skill Report</Link>
              </Button>
            </section>

            <section className="rounded-xl border border-orange-300/70 bg-[#fff1d6] p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white/80 p-2 text-orange-700">
                  <NotebookText className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-950">GaugeHow Notes</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Access calculation engineering handbooks and solved examples.
                  </p>
                  <Link href="/library" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-800">
                    Open Library
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-orange-200/70 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-950">{dashboard.enrolled}</p>
                  <p className="text-[11px] font-semibold text-slate-500">Active Courses</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-950">{roadmaps.length}</p>
                  <p className="text-[11px] font-semibold text-slate-500">Roadmaps</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
