import Link from "next/link";
import { ArrowRight, Clock3, Globe2, Star } from "lucide-react";
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
    <article className="glass-card group flex h-full flex-col overflow-hidden rounded-xl bg-white">
      <div className="course-visual relative aspect-video overflow-hidden">
        <div className="absolute inset-0 surface-grid opacity-40" />
        <div className="absolute left-4 top-4 rounded bg-orange-600 px-3 py-1 text-xs font-bold uppercase text-white">
          {hasAccess ? "Enrolled" : "Best Seller"}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="green" className="rounded">
            {primaryCategory}
          </Badge>
          <span className="text-xs font-semibold text-slate-500">
            {course.average_rating.toFixed(1)} ★ ({course.total_reviews})
          </span>
        </div>

        <h3 className="text-xl font-bold leading-tight text-slate-950 transition group-hover:text-orange-700">
          {course.title}
        </h3>
        {course.short_description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {course.short_description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-800">
            {instructor
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span className="text-sm font-semibold text-slate-600">{instructor}</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <Clock3 className="size-4" />
            {formatMinutes(course.duration_minutes)}
          </span>
          <span>{course.lesson_count} lessons</span>
          <span className="flex items-center gap-1">
            <Star className="size-4 fill-orange-500 text-orange-500" />
            {course.level.replaceAll("_", " ")}
          </span>
        </div>

        {hasAccess && (
          <div className="mt-5 rounded-lg border border-orange-200 bg-[#fff7eb] p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Progress</span>
              <span className="font-bold text-slate-950">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-black/5 pt-5">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Access</p>
            <p className="text-xl font-bold text-slate-950">
              {hasAccess ? "Active" : formatPrice(course.pricing)}
            </p>
            {(course.pricing?.display_currency_code ?? course.pricing?.currency_code) && (
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                <Globe2 className="size-3.5" />
                {course.pricing.display_currency_code ?? course.pricing.currency_code}
              </span>
            )}
          </div>
          <Button asChild>
            <Link href={`/courses/${course.slug}`}>
              {hasAccess ? "Continue" : "Enroll Now"}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
