"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Award, Filter, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { CourseCard } from "@/components/shared/course-card";
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

const defaultCategories = [
  { slug: "engineering", name: "Engineering" },
  { slug: "ai-data-science", name: "AI & Data Science" },
  { slug: "design", name: "Design & CAD" },
  { slug: "manufacturing", name: "Manufacturing" },
];

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
    const fromData = Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
    return fromData.length ? fromData : defaultCategories;
  }, [courses]);

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="surface-elevated overflow-hidden rounded-2xl">
          <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:p-8">
            <div>
              <Badge variant="orange">Real backend data</Badge>
              <h2 className="sr-only">Practical courses for engineering workflows.</h2>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-slate-950 md:text-5xl">
                Explore courses for engineering workflows
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Build practical skills in AI, CAD, mechanical design, programming, and applied
                engineering with courses from GaugeHow instructors.
              </p>
              <div className="mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="min-h-[3.25rem] rounded-lg pl-12"
                    placeholder="Search AutoCAD, MATLAB, CAD drafting, engineering programming"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <Button className="min-h-[3.25rem] rounded-lg px-6">
                  <Search />
                  Search
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-secondary)] p-5">
              <p className="text-sm font-bold text-slate-950">
                {isLoading ? "Loading catalog..." : `${courses.length} courses available`}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Filter by category, compare levels, and continue directly into enrolled courses.
              </p>
              <Button asChild variant="secondary" className="mt-5 w-full">
                <Link href="/courses/progress">
                  <Award />
                  Progress report
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 border-b border-[color:var(--border)] pb-4">
              <SlidersHorizontal className="size-5 text-orange-600" />
              <h2 className="font-bold text-slate-950">Filters</h2>
            </div>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={
                  activeCategory === "all"
                    ? "flex w-full items-center justify-between rounded-lg bg-orange-50 px-3 py-2 text-left text-sm font-bold text-orange-700"
                    : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-[color:var(--surface-secondary)]"
                }
              >
                All courses
                <Filter className="size-4" />
              </button>
              {categoryOptions.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setActiveCategory(category.slug)}
                  className={
                    activeCategory === category.slug
                      ? "flex w-full items-center justify-between rounded-lg bg-orange-50 px-3 py-2 text-left text-sm font-bold text-orange-700"
                      : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-[color:var(--surface-secondary)]"
                  }
                >
                  {category.name}
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Recommended courses</h2>
                <p className="text-sm text-slate-600">
                  {activeCategory === "all" ? "Showing all available courses" : "Filtered by selected category"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Beginner", "Intermediate", "Advanced"].map((level) => (
                  <span
                    key={level}
                    className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-3 py-1 text-xs font-bold text-slate-600"
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>

            {error ? (
              <Card>
                <CardContent className="p-5 text-sm font-medium text-rose-600">{error}</CardContent>
              </Card>
            ) : isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="grid gap-5 p-5 md:grid-cols-[15rem_1fr]">
                      <Skeleton className="h-44 rounded-lg" />
                      <div className="space-y-4">
                        <Skeleton className="h-5 w-24 rounded" />
                        <Skeleton className="h-8 w-4/5 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-2/3 rounded" />
                        <Skeleton className="h-11 w-36 rounded-lg" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : courses.length ? (
              <div className="space-y-4">
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
          </section>
        </div>
      </div>
    </AppShell>
  );
}
