"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Award, Search } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { AiStrip } from "@/components/shared/ai-strip";
import { CourseCard } from "@/components/shared/course-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  learningCache,
  learningClient,
  type CourseCatalogItem,
} from "@/lib/learning-client";

export default function CoursesPage() {
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;
    const request = {
      query: deferredQuery.trim() || undefined,
      categories: activeCategory === "all" ? [] : [activeCategory],
      token: accessToken,
      viewerKey: user?.id ?? null,
    };
    const cached = learningCache.getCourseList(request);

    if (cached) {
      setCourses(cached.items);
      setError(null);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadCourses() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await learningClient.listCourses(request);
        if (!cancelled) {
          learningCache.setCourseList(response, request);
          setCourses(response.items);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load courses.");
          setCourses([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeCategory, deferredQuery, isAuthLoading, user?.id]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of courses) {
      for (const category of course.categories) {
        map.set(category.slug, category.name);
      }
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [courses]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Courses"
          title="Practical courses for engineering workflows."
          description="Search by course name, filter by category, compare access status, and continue only where the backend already supports real course flow."
          action={
            <Button asChild variant="secondary">
              <Link href="/courses/progress">
                <Award />
                Progress report
              </Link>
            </Button>
          }
        />

        <div className="surface-elevated reveal-delay-1 reveal-up grid gap-3 rounded-2xl p-4 shadow-[var(--shadow-sm)] md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search AutoCAD, MATLAB, CAD drafting, engineering programming"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "secondary"}
              onClick={() => setActiveCategory("all")}
            >
              All
            </Button>
            {categoryOptions.map((category) => (
              <Button
                key={category.slug}
                variant={activeCategory === category.slug ? "default" : "secondary"}
                onClick={() => setActiveCategory(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        <Card className="signal-line panel-depth reveal-delay-2 reveal-up border-slate-200 bg-slate-950 text-white">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-orange-300">
                Catalog status
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {isLoading ? "Loading courses..." : `${courses.length} courses ready`}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="orange">Real backend data</Badge>
              <Badge variant="dark">No course mock state</Badge>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card>
            <CardContent className="p-5 text-sm font-medium text-rose-600">{error}</CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-7 w-4/5 rounded-md" />
                        <Skeleton className="h-4 w-1/2 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-4 w-4/5 rounded-md" />
                    </div>
                    <Skeleton className="size-12 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-5 rounded-md" />
                    <Skeleton className="h-5 rounded-md" />
                    <Skeleton className="h-5 rounded-md" />
                  </div>
                  <Skeleton className="h-24 rounded-xl" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-11 rounded-lg" />
                    <Skeleton className="h-11 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-slate-600">
              No courses match the current search or category filter.
            </CardContent>
          </Card>
        )}

        <AiStrip
          title="AI support in lessons"
          description="The current course flow supports generated lesson notes and flashcards from transcript-backed lessons."
          cta="Open AI mentor"
        />
      </div>
    </AppShell>
  );
}
