"use client";

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
  Sparkles,
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
      <div className="dark-system space-y-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-[#f8fafc] md:text-5xl">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-2 text-lg text-[#94a3b8]">
              You&apos;ve completed {progress}% of your weekly engineering goal.
            </p>
          </div>
          <div className="glass-card flex w-fit items-center gap-2 rounded-full px-4 py-3">
            <Flame className="size-5 text-[#f59e0b]" />
            <span className="text-sm font-bold text-[#ffb77d]">24 Day Streak</span>
          </div>
        </header>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-[#f8fafc]">
            <Play className="size-6 text-[#f59e0b]" />
            Continue Learning
          </h2>
          <div className="glass-card grid overflow-hidden rounded-xl md:grid-cols-2">
            <div className="course-visual relative min-h-64 overflow-hidden">
              <div className="absolute inset-0 surface-grid opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                <span className="flex size-20 items-center justify-center rounded-full bg-[#f59e0b] text-[#2f1500] shadow-[0_0_32px_rgba(245,158,11,0.45)]">
                  <Play className="size-10 fill-current" />
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center p-6 md:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1 text-xs font-bold uppercase text-[#ffb77d]">
                  Module 4: Variables
                </span>
                <span className="text-sm text-[#94a3b8]">
                  {dashboard.nextSessionMinutes} mins remaining
                </span>
              </div>
              <h3 className="text-3xl font-bold text-[#f8fafc]">
                {currentCourse?.title ?? "Advanced Figma Prototyping"}
              </h3>
              <p className="mt-3 line-clamp-2 text-[#94a3b8]">
                {currentCourse?.short_description ??
                  "Master conditional logic, component sets, and advanced micro-interactions for engineering dashboards."}
              </p>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-[#f8fafc]">{progress}% Complete</span>
                  <span className="text-[#94a3b8]">{currentCourse?.lesson_count ?? 14} lessons</span>
                </div>
                <Progress value={progress} />
              </div>
              <Button asChild className="mt-6 w-fit">
                <Link href={currentCourse ? `/courses/${currentCourse.slug}` : "/courses"}>
                  Resume module
                  <Play />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl">
          <div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
            <div className="absolute -right-24 -top-24 size-64 rounded-full bg-[#f59e0b]/10 blur-3xl" />
            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffb77d] to-[#f59e0b] text-[#2f1500] shadow-lg shadow-[#d97706]/20">
                  <Sparkles className="size-6" />
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-[#f8fafc]">Engineering Copilot</h2>
                  <p className="text-sm text-[#94a3b8]">Ask anything about your courses or technical queries.</p>
                </div>
              </div>
              <div className="mb-4 min-h-28 rounded-xl border border-white/5 bg-[#151b2d]/70 p-4">
                <div className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/20 text-[#ffb77d]">
                    <Bot className="size-4" />
                  </span>
                  <div className="max-w-[80%] rounded-br-xl rounded-tl-none rounded-tr-xl rounded-bl-xl bg-[#2e3447] p-3 text-sm text-[#dce1fb]">
                    Hello {firstName}. I see you&apos;re focused on {dashboard.focusArea}. Would you like a quick
                    explanation or a practice plan?
                  </div>
                </div>
              </div>
              <form onSubmit={openMentor} className="relative">
                <input
                  value={mentorQuery}
                  onChange={(event) => setMentorQuery(event.target.value)}
                  placeholder="Type your engineering query here..."
                  className="min-h-14 w-full rounded-xl border border-white/10 bg-[#020617]/45 py-4 pl-5 pr-16 text-[#f8fafc] outline-none transition focus:border-[#f59e0b]"
                />
                <button
                  type="submit"
                  disabled={!mentorQuery.trim()}
                  className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-lg bg-[#f59e0b] text-[#2f1500] disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </button>
              </form>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {promptChips.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMentorQuery(prompt)}
                    className="glass-card whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold text-[#dce1fb] transition hover:text-[#ffb77d]"
                  >
                    &quot;{prompt}&quot;
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#f8fafc]">Recommended for You</h2>
            <Link href="/courses" className="text-sm font-bold text-[#ffb77d] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {isDashboardLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="glass-card rounded-xl p-4">
                    <Skeleton className="h-36 rounded-lg" />
                    <Skeleton className="mt-4 h-5 w-3/4 rounded" />
                    <Skeleton className="mt-3 h-10 rounded" />
                  </div>
                ))
              : recommendations.map((course, index) => (
                  <article key={course.slug} className="glass-card overflow-hidden rounded-xl">
                    <div className="course-visual relative h-40">
                      <div className="absolute inset-0 surface-grid opacity-20" />
                      <span className="absolute right-3 top-3 rounded bg-[#020617]/80 px-2 py-1 text-[10px] font-bold text-[#ffb77d]">
                        {index === 0 ? "ADVANCED" : index === 1 ? "INTERMEDIATE" : "BEGINNER"}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[#f8fafc] transition hover:text-[#ffb77d]">
                        {course.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-2 text-xs text-[#94a3b8]">
                        <span>{formatMinutes(course.duration_minutes)}</span>
                        <span className="size-1 rounded-full bg-[#94a3b8]" />
                        <span className="flex items-center gap-1">
                          <Star className="size-3" />
                          {course.average_rating.toFixed(1)}
                        </span>
                      </div>
                      <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                        <Link href={`/courses/${course.slug}`}>Enroll Now</Link>
                      </Button>
                    </div>
                  </article>
                ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-[#f8fafc]">Your Certifications</h2>
            <div className="space-y-3">
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
              ].map(({ title, detail, icon: LucideIcon }) => {
                return (
                  <div key={String(title)} className="glass-card flex items-center justify-between rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <span className="flex size-12 items-center justify-center rounded-lg bg-[#f59e0b]/20 text-[#ffb77d]">
                        <LucideIcon className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-[#f8fafc]">{title}</h3>
                        <p className="text-xs text-[#94a3b8]">{detail}</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">Download PDF</Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-xl p-5">
            <h2 className="text-2xl font-bold text-[#f8fafc]">This Week</h2>
            <div className="mt-5 space-y-4">
              {[
                { label: "Focus area", value: dashboard.focusArea, icon: BookOpen },
                { label: "Primary goal", value: dashboard.primaryGoal, icon: ClipboardCheck },
                { label: "Study rhythm", value: `${dashboard.weeklyStudyHours} hours planned`, icon: Flame },
              ].map(({ label, value, icon: LucideIcon }) => {
                return (
                  <div key={String(label)} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <LucideIcon className="size-5 text-[#ffb77d]" />
                      <p className="text-xs font-bold uppercase text-[#94a3b8]">{label}</p>
                    </div>
                    <p className="mt-2 font-bold text-[#f8fafc]">{value}</p>
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
