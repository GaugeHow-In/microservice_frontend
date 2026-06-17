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
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";

export default function CoursesPage() {
  const { accessToken } = useAuth();
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await learningClient.listCourses({
          query: deferredQuery.trim() || undefined,
          categories: activeCategory === "all" ? [] : [activeCategory],
          countryCode: "IN",
          token: accessToken,
        });
        if (!cancelled) {
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
  }, [accessToken, activeCategory, deferredQuery]);

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

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
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

        <Card className="border-slate-200 bg-slate-950 text-white">
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
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="h-80 animate-pulse border-slate-200 bg-white" />
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
