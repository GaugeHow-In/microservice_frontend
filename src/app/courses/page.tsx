"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { CourseCard } from "@/components/shared/course-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-10">
        <section className="pt-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="orange"></Badge>
            <h2 className="sr-only">Practical courses for engineering workflows.</h2>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-slate-950 md:text-6xl">
              Explore courses for engineering workflows
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Build practical skills in AI, CAD, mechanical design, programming, and applied
              engineering with courses from GaugeHow instructors.
            </p>
            <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                <Input
                  className="min-h-[3.5rem] rounded-full surface-secondary pl-12"
                  placeholder="Search AutoCAD, MATLAB, CAD drafting, engineering programming"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button className="min-h-[3.5rem] rounded-full px-7">
                <Search />
                Search
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="sticky top-16 z-20 -mx-4 bg-[color:var(--surface-chrome)] px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={
                  activeCategory === "all"
                    ? "shrink-0 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white"
                    : "shrink-0 rounded-full surface-secondary px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                }
              >
                All courses
              </button>
              {categoryOptions.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setActiveCategory(category.slug)}
                  className={
                    activeCategory === category.slug
                      ? "shrink-0 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white"
                      : "shrink-0 rounded-full surface-secondary px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                  }
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">
                  {isLoading ? "Loading catalog" : `${courses.length} recommended courses`}
                </h2>
                <p className="text-sm text-slate-600">
                  {activeCategory === "all" ? "Showing all available courses" : "Filtered by selected category"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/courses/progress"
                  className="rounded-full surface-secondary px-3 py-1 text-xs font-bold text-orange-600 transition hover:text-orange-700"
                >
                  Progress report
                </Link>
                {["Beginner", "Intermediate", "Advanced"].map((level) => (
                  <span
                    key={level}
                    className="rounded-full surface-elevated px-3 py-1 text-xs font-bold text-slate-600"
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>

            {error ? (
              <p className="p-5 text-sm font-medium text-rose-600">{error}</p>
            ) : isLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="browse-card grid gap-5 p-5 md:grid-cols-[17rem_minmax(0,1fr)]">
                    <Skeleton className="h-48 rounded-xl" />
                    <div className="space-y-4 py-1">
                      <Skeleton className="h-5 w-24 rounded" />
                      <Skeleton className="h-8 w-4/5 rounded" />
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-2/3 rounded" />
                      <Skeleton className="h-11 w-36 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length ? (
              <div className="space-y-5">
                {courses.map((course) => (
                  <CourseCard key={course.slug} course={course} />
                ))}
              </div>
            ) : (
              <p className="p-5 text-sm text-slate-600">
                No courses match the current search or category filter.
              </p>
            )}
          </section>
        </section>
      </div>
    </AppShell>
  );
}
