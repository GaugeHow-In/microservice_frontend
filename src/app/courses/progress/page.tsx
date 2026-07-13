"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Clock, Ticket } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMinutes,
  learningClient,
  type CourseCatalogItem,
} from "@/lib/learning-client";

export default function CourseProgressPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadCourses() {
      setLoading(true);
      try {
        const response = await learningClient.listCourses({
          token: accessToken,
        });
        if (!cancelled) {
          setCourses(response.items.filter((item) => item.access?.has_access));
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load progress.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  const stats = useMemo(() => {
    const enrolled = courses.length;
    const averageProgress = enrolled
      ? Math.round(
          courses.reduce((total, course) => total + (course.access?.progress_percent ?? 0), 0) /
            enrolled,
        )
      : 0;
    const activeAccess = courses.filter((item) => item.access?.has_access).length;
    const totalMinutes = Math.round(
      courses.reduce((sum, course) => {
        const progressFraction = (course.access?.progress_percent ?? 0) / 100;
        return sum + (course.duration_minutes ?? 0) * progressFraction;
      }, 0),
    );
    return { enrolled, averageProgress, activeAccess, totalMinutes };
  }, [courses]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Course progress"
          title="Progress, access, and course completion."
          description="This report only reflects implemented backend tracking: enrollments, access state, and course-level completion percent."
        />

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Enrolled courses", value: String(stats.enrolled), icon: Ticket },
            { label: "Average progress", value: `${stats.averageProgress}%`, icon: CheckCircle2 },
            { label: "Active access", value: String(stats.activeAccess), icon: Award },
            { label: "Approx. time learned", value: formatMinutes(stats.totalMinutes), icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
                </div>
                <Icon className="size-6 text-orange-500" />
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Course completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="surface-secondary rounded-xl p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-6 w-2/3 rounded-md" />
                        <Skeleton className="h-4 w-1/2 rounded-md" />
                      </div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <Skeleton className="mt-4 h-2.5 rounded-full" />
                  </div>
                ))}
              </div>
            ) : courses.length ? (
              courses.map((course) => (
                <div key={course.slug} className="rounded-lg surface-secondary p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-bold text-slate-950">{course.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.lesson_count} lessons · {formatMinutes(course.duration_minutes)} ·{" "}
                        {course.level.replaceAll("_", " ")}
                      </p>
                    </div>
                    <Badge variant={course.access?.is_lifetime_access ? "green" : "blue"}>
                      {course.access?.is_lifetime_access
                        ? "Lifetime"
                        : course.access?.days_left
                          ? `${course.access.days_left} days left`
                          : "Active"}
                    </Badge>
                  </div>
                  <Progress value={course.access?.progress_percent ?? 0} className="mt-4" />
                  <div className="mt-4 flex justify-end">
                    <div className="flex gap-2">
                      {course.certificate_enabled && (course.access?.progress_percent ?? 0) >= 100 ? (
                        <Button asChild size="sm">
                          <Link href={`/courses/${course.slug}/certificate`}>Certificate</Link>
                        </Button>
                      ) : null}
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/courses/${course.slug}`}>Review</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                You do not have any active course enrollments yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
