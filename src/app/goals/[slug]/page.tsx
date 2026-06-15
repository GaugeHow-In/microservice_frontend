import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { goals } from "@/lib/mock-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function GoalDetailPage({ params }: Props) {
  const { slug } = await params;
  const goal = goals.find((item) => item.slug === slug);

  if (!goal) notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Goal workspace"
          title={goal.title}
          description={goal.description}
          action={
            <Button asChild>
              <Link href="/mentor">
                <Bot />
                Ask AI about this goal
              </Link>
            </Button>
          }
        />
        <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <ProgressRing value={goal.progress} label="Complete" size="lg" />
              <h2 className="mt-6 text-xl font-bold text-slate-950">{goal.deadline}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {goal.daysLeft ? `${goal.daysLeft} days remaining` : "Timeline adjusts to your pace"}
              </p>
              <Progress value={goal.progress} className="mt-6" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Milestone timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goal.milestones.map((milestone, index) => (
                <div key={milestone} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex size-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    {index < goal.milestones.length - 1 && <div className="h-10 w-px bg-slate-200" />}
                  </div>
                  <div className="pb-4">
                    <p className="font-semibold text-slate-950">{milestone}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {index < 2 ? "In progress" : "Planned"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Remaining tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {goal.remainingTasks.map((task) => (
                <div key={task} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">{task}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>AI suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {goal.aiSuggestions.map((suggestion) => (
                <div key={suggestion} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <Bot className="mt-0.5 size-5 text-orange-600" />
                    <p className="text-sm leading-6 text-slate-700">{suggestion}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            {["Weekly review", "Mock test checkpoint", "Revision buffer"].map((item, index) => (
              <div key={item} className="rounded-lg bg-slate-50 p-4">
                <Badge variant={index === 0 ? "orange" : "default"}>
                  {index === 0 ? <CalendarDays className="size-3" /> : <Clock3 className="size-3" />}
                  Phase {index + 1}
                </Badge>
                <p className="mt-3 font-semibold text-slate-950">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

