"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, CalendarDays, CheckCircle2, Clock, Play, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { AiStrip } from "@/components/shared/ai-strip";
import { CourseCard } from "@/components/shared/course-card";
import { MetricCard } from "@/components/shared/metric-card";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";
import { dashboardStats, goals, student, tasks } from "@/lib/mock-data";

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const response = await learningClient.listCourses({
          countryCode: "IN",
          token: accessToken,
        });
        if (!cancelled) {
          setCourses(response.items.slice(0, 2));
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
        }
      }
    }

    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Badge variant="orange">Today&apos;s focus</Badge>
                <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">
                  Welcome back, {(user?.display_name ?? student.name).split(" ")[0]}
                </h1>
                <p className="mt-2 max-w-2xl leading-7 text-slate-600">
                  Your AI plan prioritizes graph traversal practice, DBMS revision,
                  and one short test to keep the Placement Goal moving.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/courses">
                      <Play />
                      Browse courses
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/goals/placement-goal">
                      <Sparkles />
                      AI suggestions
                    </Link>
                  </Button>
                </div>
              </div>
              <ProgressRing value={student.goalCompletion} label="Goal" size="lg" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Discipline score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Level {student.level}</span>
                <span className="text-sm font-semibold text-slate-950">
                  {student.xp.toLocaleString()} XP
                </span>
              </div>
              <Progress value={(student.xp / student.nextLevelXp) * 100} />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="text-2xl font-bold text-orange-700">{student.streak}</p>
                  <p className="text-xs font-semibold text-orange-700">day streak</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-2xl font-bold text-emerald-700">7/9</p>
                  <p className="text-xs font-semibold text-emerald-700">tasks done</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </section>

        <AiStrip />

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-slate-950">
                Current courses
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/courses">View all</Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {courses.length ? (
                courses.map((course) => <CourseCard key={course.slug} course={course} />)
              ) : (
                <Card className="md:col-span-2">
                  <CardContent className="p-5 text-sm text-slate-600">
                    No live courses are available yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.title}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <CheckCircle2 className="size-5 text-emerald-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {task.title}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="size-3" />
                        {task.time} · {task.tag} · {task.xp} XP
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { label: "New goal", href: "/goals", icon: Plus },
                  { label: "Ask AI", href: "/mentor", icon: Bot },
                  { label: "Plan week", href: "/mentor", icon: CalendarDays },
                  { label: "Practice test", href: "/tests", icon: CheckCircle2 },
                ].map(({ label, href, icon: Icon }) => (
                  <Button key={label} asChild variant="secondary">
                    <Link href={href}>
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {goals.slice(0, 3).map((goal) => (
            <Card key={goal.slug}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <goal.icon className="size-5 text-orange-500" />
                  <span className="text-sm font-bold text-slate-950">{goal.progress}%</span>
                </div>
                <h3 className="mt-4 font-bold text-slate-950">{goal.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {goal.description}
                </p>
                <Progress value={goal.progress} className="mt-4" />
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
