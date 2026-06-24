import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Play, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { MotionPanel } from "@/components/shared/motion";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";

export default async function Home() {
  let courses: CourseCatalogItem[] = [];
  try {
    const catalog = await learningClient.listCourses({ pageSize: 3 });
    courses = catalog.items;
  } catch {
    courses = [];
  }

  return (
    <main className="premium-bg min-h-screen text-slate-950">
      <header className="chrome-surface sticky top-0 z-30 border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <a href="#courses">Courses</a>
            <a href="#platform">Platform</a>
            <Link href="/verify-certificate">Verify certificate</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Start learning</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-aura surface-grid relative overflow-hidden border-b border-slate-200">
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:py-20 lg:px-8">
          <MotionPanel className="flex flex-col justify-center">
            <Badge variant="orange">Backend-powered learning</Badge>
            <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-normal text-slate-950 md:text-6xl">
              Your Learning. Measured.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              GaugeHow now prioritizes real course catalog, course detail, enrollment,
              and lesson APIs. Mock-only modules stay hidden until their backends exist.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/courses">
                  Browse courses
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/verify-certificate">
                  <ShieldCheck />
                  Verify certificate
                </Link>
              </Button>
            </div>
          </MotionPanel>

          <MotionPanel delay={0.12} className="min-w-0">
            <div className="data-panel panel-depth ui-card p-3 soft-float">
              <div className="signal-line rounded-lg bg-slate-950 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Live catalog</p>
                    <p className="text-xl font-bold">{courses.length} featured courses</p>
                  </div>
                  <GraduationCap className="size-8 text-orange-300" />
                </div>
              </div>
              <div className="relative mt-3 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Continue with real content</h3>
                  <Play className="size-4 text-orange-500" />
                </div>
                <div className="mt-4 space-y-3">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <Link
                        key={course.slug}
                        href={`/courses/${course.slug}`}
                        className="panel-depth flex items-center gap-3 rounded-lg border border-slate-200 bg-white/60 p-3 transition hover:border-orange-200 hover:bg-orange-50"
                      >
                        <div className="size-2 rounded-full bg-orange-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{course.title}</p>
                          <p className="text-xs text-slate-500">{course.lesson_count} lessons</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Courses will appear here once the backend catalog is reachable.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </MotionPanel>
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <MotionPanel className="max-w-3xl">
          <Badge variant="dark">Live learning flow</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-normal md:text-4xl">
            Course pages are the production-ready path.
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            Catalog paging, course detail, enrollments, lesson playback, lazy transcripts,
            and discussions are wired to backend APIs.
          </p>
        </MotionPanel>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: GraduationCap, title: "Courses", text: "Cached public catalog and detail responses." },
            { icon: BookOpen, title: "Lessons", text: "Transcript and discussions load outside the critical path." },
            { icon: ShieldCheck, title: "Auth", text: "Authenticated overlays use real access data instead of fixtures." },
          ].map(({ icon: Icon, title, text }, index) => (
            <MotionPanel key={title} delay={index * 0.06}>
              <Card className="panel-depth">
                <CardContent className="p-6">
                  <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </CardContent>
              </Card>
            </MotionPanel>
          ))}
        </div>
      </section>

      <section id="platform" className="border-y border-slate-200 bg-slate-50">
        <MotionPanel className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Badge variant="orange">No fake modules</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-normal">
            Goals, notes, tests, roadmaps, community, and mentor pages now show empty backend-pending states.
          </h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            Those routes are preserved for architecture, but they no longer render mock records or fake progress.
          </p>
        </MotionPanel>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <BrandLogo />
          <p className="text-sm text-slate-500">
            GaugeHow learning workspace with backend-powered course delivery.
          </p>
        </div>
      </footer>
    </main>
  );
}
