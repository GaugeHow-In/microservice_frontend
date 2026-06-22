"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, ListChecks, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CourseCard } from "@/components/shared/course-card";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";

export default function DashboardPage() {
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadCourses() {
      setIsLoading(true);
      try {
        const response = await learningClient.listCourses({
          pageSize: 6,
          token: accessToken,
        });
        if (!cancelled) setCourses(response.items);
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  const stats = useMemo(() => {
    const enrolled = courses.filter((course) => course.access?.has_access).length;
    const lessonCount = courses.reduce((total, course) => total + course.lesson_count, 0);
    const reviewCount = courses.reduce((total, course) => total + course.total_reviews, 0);
    return [
      { label: "Live courses", value: String(courses.length), change: "Backend", icon: GraduationCap, tone: "orange" as const },
      { label: "Enrolled", value: String(enrolled), change: "Your access", icon: BookOpen, tone: "green" as const },
      { label: "Lessons", value: String(lessonCount), change: "Published", icon: ListChecks, tone: "blue" as const },
      { label: "Reviews", value: String(reviewCount), change: "Visible", icon: Star, tone: "rose" as const },
    ];
  }, [courses]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome back, ${(user?.display_name ?? "learner").split(" ")[0]}`}
          description="This dashboard now uses live learning APIs only. Mock goals, tasks, streaks, and XP widgets have been removed until those backend modules are connected."
          action={
            <Button asChild>
              <Link href="/courses">
                <GraduationCap />
                Browse courses
              </Link>
            </Button>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </section>

        <section className="surface-elevated reveal-delay-1 reveal-up rounded-2xl p-4 shadow-[var(--shadow-sm)] sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="type-caption font-semibold uppercase text-orange-500">Live workspace</p>
                <h2 className="mt-1 type-h3 text-slate-950">Current courses</h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/courses">View all</Link>
              </Button>
            </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
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
            ) : courses.length ? (
              courses.map((course) => <CourseCard key={course.slug} course={course} />)
            ) : (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="p-6 type-body text-slate-600">
                  No live courses are available from the backend yet.
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
