import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  GraduationCap,
  Play,
  Search,
  ShieldCheck,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { learningClient, type CourseCatalogItem, formatPrice } from "@/lib/learning-client";

const stats = [
  ["98%", "Completion Rate"],
  ["12k+", "Certificates Issued"],
  ["50+", "Expert Instructors"],
  ["4.9/5", "User Satisfaction"],
] as const;

export default async function Home() {
  let courses: CourseCatalogItem[] = [];
  try {
    const catalog = await learningClient.listCourses({ pageSize: 3 });
    courses = catalog.items;
  } catch {
    courses = [];
  }

  const featured = courses.length
    ? courses
    : [
        {
          id: "fallback-industrial-drafting",
          slug: "industrial-drafting",
          title: "Mastering Industrial Drafting & GD&T",
          short_description:
            "Learn geometric dimensioning standards used by aerospace and manufacturing teams.",
          status: "published",
          lesson_count: 24,
          duration_minutes: 640,
          average_rating: 4.9,
          total_reviews: 1240,
          level: "intermediate",
          certificate_enabled: true,
          thumbnail_url: null,
          categories: [{ id: "engineering", slug: "engineering", name: "Engineering" }],
          instructors: [
            {
              id: "faculty",
              display_name: "GaugeHow Faculty",
              handle: null,
              one_line_description: null,
              linkedin_url: null,
            },
          ],
          pricing: null,
          access: null,
        },
        {
          id: "fallback-additive-manufacturing",
          slug: "additive-manufacturing",
          title: "Advanced Additive Manufacturing",
          short_description:
            "Deep dive into 3D printing workflows for industrial prototyping and functional parts.",
          status: "published",
          lesson_count: 18,
          duration_minutes: 480,
          average_rating: 4.8,
          total_reviews: 850,
          level: "advanced",
          certificate_enabled: true,
          thumbnail_url: null,
          categories: [{ id: "manufacturing", slug: "manufacturing", name: "Manufacturing" }],
          instructors: [
            {
              id: "faculty",
              display_name: "GaugeHow Faculty",
              handle: null,
              one_line_description: null,
              linkedin_url: null,
            },
          ],
          pricing: null,
          access: null,
        },
        {
          id: "fallback-digital-twin",
          slug: "digital-twin",
          title: "Digital Twin & Industry 4.0",
          short_description:
            "Model manufacturing systems with sensor-driven digital twin workflows.",
          status: "published",
          lesson_count: 20,
          duration_minutes: 520,
          average_rating: 4.7,
          total_reviews: 930,
          level: "beginner",
          certificate_enabled: true,
          thumbnail_url: null,
          categories: [{ id: "design", slug: "design", name: "Design" }],
          instructors: [
            {
              id: "faculty",
              display_name: "GaugeHow Faculty",
              handle: null,
              one_line_description: null,
              linkedin_url: null,
            },
          ],
          pricing: null,
          access: null,
        },
      ] satisfies CourseCatalogItem[];

  return (
    <main className="light-system min-h-screen overflow-hidden text-slate-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#fbf8f4]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandLogo />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a className="border-b-2 border-orange-600 pb-1 text-orange-700" href="#">
              Home
            </a>
            <Link href="/courses">Categories</Link>
            <Link href="/dashboard">My Learning</Link>
            <Link href="/verify-certificate">Verify</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg bg-[color:var(--surface-secondary)] px-3 py-2 lg:flex">
              <Search className="size-4 text-slate-500" />
              <span className="text-sm text-slate-500">Search courses...</span>
            </div>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/signup">Start learning</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pb-16 pt-20">
        <div className="absolute -right-32 -top-32 size-[36rem] rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Badge variant="orange" className="rounded-full">
              <ShieldCheck className="size-4" />
              Trusted by engineering learners
            </Badge>
            <h1 className="mt-5 max-w-2xl text-5xl font-extrabold leading-tight text-slate-950 md:text-6xl">
              Master Your <span className="text-orange-600">Engineering</span> Skills
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Professional-grade technical courses, guided study workflows, certificates, and AI
              support for students building measurable engineering mastery.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/courses">
                  Browse Courses
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">
                  <Play />
                  Continue Learning
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[0, 1, 2].map((item) => (
                  <span
                    key={item}
                    className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-orange-100 text-sm font-bold text-orange-800"
                  >
                    {["GH", "AI", "ME"][item]}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-600">
                <span className="font-bold text-slate-950">12k+</span> students already learning
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="glass-card overflow-hidden rounded-xl">
              <div className="industrial-light-media relative aspect-[4/3] p-6">
                <div className="absolute inset-0 surface-grid opacity-70" />
                <div className="relative flex h-full flex-col justify-end rounded-lg bg-slate-950/90 p-6 text-white shadow-2xl">
                  <div className="mb-auto grid grid-cols-3 gap-3">
                    {["CAD", "CFD", "FEA"].map((item) => (
                      <span key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-bold">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="text-2xl font-bold">Advanced Industrial Design</p>
                  <p className="mt-1 text-sm text-slate-300">Next session starts in 2 days</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-3 rounded-xl bg-white p-4 shadow-lg sm:-left-6">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <Trophy className="size-6" />
                </span>
                <div>
                  <p className="font-bold text-slate-950">Top Rated Program</p>
                  <p className="text-sm text-slate-500">98.4% Average Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-[#f6efe6] py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 text-center sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map(([value, label]) => (
            <div key={label}>
              <p className="text-4xl font-extrabold text-orange-700 md:text-5xl">{value}</p>
              <p className="mt-2 text-xs font-bold uppercase text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-950">Featured Engineering Courses</h2>
            <p className="mt-2 text-slate-600">
              Accelerate your career with popular specialized programs.
            </p>
          </div>
          <Link href="/courses" className="flex items-center gap-1 text-sm font-bold text-orange-700">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((course, index) => (
            <article key={course.slug} className="browse-card group flex flex-col p-4">
              <div className="course-visual relative aspect-video overflow-hidden rounded-xl">
                <div className="absolute inset-0 surface-grid opacity-40" />
                <div className="absolute left-4 top-4 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white">
                  {index === 0 ? "Bestseller" : course.categories?.[0]?.name ?? "Course"}
                </div>
              </div>
              <div className="flex flex-1 flex-col pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                  <BookOpen className="size-4" />
                  {course.lesson_count} lessons
                </div>
                <h3 className="text-xl font-bold text-slate-950 transition group-hover:text-orange-700">
                  {course.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {course.short_description ?? "Professional engineering course with guided lessons and practical tasks."}
                </p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="flex items-center gap-1 font-bold text-slate-950">
                    <Star className="size-4 fill-orange-500 text-orange-500" />
                    {course.average_rating.toFixed(1)}
                  </span>
                  <span className="text-xl font-bold text-slate-950">
                    {formatPrice(course.pricing)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-black/5 bg-[#2e2117] py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <Badge variant="orange">Engineering Cockpit</Badge>
            <h2 className="mt-4 text-3xl font-bold text-white">
              Dark learning workspace for focused study sessions.
            </h2>
            <p className="mt-3 text-slate-300">
              Continue courses, ask the mentor, track certificates, and keep progress visible.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: GraduationCap, label: "Live courses" },
              { icon: Users, label: "Mentor support" },
              { icon: ShieldCheck, label: "Certificates" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl bg-white/5 p-5">
                <Icon className="size-6 text-orange-300" />
                <p className="mt-4 font-bold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
