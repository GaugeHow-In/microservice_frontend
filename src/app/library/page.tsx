import Link from "next/link";
import { BookOpen, Filter, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { books } from "@/lib/mock-data";

export default function LibraryPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Digital library"
          title="Books, guides, and reading progress in one place."
          description="Browse categories, search books, filter learning resources, open details, and continue reading from your last position."
        />
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" placeholder="Search books, authors, categories" />
          </div>
          <Button variant="secondary">
            <Filter />
            Filters
          </Button>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {books.map((book) => (
            <Card key={book.slug}>
              <CardContent className="space-y-4 p-5">
                <div className="flex aspect-[3/4] items-end rounded-lg bg-slate-950 p-4 text-white">
                  <div>
                    <BookOpen className="mb-4 size-8 text-orange-400" />
                    <h2 className="font-bold">{book.title}</h2>
                  </div>
                </div>
                <Badge variant="blue">{book.category}</Badge>
                <div>
                  <h3 className="font-bold text-slate-950">{book.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{book.author}</p>
                </div>
                <Progress value={book.progress} />
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{book.pages} pages</span>
                  <span>{book.progress}% read</span>
                </div>
                <Button asChild className="w-full" variant="secondary">
                  <Link href={`/library/${book.slug}`}>Open book</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

