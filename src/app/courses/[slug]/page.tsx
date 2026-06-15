import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, FileText, MessageSquareText, Paperclip, Play, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { courses } from "@/lib/mock-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);

  if (!course) notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={course.category}
          title={course.title}
          description={`Learn with ${course.instructor}. Includes chapters, video lessons, notes, attachments, discussions, AI explanations, and certificate readiness.`}
          action={
            <Button asChild>
              <Link href={`/courses/${course.slug}/learn`}>
                <Play />
                Start learning
              </Link>
            </Button>
          }
        />
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardContent className="p-5">
              <div className="aspect-video rounded-lg bg-slate-950 p-6 text-white">
                <div className="flex h-full flex-col justify-between">
                  <Badge variant="orange">Course preview</Badge>
                  <div>
                    <Play className="mb-4 size-10 text-orange-400" />
                    <h2 className="text-2xl font-bold">{course.title}</h2>
                    <p className="mt-2 text-slate-300">
                      Continue from your last completed lesson.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["Lessons", course.lessons],
                  ["Duration", course.duration],
                  ["Rating", course.rating],
                  ["Level", course.level],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-1 font-bold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Learning support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: FileText, title: "Chapter notes", text: "Readable summaries for each chapter." },
                { icon: Paperclip, title: "Attachments", text: "Practice sheets, code snippets, and PDFs." },
                { icon: MessageSquareText, title: "Discussions", text: "Ask doubts and follow instructor responses." },
                { icon: Bot, title: "Explain with AI", text: "Get simpler explanations and examples." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                  <Icon className="mt-0.5 size-5 text-orange-500" />
                  <div>
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{text}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chapters</CardTitle>
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Star className="size-4 fill-orange-400 text-orange-400" />
                {course.rating}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {course.chapters.map((chapter, index) => (
              <div key={chapter.title} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      Chapter {index + 1}
                    </p>
                    <h3 className="mt-1 font-bold text-slate-950">{chapter.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{chapter.lessons} lessons</p>
                  </div>
                  <span className="text-sm font-bold text-slate-950">{chapter.progress}%</span>
                </div>
                <Progress value={chapter.progress} className="mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
