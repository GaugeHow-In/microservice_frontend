import Image from "next/image";
import Link from "next/link";
import { BookOpen, ClockAfternoon, GraduationCap, Star } from "@phosphor-icons/react/dist/ssr";
import { CourseCatalogItem, formatMinutes } from "@/lib/learning-client";
import { Progress } from "@/components/ui/progress";

type CourseCardProps = {
  course: CourseCatalogItem;
};

export function CourseCard({ course }: CourseCardProps) {
  const primaryCategory = course.categories[0]?.name ?? "Engineering";
  const instructor = course.instructors[0]?.display_name ?? "GaugeHow Faculty";
  const progress = Math.round(course.access?.progress_percent ?? 0);
  const hasAccess = course.access?.has_access ?? false;
  const level = course.level.replaceAll("_", " ");

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="course-card group flex h-full flex-col focus:outline-none"
    >
      {/* 16:9 media, Coursera-style, no zoom on hover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden surface-secondary">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="industrial-light-media flex h-full items-center justify-center">
            <div className="surface-grid absolute inset-0 opacity-60" />
            <div className="relative flex size-14 items-center justify-center rounded-xl bg-slate-950 text-orange-300 shadow-[var(--shadow-md)]">
              <GraduationCap className="size-7" />
            </div>
          </div>
        )}
        {hasAccess && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Enrolled
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Provider row, like Coursera's institution lockup */}
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600">
            <GraduationCap className="size-3.5" />
          </span>
          <span className="truncate text-xs font-semibold text-slate-500">{instructor}</span>
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-950">
          {course.title}
        </h3>

        <p className="mt-1 text-xs font-semibold text-slate-500">{primaryCategory}</p>

        {hasAccess && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-950">{progress}% complete</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Footer pinned to the bottom: rating, then a metadata line */}
        <div className="mt-auto pt-3">
          <span className="flex items-center gap-1 text-sm">
            <Star className="size-4 fill-orange-500 text-orange-500" />
            <span className="font-bold text-slate-950">{course.average_rating.toFixed(1)}</span>
            <span className="text-slate-500">({course.total_reviews})</span>
          </span>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
            <span className="capitalize">{level}</span>
            <span aria-hidden="true">&middot;</span>
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {course.lesson_count} lessons
            </span>
            <span aria-hidden="true">&middot;</span>
            <span className="flex items-center gap-1">
              <ClockAfternoon className="size-3.5" />
              {formatMinutes(course.duration_minutes)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
