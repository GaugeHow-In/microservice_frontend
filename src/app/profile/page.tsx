"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, GraduationCap, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";

export default function ProfilePage() {
  const { user, accessToken, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const displayName = user?.display_name ?? "GaugeHow learner";
  const subtitle = user?.email ?? "Authenticated profile";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadCourses() {
      setIsCoursesLoading(true);
      try {
        const response = await learningClient.listCourses({
          token: accessToken,
        });
        if (!cancelled) {
          setCourses(response.items.filter((item) => item.access?.has_access));
        }
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setIsCoursesLoading(false);
      }
    }

    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Profile"
          title="Your learning profile."
          description="Manage how your learning identity appears across GaugeHow and open the public profile you can share with peers."
          action={
            <div className="flex flex-wrap gap-2">
              {user?.handle && (
                <Button asChild variant="default">
                  <Link href={`/profiles/${user.handle}`}>
                    <ExternalLink />
                    Public profile
                  </Link>
                </Button>
              )}
              <Button variant="secondary">
                <Settings />
                Preferences
              </Button>
            </div>
          }
        />
        <Card className="panel-depth reveal-delay-1 reveal-up overflow-hidden">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <Avatar className="size-20">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="type-h2 text-slate-950">{displayName}</h1>
              <p className="mt-1 text-slate-500">{subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(user?.roles.length ? user.roles : ["member"]).map((role) => (
                  <Badge key={role} variant="orange">{role}</Badge>
                ))}
              </div>
            </div>
            <div className="signal-line rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center shadow-[var(--shadow-sm)]">
              <p className="type-h2 text-slate-950">{courses.length}</p>
              <p className="type-caption text-slate-500">enrolled courses</p>
            </div>
          </CardContent>
        </Card>

        <Card className="panel-depth reveal-delay-2 reveal-up">
          <CardHeader>
            <CardTitle>Learning history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCoursesLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-5 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4 rounded-md" />
                      <Skeleton className="h-2.5 w-full rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : courses.length ? (
              courses.map((course) => (
                <div key={course.slug} className="panel-depth rounded-lg border border-slate-200 bg-white/55 p-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="size-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-950">{course.title}</p>
                      <Progress value={course.access?.progress_percent ?? 0} className="mt-2" />
                    </div>
                    <Badge variant="green">
                      <GraduationCap className="size-3" />
                      Active
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="type-small text-slate-500">No enrolled courses yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
