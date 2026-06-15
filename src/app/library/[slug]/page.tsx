import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, Bot, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { books } from "@/lib/mock-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BookDetailPage({ params }: Props) {
  const { slug } = await params;
  const book = books.find((item) => item.slug === slug);

  if (!book) notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={book.category}
          title={book.title}
          description={`${book.author}. Continue reading with progress tracking, bookmarks, filters, and AI summaries.`}
          action={
            <Button asChild>
              <Link href="/mentor">
                <Sparkles />
                Summarize with AI
              </Link>
            </Button>
          }
        />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardContent className="p-5">
              <div className="flex aspect-[3/4] items-end rounded-lg bg-slate-950 p-5 text-white">
                <div>
                  <Badge variant="orange">{book.category}</Badge>
                  <h2 className="mt-4 text-2xl font-bold">{book.title}</h2>
                </div>
              </div>
              <Progress value={book.progress} className="mt-5" />
              <p className="mt-2 text-sm text-slate-500">{book.progress}% complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm">
                  <Bookmark />
                  Bookmark
                </Button>
                <Button variant="secondary" size="sm">
                  <Bot />
                  Explain page
                </Button>
              </div>
              <article className="space-y-5 leading-8 text-slate-700">
                <p>
                  This chapter focuses on converting reading into recall. Each
                  concept is paired with a short example, a checkpoint, and a
                  practice prompt so students can move from passive reading to
                  measurable understanding.
                </p>
                <p>
                  Reading progress is saved locally in this prototype and uses
                  static mock data. Backend persistence can be connected later.
                </p>
              </article>
              <div className="mt-8 flex items-center justify-between">
                <Button variant="secondary">
                  <ChevronLeft />
                  Previous
                </Button>
                <Button>
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

