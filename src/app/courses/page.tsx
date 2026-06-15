import Link from "next/link";
import { Award, Filter, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AiStrip } from "@/components/shared/ai-strip";
import { CourseCard } from "@/components/shared/course-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { courses } from "@/lib/mock-data";

const courseTabPredicates = {
  all: () => true,
  placement: (category: string) => category.includes("placement"),
  gate: (category: string) => category.includes("competitive exam") || category.includes("gate"),
  "ai/ml": (category: string) => category.includes("ai/ml"),
  web: (category: string) => category.includes("web"),
};

export default function CoursesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="LMS"
          title="Courses built around outcomes."
          description="Browse modern learning paths with chapters, lessons, notes, attachments, discussions, certificates, and AI learning support."
          action={
            <Button asChild variant="secondary">
              <Link href="/courses/progress">
                <Award />
                Progress report
              </Link>
            </Button>
          }
        />
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" placeholder="Search DSA, GATE, AI/ML, web development" />
          </div>
          <Button variant="secondary">
            <Filter />
            Filters
          </Button>
        </div>
        <Tabs defaultValue="all">
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            {Object.keys(courseTabPredicates).map((tab) => (
              <TabsTrigger key={tab} value={tab} className="capitalize">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.slug} course={course} />
              ))}
            </div>
          </TabsContent>
          {Object.entries(courseTabPredicates)
            .filter(([tab]) => tab !== "all")
            .map(([tab, predicate]) => (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses
                  .filter((course) => predicate(course.category.toLowerCase()))
                  .map((course) => (
                    <CourseCard key={course.slug} course={course} />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        <AiStrip
          title="AI course advisor"
          description="Get recommendations based on your active goal, weak topics, available study time, and past test performance."
          cta="Recommend course"
        />
        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            {["Notes", "Attachments", "Discussions"].map((item) => (
              <div key={item} className="rounded-lg bg-slate-50 p-4">
                <Badge variant="blue">{item}</Badge>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Every course includes linked resources, chapter notes, and
                  contextual learning support.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
