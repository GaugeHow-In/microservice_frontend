"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Award, Bell, Search } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { CourseCard } from "@/components/shared/course-card";
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
  { slug: "design", name: "Design" },
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
      <div className="light-system rounded-2xl border border-black/5 p-4 shadow-[0_24px_80px_-54px_rgba(0,0,0,0.65)] sm:p-6">
        <header className="mb-6 flex items-center justify-between border-b border-black/5 pb-5">
          <div>
            <p className="text-sm font-extrabold text-orange-700">GaugeHow</p>
            <p className="text-xs font-semibold text-slate-500">Engineering Course Catalog</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 sm:inline-flex">
              Real backend data
            </span>
            <Button asChild variant="secondary" size="sm">
              <Link href="/courses/progress">
                <Award />
                Progress report
              </Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
          </div>
        </header>

        <section className="mx-auto flex max-w-3xl flex-col items-center py-12 text-center">
          <h2 className="sr-only">Practical courses for engineering workflows.</h2>
          <h1 className="text-5xl font-extrabold leading-tight text-slate-950">Explore Courses</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Master the intricacies of modern engineering with professional-grade technical courses
            designed by industry experts.
          </p>
          <div className="relative mt-8 w-full">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
            <Input
              className="min-h-14 rounded-xl border-slate-300 bg-white pl-12 pr-28"
              placeholder="Search AutoCAD, MATLAB, CAD drafting, engineering programming"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button className="absolute right-2 top-1/2 min-h-10 -translate-y-1/2 rounded-lg px-5">
              Search
            </Button>
          </div>
        </section>

        <section className="mb-12 flex items-center justify-center gap-3 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={
              activeCategory === "all"
                ? "rounded-full bg-orange-600 px-6 py-2 text-sm font-bold text-white"
                : "rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-bold text-slate-600 transition hover:bg-[#f6f3f2]"
            }
          >
            All
          </button>
          {categoryOptions.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
              className={
                activeCategory === category.slug
                  ? "rounded-full bg-orange-600 px-6 py-2 text-sm font-bold text-white"
                  : "rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-bold text-slate-600 transition hover:bg-[#f6f3f2]"
              }
            >
              {category.name}
            </button>
          ))}
        </section>

        {error ? (
          <Card>
            <CardContent className="p-5 text-sm font-medium text-rose-600">{error}</CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <Skeleton className="aspect-video rounded-none" />
                <CardContent className="space-y-4 p-5">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-7 w-4/5 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-12 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </AppShell>
  );
}
