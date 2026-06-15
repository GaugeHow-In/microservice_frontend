import { Bot, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AiStrip } from "@/components/shared/ai-strip";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { roadmaps } from "@/lib/mock-data";

export default function RoadmapsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Roadmaps"
          title="Visual paths for high-demand skills."
          description="Browse Web Development, DSA, AI/ML, Data Science, DevOps, and Cybersecurity roadmaps with interactive progress steps."
          action={
            <Button>
              <Sparkles />
              Build custom roadmap
            </Button>
          }
        />
        <AiStrip
          title="AI roadmap builder"
          description="Tell GaugeHow your timeline, background, and target role. It will suggest the next roadmap and weekly milestones."
          cta="Create roadmap"
        />
        <section className="grid gap-4 lg:grid-cols-2">
          {roadmaps.map((roadmap) => (
            <Card key={roadmap.title}>
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <roadmap.icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-950">{roadmap.title}</h2>
                      <p className="text-sm text-slate-500">{roadmap.progress}% complete</p>
                    </div>
                  </div>
                  <Badge variant="green">XP path</Badge>
                </div>
                <Progress value={roadmap.progress} />
                <div className="grid gap-3 sm:grid-cols-3">
                  {roadmap.steps.map((step, index) => {
                    const done = index < Math.round((roadmap.progress / 100) * roadmap.steps.length);
                    return (
                      <div
                        key={step}
                        className={`rounded-lg border p-3 ${
                          done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="mb-2 size-4 text-emerald-600" />
                        ) : (
                          <Lock className="mb-2 size-4 text-slate-400" />
                        )}
                        <p className="text-sm font-semibold text-slate-700">{step}</p>
                      </div>
                    );
                  })}
                </div>
                <Button variant="secondary" className="w-full">
                  <Bot />
                  Ask AI what to learn next
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

