import Link from "next/link";
import { Bookmark, Highlighter, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { notes } from "@/lib/mock-data";

export default function NotesPage() {
  const categories = [...new Set(notes.map((note) => note.category))];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Notes platform"
          title="Read smarter notes with highlights and progress."
          description="Search notes, browse categories, bookmark key ideas, highlight concepts, and ask AI to summarize chapters."
          action={
            <Button>
              <Sparkles />
              Generate notes
            </Button>
          }
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-10" placeholder="Search DBMS, DSA, OS, AI/ML notes" />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category} variant="default">{category}</Badge>
          ))}
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.slug}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="blue">{note.category}</Badge>
                  <Bookmark className="size-4 text-orange-500" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-950">{note.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{note.summary}</p>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{note.readTime}</span>
                  <span className="flex items-center gap-1">
                    <Highlighter className="size-4" />
                    {note.highlights} highlights
                  </span>
                </div>
                <Progress value={note.progress} />
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/notes/${note.slug}`}>Read note</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

