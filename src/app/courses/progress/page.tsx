import Link from "next/link";
import { Award, CheckCircle2, Clock, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { courses } from "@/lib/mock-data";

export default function CourseProgressPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Course progress"
          title="Progress, certificates, and learning history."
          description="Track completion by course, chapter, lesson, notes, attachments, discussions, and certificate readiness."
        />
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Lessons completed", value: "147", icon: CheckCircle2 },
            { label: "Hours learned", value: "82h", icon: Clock },
            { label: "Certificates ready", value: "3", icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
                </div>
                <Icon className="size-6 text-orange-500" />
              </CardContent>
            </Card>
          ))}
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Course completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {courses.map((course) => (
              <div key={course.slug} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-slate-950">{course.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {course.lessons} lessons · {course.duration} · {course.level}
                    </p>
                  </div>
                  <Badge variant={course.certificate ? "green" : "default"}>
                    <FileText className="size-3" />
                    Certificate
                  </Badge>
                </div>
                <Progress value={course.progress} className="mt-4" />
                <div className="mt-4 flex justify-end">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/courses/${course.slug}`}>Review</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
