import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, Bookmark, Highlighter, ListChecks, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { notes } from "@/lib/mock-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function NoteReaderPage({ params }: Props) {
  const { slug } = await params;
  const note = notes.find((item) => item.slug === slug);

  if (!note) notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={note.category}
          title={note.title}
          description={note.summary}
          action={
            <Button asChild>
              <Link href="/mentor">
                <Bot />
                Explain this concept
              </Link>
            </Button>
          }
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="mb-6 flex flex-wrap gap-2">
                <Badge variant="orange">
                  <Highlighter className="size-3" />
                  Highlighting on
                </Badge>
                <Badge>
                  <Bookmark className="size-3" />
                  Bookmarked
                </Badge>
              </div>
              <article className="prose prose-slate max-w-none">
                <p className="text-lg leading-8 text-slate-700">
                  The key idea is to convert theory into a reliable mental model.
                  A good note starts with definitions, then examples, then common
                  mistakes, and finally practice checkpoints.
                </p>
                <div className="my-6 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 text-slate-700">
                  Highlight: exam questions usually test edge cases, not only
                  definitions. Connect every concept to one solved example.
                </div>
                <h2 className="text-xl font-bold text-slate-950">Core concepts</h2>
                <p className="mt-3 leading-8 text-slate-700">
                  Break the topic into primitives, relationships, and decision
                  rules. For revision, keep each section short enough to be
                  recalled without opening the full course.
                </p>
                <h2 className="mt-8 text-xl font-bold text-slate-950">Practice prompts</h2>
                <ul className="mt-3 space-y-3 text-slate-700">
                  <li>Define the concept in your own words.</li>
                  <li>List two cases where the rule fails or needs adjustment.</li>
                  <li>Ask AI to generate five short recall questions.</li>
                </ul>
              </article>
            </CardContent>
          </Card>
          <aside className="space-y-5">
            <Card>
              <CardContent className="p-5">
                <p className="font-semibold text-slate-950">Reading progress</p>
                <Progress value={note.progress} className="mt-4" />
                <p className="mt-3 text-sm text-slate-500">{note.progress}% complete</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-5">
                {[
                  { icon: Sparkles, label: "Summarize note" },
                  { icon: ListChecks, label: "Create flashcards" },
                  { icon: Bot, label: "Ask a doubt" },
                ].map(({ icon: Icon, label }) => (
                  <Button key={label} variant="secondary" className="w-full">
                    <Icon className="size-4" />
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
