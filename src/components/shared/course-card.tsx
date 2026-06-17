import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Globe2, Star } from "lucide-react";
import { CourseCatalogItem, formatMinutes, formatPrice } from "@/lib/learning-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type CourseCardProps = {
  course: CourseCatalogItem;
};

export function CourseCard({ course }: CourseCardProps) {
  const primaryCategory = course.categories[0]?.name ?? "Course";
  const instructor = course.instructors[0]?.display_name ?? "GaugeHow Faculty";
  const progress = course.access?.progress_percent ?? 0;
  const hasAccess = course.access?.has_access ?? false;

  return (
    <Card className="overflow-hidden border-slate-200 bg-white">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="orange">{primaryCategory}</Badge>
              <Badge variant="blue">{course.level.replaceAll("_", " ")}</Badge>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-normal text-slate-950">
                {course.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">by {instructor}</p>
            </div>
            {course.short_description && (
              <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                {course.short_description}
              </p>
            )}
          </div>
          <div className="flex size-12 items-center justify-center rounded-lg bg-slate-950 text-white">
            <BookOpen className="size-5" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <span className="flex items-center gap-1 text-slate-600">
            <Clock3 className="size-4" />
            {formatMinutes(course.duration_minutes)}
          </span>
          <span className="text-slate-600">{course.lesson_count} lessons</span>
          <span className="flex items-center gap-1 text-slate-600">
            <Star className="size-4 fill-orange-400 text-orange-400" />
            {course.average_rating.toFixed(1)}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Access
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {hasAccess
                  ? course.access?.is_lifetime_access
                    ? "Lifetime access"
                    : course.access?.days_left
                      ? `${course.access.days_left} days left`
                      : "Active access"
                  : formatPrice(course.pricing)}
              </p>
            </div>
            {course.pricing?.currency_code && (
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <Globe2 className="size-3.5" />
                {course.pricing.currency_code}
              </span>
            )}
          </div>
          {hasAccess && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Progress</span>
                <span className="font-semibold text-slate-950">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/courses/${course.slug}`}>
              View details
              <ArrowRight />
            </Link>
          </Button>
          {hasAccess && (
            <Button asChild variant="secondary" className="flex-1">
              <Link href={`/courses/${course.slug}/learn`}>Continue</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
