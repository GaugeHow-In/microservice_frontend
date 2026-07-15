import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ClockAfternoon, GraduationCap, Star } from "@phosphor-icons/react/dist/ssr";
import { CourseCatalogItem, formatMinutes, formatPrice } from "@/lib/learning-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type CourseCardProps = {
  course: CourseCatalogItem;
};

export function CourseCard({ course }: CourseCardProps) {
  const primaryCategory = course.categories[0]?.name ?? "Engineering";
  const instructor = course.instructors[0]?.display_name ?? "GaugeHow Faculty";
  const progress = course.access?.progress_percent ?? 0;
  const hasAccess = course.access?.has_access ?? false;

  return (
    <article className="browse-card group grid gap-5 p-5 md:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="relative min-h-48 overflow-hidden rounded-xl surface-secondary">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 768px) 240px, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="industrial-light-media flex h-full min-h-44 items-center justify-center p-6">
            <div className="surface-grid absolute inset-0 opacity-60" />
            <div className="relative flex size-16 items-center justify-center rounded-xl bg-slate-950 text-orange-300 shadow-[var(--shadow-md)]">
              <GraduationCap className="size-8" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold uppercase text-white">
          {hasAccess ? "Enrolled" : "Course"}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-4 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="orange">
            {primaryCategory}
          </Badge>
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">
            <Star className="size-4 fill-orange-500 text-orange-500" />
            {course.average_rating.toFixed(1)} ({course.total_reviews})
          </span>
        </div>

        <div>
          <h3 className="text-2xl font-bold leading-tight text-slate-950 transition group-hover:text-orange-700">
            {course.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">By {instructor}</p>
        </div>

        {course.short_description && (
          <p className="line-clamp-2 text-sm leading-6 text-slate-600">{course.short_description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
          <span className="flex items-center gap-1.5">
            <ClockAfternoon className="size-4 text-orange-600" />
            {formatMinutes(course.duration_minutes)}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-4 text-orange-600" />
            {course.lesson_count} lessons
          </span>
          <span className="capitalize">{course.level.replaceAll("_", " ")}</span>
        </div>

        {hasAccess && (
          <div className="max-w-xl">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Progress</span>
              <span className="font-bold text-slate-950">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              {hasAccess ? "Your access" : "Pricing"}
            </p>
            <p className="text-xl font-bold text-slate-950">
              {hasAccess ? "Active" : formatPrice(course.pricing)}
            </p>
          </div>
          <Button asChild>
            <Link href={`/courses/${course.slug}`}>
              {hasAccess ? "Continue" : "View details"}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
