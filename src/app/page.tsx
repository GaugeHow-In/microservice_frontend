import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  NotebookText,
  Play,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { MotionPanel } from "@/components/shared/motion";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { learningClient, type CourseCatalogItem } from "@/lib/learning-client";
import { dashboardStats, mentorPrompts, sampleJourney } from "@/lib/mock-data";

export default async function Home() {
  let courses: CourseCatalogItem[] = [];
  try {
    const catalog = await learningClient.listCourses({ countryCode: "IN", pageSize: 3 });
    courses = catalog.items;
  } catch {
    courses = [];
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features">Features</a>
            <a href="#ai">AI Mentor</a>
            <a href="#stories">Stories</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Start learning</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="surface-grid relative overflow-hidden border-b border-slate-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:py-20 lg:px-8">
          <MotionPanel className="flex flex-col justify-center">
            <Badge variant="orange">AI-powered learning operating system</Badge>
            <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-normal text-slate-950 md:text-6xl">
              Your Learning. Measured.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              GaugeHow helps students learn, track discipline, follow roadmaps,
              practice tests, read notes, and get AI support without the weight
              of a traditional LMS.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/mentor">
                  <Sparkles />
                  Ask AI Mentor
                </Link>
              </Button>
            </div>
          </MotionPanel>

          <MotionPanel delay={0.12} className="min-w-0">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/10">
              <div className="rounded-lg bg-slate-950 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Today</p>
                    <p className="text-xl font-bold">Placement sprint</p>
                  </div>
                  <ProgressRing value={72} size="sm" className="text-slate-950" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {dashboardStats.slice(0, 3).map((stat) => (
                    <div key={stat.label} className="rounded-lg bg-white/10 p-3">
                      <stat.icon className="mb-3 size-4 text-orange-300" />
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-slate-300">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.75fr]">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Continue learning</h3>
                    <Play className="size-4 text-orange-500" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {courses.length > 0 ? (
                      courses.slice(0, 3).map((course) => {
                        const progress = course.access?.progress_percent ?? 0;
                        return (
                          <div key={course.slug} className="flex items-center gap-3">
                            <div className="size-2 rounded-full bg-orange-500" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{course.title}</p>
                              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-orange-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                              {progress}%
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">
                        Courses will appear here once the backend catalog is reachable.
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <Bot className="size-5 text-orange-600" />
                  <h3 className="mt-3 font-semibold">AI study plan</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Revise graph BFS, read DBMS notes, and take one 25-minute quiz today.
                  </p>
                </div>
              </div>
            </div>
          </MotionPanel>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["42k+", "study sessions measured"],
            ["91%", "weekly goal visibility"],
            ["12.4k", "XP average earned"],
            ["4.8/5", "student confidence"],
          ].map(([value, label]) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-3xl font-bold text-slate-950">{value}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="features" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="dark">Built for student momentum</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-normal md:text-4xl">
              Learn, practice, read, and improve from one focused workspace.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: Target, title: "Goal system", text: "Placement, GATE, semester, DSA, AI/ML, and custom goals with milestones." },
              { icon: GraduationCap, title: "Modern LMS", text: "Courses, video lessons, notes, attachments, discussions, and certificates." },
              { icon: NotebookText, title: "Notes platform", text: "Searchable notes with highlights, bookmarks, and reading progress." },
              { icon: BookOpen, title: "Digital library", text: "Books, filters, categories, details, and progress tracking." },
              { icon: BarChart3, title: "Tests and analytics", text: "Accuracy, topic analysis, results, and performance trends." },
              { icon: Trophy, title: "Gamification", text: "XP, streaks, badges, achievements, and milestone cards." },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent className="p-6">
                  <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[0.8fr_1fr] lg:px-8">
        <div>
          <Badge variant="orange">AI visible everywhere</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-normal md:text-4xl">
            A mentor that turns confusion into the next action.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Ask for concept explanations, generated notes, chapter summaries,
            course recommendations, goal recommendations, and study planning.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-5">
            {mentorPrompts.map((prompt) => (
              <div key={prompt} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <Sparkles className="size-4 text-orange-500" />
                <p className="text-sm font-medium text-slate-700">{prompt}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="stories" className="border-y border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "GaugeHow made my placement prep visible for the first time.",
              "The AI mentor helped me convert weak GATE topics into daily drills.",
              "Notes, tests, and course progress finally feel connected.",
            ].map((quote, index) => (
              <div key={quote} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex gap-1 text-orange-300">
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star key={star} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="leading-7 text-slate-200">&quot;{quote}&quot;</p>
                <p className="mt-4 text-sm font-semibold text-white">
                  Student reviewer {index + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_0.8fr] lg:px-8">
        <div>
          <Badge variant="green">Sample student journey</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-normal">
            Designed for retention and clarity.
          </h2>
          <div className="mt-8 space-y-4">
            {sampleJourney.map((step) => (
              <div key={step} className="flex gap-3">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-emerald-500" />
                <p className="leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Flame className="size-8 text-orange-500" />
            <h3 className="mt-4 text-2xl font-bold">Start with a goal.</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Choose Placement, GATE, semester, DSA, AI/ML, or a custom path.
              GaugeHow turns it into milestones and daily momentum.
            </p>
            <Button asChild className="mt-6">
              <Link href="/goals">Explore goals</Link>
            </Button>
          </CardContent>
        </Card>
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
