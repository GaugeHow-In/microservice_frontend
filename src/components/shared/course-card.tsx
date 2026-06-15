import Link from "next/link";
import { BookOpen, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type CourseCardProps = {
  course: {
    slug: string;
    title: string;
    category: string;
    instructor: string;
    progress: number;
    lessons: number;
    duration: string;
    level: string;
    rating: number;
  };
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Badge variant="orange">{course.category}</Badge>
            <div>
              <h3 className="text-lg font-bold tracking-normal text-slate-950">
                {course.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                by {course.instructor}
              </p>
            </div>
          </div>
          <div className="flex size-12 items-center justify-center rounded-lg bg-slate-950 text-white">
            <BookOpen className="size-5" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <span className="flex items-center gap-1 text-slate-600">
            <Clock className="size-4" />
            {course.duration}
          </span>
          <span className="text-slate-600">{course.lessons} lessons</span>
          <span className="flex items-center gap-1 text-slate-600">
            <Star className="size-4 fill-orange-400 text-orange-400" />
            {course.rating}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Progress</span>
            <span className="font-semibold text-slate-950">{course.progress}%</span>
          </div>
          <Progress value={course.progress} />
        </div>
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/courses/${course.slug}`}>Open course</Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href={`/courses/${course.slug}/learn`}>Continue</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

