import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Bookmark, Download, FileText, MessageCircle, Pause, Play, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { courses, lessons } from "@/lib/mock-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function VideoLearningPage({ params }: Props) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);

  if (!course) notFound();

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
            <div className="aspect-video p-5 text-white">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Badge variant="dark">Now playing</Badge>
                  <Button variant="secondary" size="sm">
                    <Bookmark />
                    Save
                  </Button>
                </div>
                <div>
                  <Button size="icon" className="mb-5 size-14 rounded-full">
                    <Pause />
                  </Button>
                  <h1 className="text-2xl font-bold">{lessons[2].title}</h1>
                  <p className="mt-2 text-slate-300">{course.title}</p>
                </div>
                <div className="h-1.5 rounded-full bg-white/20">
                  <div className="h-full w-[46%] rounded-full bg-orange-500" />
                </div>
              </div>
            </div>
          </div>
          <Card>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-4">
              {[
                { icon: Bot, label: "Explain concept" },
                { icon: Sparkles, label: "Generate notes" },
                { icon: FileText, label: "Summarize chapter" },
                { icon: Download, label: "Attachments" },
              ].map(({ icon: Icon, label }) => (
                <Button key={label} variant="secondary">
                  <Icon className="size-4" />
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Lesson notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-7 text-slate-600">
                Sliding windows reduce repeated work by maintaining a valid
                range and updating the answer as the range expands or contracts.
              </p>
              <Textarea placeholder="Write your own note or ask AI to improve it" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  Why does the left pointer move only when the condition breaks?
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Instructor reply: because the window remains useful while it
                  satisfies the constraint.
                </p>
              </div>
              <Button variant="secondary">
                <MessageCircle />
                Add discussion
              </Button>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Lessons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.title}
                  className={`rounded-lg border p-3 ${
                    lesson.status === "active"
                      ? "border-orange-300 bg-orange-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Button size="icon" variant={lesson.status === "active" ? "default" : "secondary"}>
                      <Play />
                    </Button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {index + 1}. {lesson.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{lesson.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Course progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={course.progress} />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                {course.progress}% complete
              </p>
              <Button asChild className="mt-4 w-full" variant="secondary">
                <Link href={`/courses/${course.slug}`}>Course overview</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
