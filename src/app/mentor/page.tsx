import { Bot, BookOpen, CalendarDays, GraduationCap, Send, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mentorPrompts } from "@/lib/mock-data";

export default function MentorPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="AI Mentor"
          title="A focused AI workspace for learning decisions."
          description="Chat, generate explanations, get course recommendations, shape goals, summarize chapters, and plan study sessions with mock AI responses."
        />
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="min-h-[680px]">
            <CardContent className="flex min-h-[680px] flex-col p-0">
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500 text-white">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-950">GaugeHow Mentor</h2>
                    <p className="text-sm text-slate-500">Context: Placement Goal · DSA Sprint</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div className="max-w-[82%] rounded-lg bg-slate-100 p-4">
                  <p className="text-sm leading-6 text-slate-700">
                    Explain sliding window problems and create a 3-day practice plan.
                  </p>
                </div>
                <div className="ml-auto max-w-[88%] rounded-lg bg-orange-50 p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-orange-700">
                    <Sparkles className="size-4" />
                    AI recommendation
                  </div>
                  <p className="text-sm leading-6 text-slate-700">
                    Start with fixed-size windows, then move to variable-size
                    constraints. Day 1: maximum sum and averages. Day 2:
                    longest substring variants. Day 3: timed mixed practice
                    and error review.
                  </p>
                </div>
                <div className="ml-auto max-w-[88%] rounded-lg border border-orange-200 bg-white p-4">
                  <p className="font-semibold text-slate-950">Next best actions</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Practice 4 variable-window problems.</li>
                    <li>Summarize common shrinking conditions.</li>
                    <li>Take a 25-minute quiz after revision.</li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-slate-200 p-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input placeholder="Ask AI to explain, plan, summarize, or recommend" />
                  <Button>
                    <Send />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <aside className="space-y-5">
            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="font-bold text-slate-950">Quick prompts</h2>
                {mentorPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    {prompt}
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-5">
                {[
                  { icon: GraduationCap, label: "Course recommendations" },
                  { icon: Target, label: "Goal recommendations" },
                  { icon: BookOpen, label: "Concept explanation" },
                  { icon: CalendarDays, label: "Study planning" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <Icon className="size-5 text-orange-500" />
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <Badge variant="orange">Generate notes</Badge>
                <Textarea className="mt-4" placeholder="Paste a concept or chapter topic" />
                <Button className="mt-3 w-full">Create AI notes</Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
