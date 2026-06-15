import Link from "next/link";
import { Calendar, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AiStrip } from "@/components/shared/ai-strip";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { goals } from "@/lib/mock-data";

export default function GoalsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Goal system"
          title="Turn ambition into visible milestones."
          description="Create Placement, GATE, Semester, DSA, AI/ML, or custom goals with progress, timelines, remaining tasks, and AI suggestions."
          action={
            <Button>
              <Plus />
              Create goal
            </Button>
          }
        />
        <AiStrip
          title="AI goal coach"
          description="GaugeHow can rebalance your study time, suggest milestones, and convert weak topics into daily tasks."
          cta="Generate study plan"
        />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.slug}>
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <goal.icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-950">{goal.title}</h2>
                      <p className="text-sm text-slate-500">{goal.deadline}</p>
                    </div>
                  </div>
                  <ProgressRing value={goal.progress} size="sm" />
                </div>
                <p className="text-sm leading-6 text-slate-600">{goal.description}</p>
                <Progress value={goal.progress} />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-500">
                    <Calendar className="size-4" />
                    {goal.daysLeft ? `${goal.daysLeft} days left` : "Flexible"}
                  </span>
                  <Badge variant="green">{goal.milestones.length} milestones</Badge>
                </div>
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/goals/${goal.slug}`}>
                    <Sparkles />
                    Open goal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

