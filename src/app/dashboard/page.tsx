"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Compass,
  Flame,
  Library,
  Send,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { TwinkleField } from "@/components/shared/twinkle-field";
import { aiClient, type Roadmap, type RoadmapStep, type StudentAIContext } from "@/lib/ai-client";
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";
import { gamificationClient, type GamificationSummary } from "@/lib/gamification-client";

const stepKindLabel: Record<RoadmapStep["kind"], string> = {
  course: "Course",
  test: "Test",
  practice: "Practice",
  revision: "Revision",
  milestone: "Milestone",
};

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [context, setContext] = useState<StudentAIContext | null>(null);
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [mentorQuery, setMentorQuery] = useState("");
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadDashboard() {
      setIsDashboardLoading(true);
      const [courseResult, contextResult, roadmapResult, gamificationResult] = await Promise.allSettled([
        learningClient.listCourses({ pageSize: 8, token: accessToken }),
        accessToken ? aiClient.getContext(accessToken) : Promise.resolve(null),
        accessToken ? aiClient.listRoadmaps(accessToken) : Promise.resolve([]),
        accessToken ? gamificationClient.getSummary(accessToken) : Promise.resolve(null),
      ]);

      if (cancelled) return;
      setCourses(courseResult.status === "fulfilled" ? courseResult.value.items : []);
      setContext(contextResult.status === "fulfilled" ? contextResult.value : null);
      setRoadmaps(roadmapResult.status === "fulfilled" ? roadmapResult.value : []);
      setGamification(gamificationResult.status === "fulfilled" ? gamificationResult.value : null);
      setIsDashboardLoading(false);
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  const dashboard = useMemo(() => {
    const activeCourses = courses.filter((course) => course.access?.has_access);
    const averageProgress = activeCourses.length
      ? Math.round(
          activeCourses.reduce(
            (total, course) => total + (course.access?.progress_percent ?? 0),
            0,
          ) / activeCourses.length,
        )
      : 0;
    const weeklyStudyHours = context?.weekly_study_hours ?? 8;

    const categoryProgress = new Map<string, { total: number; count: number }>();
    for (const course of activeCourses) {
      const categoryName = course.categories[0]?.name;
      if (!categoryName) continue;
      const entry = categoryProgress.get(categoryName) ?? { total: 0, count: 0 };
      entry.total += course.access?.progress_percent ?? 0;
      entry.count += 1;
      categoryProgress.set(categoryName, entry);
    }
    const skillBreakdown = [...categoryProgress.entries()]
      .map(([name, { total, count }]) => ({ name, progress: Math.round(total / count) }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);

    const latestRoadmap = roadmaps[0] ?? null;
    const nextMoves = (latestRoadmap?.plan.steps ?? [])
      .filter((step) => !step.completed)
      .sort((a, b) => a.week_start - b.week_start)
      .slice(0, 2);

    return {
      activeCourses,
      averageProgress,
      weeklyStudyHours,
      skillBreakdown,
      nextMoves,
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
  const progress = Math.round(dashboard.averageProgress);
  const yourCourses = (dashboard.activeCourses.length ? dashboard.activeCourses : courses).slice(0, 2);
  const earnedBadges = gamification?.badges.filter((badge) => badge.earned).slice(0, 4) ?? [];
  const promptChips = ["Calculate gear ratio", "Explain stress-strain curve", "Verify FEA mesh", "GD&T basics"];

  return (
    <AppShell>
      <div className="dark-system relative left-1/2 -my-6 min-h-screen w-screen -translate-x-1/2 overflow-hidden bg-[color:var(--background)] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="hero-aura relative -mx-4 overflow-hidden rounded-none px-4 py-14 text-center sm:-mx-6 sm:rounded-3xl sm:px-6 lg:-mx-8 lg:px-8">
            <TwinkleField />
            <div className="relative mx-auto max-w-3xl">
              <h1 className="text-4xl font-extrabold text-slate-950 md:text-5xl">
                Welcome back, {firstName}.
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
                Ready to continue your engineering journey today?
              </p>

              <form onSubmit={openMentor} className="mx-auto mt-8 max-w-2xl">
                <div className="relative rounded-full surface-secondary p-2 shadow-[var(--shadow-sm)]">
                  <input
                    value={mentorQuery}
                    onChange={(event) => setMentorQuery(event.target.value)}
                    placeholder="Ask GaugeHow anything about mechanical engineering..."
                    className="h-14 w-full rounded-full bg-transparent pl-6 pr-16 text-base text-slate-950 outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!mentorQuery.trim()}
                    className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-orange-400 text-slate-950 transition hover:bg-orange-300 disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send className="size-5" />
                  </button>
                </div>
              </form>

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Quick prompts
                </p>
                <div className="mx-auto mt-2 flex flex-wrap justify-center gap-2">
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
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-8">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-slate-950">Your Courses</h2>
                  <Link href="/courses" className="text-sm font-bold text-accent hover:underline">
                    View all
                  </Link>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {isDashboardLoading ? (
                    Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="browse-card p-3">
                        <Skeleton className="h-36 rounded-xl" />
                        <Skeleton className="mt-3 h-4 w-3/4 rounded" />
                        <Skeleton className="mt-2 h-3 w-1/2 rounded" />
                      </div>
                    ))
                  ) : yourCourses.length ? (
                    yourCourses.map((course) => {
                      const courseProgress = Math.round(course.access?.progress_percent ?? 0);
                      return (
                        <Link key={course.slug} href={`/courses/${course.slug}`} className="browse-card group p-3">
                          <div className="industrial-hero-media relative h-36 overflow-hidden rounded-xl">
                            {course.thumbnail_url ? (
                              <Image
                                src={course.thumbnail_url}
                                alt={course.title}
                                fill
                                unoptimized
                                sizes="(min-width: 640px) 24vw, 100vw"
                                className="object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#241a10]/75 via-transparent to-transparent" />
                          </div>
                          <div className="pt-3">
                            <h3 className="truncate font-bold text-slate-950 transition group-hover:text-accent">
                              {course.title}
                            </h3>
                            <p className="truncate text-xs text-slate-500">
                              {course.instructors[0]?.display_name ?? "GaugeHow Faculty"}
                            </p>
                            <div className="mt-3 space-y-1.5">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-bold text-slate-950">{courseProgress}% Complete</span>
                                <span className="text-slate-500">{course.lesson_count} lessons</span>
                              </div>
                              <Progress value={courseProgress} />
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <Link
                      href="/courses"
                      className="browse-card col-span-full flex flex-col items-center gap-2 p-8 text-center"
                    >
                      <Compass className="size-6 text-accent" />
                      <p className="font-bold text-slate-950">Enroll in your first course</p>
                      <p className="text-sm text-slate-500">Browse the catalog to get your dashboard rolling.</p>
                    </Link>
                  )}
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-extrabold text-slate-950">Recent Achievements</h2>
                {earnedBadges.length ? (
                  <div className="flex flex-wrap gap-6">
                    {earnedBadges.map((badge) => (
                      <div key={badge.code} className="flex w-20 flex-col items-center gap-2 text-center">
                        <span className="flex size-14 items-center justify-center rounded-full bg-accent/12 text-accent">
                          <Award className="size-6" />
                        </span>
                        <p className="truncate text-xs font-bold text-slate-950">{badge.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl surface-secondary p-4 text-sm text-slate-500">
                    Keep learning to unlock your first badge.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl surface-secondary p-5">
                <p className="text-sm font-extrabold text-slate-950">Weekly Progress</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Overall course progress</span>
                    <span className="font-bold text-slate-950">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[color:var(--card)] p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                      <BookOpen className="size-3.5" /> Active
                    </p>
                    <p className="mt-1 font-extrabold text-slate-950">{dashboard.activeCourses.length} courses</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--card)] p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                      <Flame className="size-3.5" /> Streak
                    </p>
                    <p className="mt-1 font-extrabold text-slate-950">
                      {gamification?.daily_check_in.streak_days ?? 0} days
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl surface-secondary p-5">
                <p className="text-sm font-extrabold text-slate-950">Next Moves</p>
                <div className="mt-3 space-y-3">
                  {dashboard.nextMoves.length ? (
                    dashboard.nextMoves.map((step) => (
                      <Link
                        key={step.id}
                        href={step.course_slug ? `/courses/${step.course_slug}` : "/roadmaps"}
                        className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-[color:var(--card)]"
                      >
                        <span className="mt-0.5 rounded-md bg-accent/12 px-2 py-1 text-[10px] font-bold uppercase text-accent">
                          {stepKindLabel[step.kind]}
                        </span>
                        <span className="min-w-0 text-sm font-semibold text-slate-950">{step.title}</span>
                      </Link>
                    ))
                  ) : (
                    <Link
                      href="/roadmaps"
                      className="flex items-center justify-between rounded-xl p-2 text-sm font-semibold text-accent hover:bg-[color:var(--card)]"
                    >
                      Build a study roadmap
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
              </div>

              {dashboard.skillBreakdown.length > 0 && (
                <div className="rounded-2xl surface-secondary p-5">
                  <p className="text-sm font-extrabold text-slate-950">Course Progress</p>
                  <div className="mt-3 space-y-3">
                    {dashboard.skillBreakdown.map((skill) => (
                      <div key={skill.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">{skill.name}</span>
                          <span className="font-bold text-slate-950">{skill.progress}%</span>
                        </div>
                        <Progress value={skill.progress} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href="/library"
                className="block rounded-2xl border border-[color:var(--primary)] bg-accent/8 p-5 transition hover:bg-accent/12"
              >
                <p className="flex items-center gap-2 text-sm font-extrabold text-accent">
                  <Library className="size-4" /> GaugeHow Library
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Handbooks and cheat sheets curated for your courses.
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent">
                  Open library <ArrowRight className="size-3.5" />
                </span>
              </Link>

              {!isDashboardLoading && dashboard.activeCourses.length === 0 && (
                <div className="flex items-start gap-2 rounded-2xl surface-secondary p-4 text-xs text-slate-500">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
                  Enroll in a course to start tracking real progress here.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
