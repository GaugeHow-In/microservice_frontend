"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CaretLeft, CaretRight, ChartLineUp, MagnifyingGlass } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { CourseCard } from "@/components/shared/course-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  learningCache,
  learningClient,
  type CourseCatalogItem,
} from "@/lib/learning-client";

const defaultCategories = [
  { slug: "design-cad", name: "Design & CAD" },
  { slug: "simulation-cae", name: "Simulation & CAE" },
  { slug: "industry-4-iiot", name: "Industry 4.0 & IIoT" },
  { slug: "programming-engineers", name: "Programming for Engineers" },
  { slug: "manufacturing-quality-metrology", name: "Manufacturing Quality & Metrology" },
  { slug: "electric-vehicles", name: "Electric Vehicles" },
  { slug: "engineering", name: "Engineering" },
];

const PAGE_SIZE = 12;

export default function CoursesPage() {
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, activeCategory]);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;
    const request = {
      query: deferredQuery.trim() || undefined,
      categories: activeCategory === "all" ? [] : [activeCategory],
      page,
      pageSize: PAGE_SIZE,
      token: accessToken,
      viewerKey: user?.id ?? null,
    };
    const cached = learningCache.getCourseList(request);

    if (cached) {
      setCourses(cached.items);
      setTotal(cached.total);
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
          setTotal(response.total);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load courses.");
          setCourses([]);
          setTotal(0);
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
  }, [accessToken, activeCategory, deferredQuery, isAuthLoading, page, user?.id]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>(
      defaultCategories.map((category) => [category.slug, category.name]),
    );
    for (const course of courses) {
      for (const category of course.categories) {
        map.set(category.slug, category.name);
      }
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [courses]);

  return (
    <AppShell>
      <div className="space-y-10">
        <section className="pt-2">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="sr-only">Practical courses for engineering workflows.</h2>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-950 md:text-4xl">
              Master the mechanics of tomorrow
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Hands-on courses in CAD, simulation, programming, and Industry 4.0 — skills engineers actually use.
            </p>
            <div className="relative mx-auto mt-6 max-w-2xl">
              <MagnifyingGlass className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
              <Input
                className="min-h-[3.25rem] rounded-full surface-secondary pl-12 pr-5"
                placeholder="Search AutoCAD, MATLAB, CAD drafting, engineering programming"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="sticky top-16 z-20 -mx-4 bg-[color:var(--surface-chrome)] px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="relative mx-auto max-w-7xl">
              <div className="scrollbar-none flex snap-x items-center gap-1.5 overflow-x-auto py-0.5 pr-8">
                {[{ slug: "all", name: "All" }, ...categoryOptions].map((category) => {
                  const isActive = activeCategory === category.slug;
                  return (
                    <button
                      key={category.slug}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveCategory(category.slug)}
                      className={`snap-start shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-all ${
                        isActive
                          ? "bg-orange-500 font-bold text-white shadow-md shadow-orange-500/25"
                          : "font-medium text-slate-600 hover:bg-[color:var(--surface-secondary)] hover:text-slate-950"
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[color:var(--surface-chrome)] to-transparent"
              />
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950 md:text-2xl">
                  {isLoading ? "Loading catalog" : `${total} course${total === 1 ? "" : "s"} to build with`}
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  {activeCategory === "all"
                    ? "The full catalog — pick a track and start building"
                    : categoryOptions.find((category) => category.slug === activeCategory)?.name ?? "Filtered by category"}
                </p>
              </div>
              <Link
                href="/courses/progress"
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-full surface-secondary px-4 py-2.5 text-sm font-bold text-orange-600 transition hover:text-orange-700 sm:self-auto"
              >
                <ChartLineUp className="size-4" weight="bold" />
                Progress report
              </Link>
            </div>

            {error ? (
              <p className="p-5 text-sm font-medium text-rose-600">{error}</p>
            ) : isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="course-card flex flex-col">
                    <Skeleton className="aspect-[16/9] w-full rounded-none" />
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-5 w-4/5 rounded" />
                      <Skeleton className="h-3 w-1/3 rounded" />
                      <Skeleton className="h-4 w-2/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length ? (
              <>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {courses.map((course) => (
                    <CourseCard key={course.slug} course={course} />
                  ))}
                </div>
                {totalPages > 1 ? (
                  <nav
                    aria-label="Course pages"
                    className="flex items-center justify-center gap-2 pt-4"
                  >
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1}
                      className="inline-flex items-center gap-1 rounded-full surface-secondary px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CaretLeft className="size-4" weight="bold" />
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter(
                        (pageNumber) =>
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          Math.abs(pageNumber - page) <= 1,
                      )
                      .map((pageNumber, index, visible) => (
                        <span key={pageNumber} className="flex items-center gap-2">
                          {index > 0 && visible[index - 1] !== pageNumber - 1 ? (
                            <span className="text-sm text-slate-400">…</span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setPage(pageNumber)}
                            aria-current={pageNumber === page ? "page" : undefined}
                            className={
                              pageNumber === page
                                ? "min-w-10 rounded-full bg-orange-500 px-3 py-2 text-sm font-bold text-white"
                                : "min-w-10 rounded-full surface-secondary px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                            }
                          >
                            {pageNumber}
                          </button>
                        </span>
                      ))}
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page >= totalPages}
                      className="inline-flex items-center gap-1 rounded-full surface-secondary px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <CaretRight className="size-4" weight="bold" />
                    </button>
                  </nav>
                ) : null}
              </>
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
