"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { BookOpen, LockKeyhole, Search } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/learning-client";
import {
  libraryClient,
  type LibraryDocumentCatalogItem,
} from "@/lib/library-client";

function accessLabel(item: LibraryDocumentCatalogItem): string {
  if (item.access?.has_access) return "Readable";
  if (item.pricing?.purchase_type === "free" || item.pricing?.base_price_minor === 0) return "Free";
  return "Premium";
}

function progressLabel(item: LibraryDocumentCatalogItem): string {
  if (!item.progress) return "Not started";
  if (item.progress.progress_percent >= 100) return "Completed";
  return `Page ${item.progress.current_page}${item.progress.page_count ? ` of ${item.progress.page_count}` : ""}`;
}

export default function LibraryPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [documents, setDocuments] = useState<LibraryDocumentCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function loadDocuments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await libraryClient.listDocuments({
          query: deferredQuery.trim() || undefined,
          categories: activeCategory === "all" ? [] : [activeCategory],
          token: accessToken,
        });
        if (!cancelled) {
          setDocuments(response.items);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load library.");
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeCategory, deferredQuery, isAuthLoading]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const document of documents) {
      if (document.category) {
        map.set(document.category.slug, document.category.name);
      }
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [documents]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Library"
          title="Premium study PDFs with tracked reading."
          description="Browse categorized notes, continue where you stopped, and read in a controlled viewer with annotations."
          action={
            <Button asChild variant="secondary">
              <Link href="/library">
                <LockKeyhole />
                Secure reader
              </Link>
            </Button>
          }
        />

        <div className="surface-elevated reveal-delay-1 reveal-up grid gap-3 rounded-2xl p-4 shadow-[var(--shadow-sm)] md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search study notes, authors, and categories"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "secondary"}
              onClick={() => setActiveCategory("all")}
            >
              All
            </Button>
            {categoryOptions.map((category) => (
              <Button
                key={category.slug}
                variant={activeCategory === category.slug ? "default" : "secondary"}
                onClick={() => setActiveCategory(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-5 text-sm font-medium text-rose-600">{error}</CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-4 p-5">
                  <Skeleton className="h-36 rounded-xl" />
                  <Skeleton className="h-6 w-4/5 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-10 rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : documents.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((document) => (
              <Card key={document.slug} className="overflow-hidden">
                {document.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={document.thumbnail_url}
                    alt=""
                    className="h-40 w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-slate-100 text-slate-500">
                    <BookOpen className="size-12" />
                  </div>
                )}
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={document.access?.has_access ? "green" : "orange"}>
                      {accessLabel(document)}
                    </Badge>
                    {document.category ? <Badge>{document.category.name}</Badge> : null}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">{document.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {document.author_name ?? "GaugeHow Library"}
                    </p>
                  </div>
                  <p className="line-clamp-3 text-sm text-slate-600">
                    {document.short_description ?? "Structured engineering study material."}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>{progressLabel(document)}</span>
                      <span>{document.progress?.progress_percent ?? 0}%</span>
                    </div>
                    <Progress value={document.progress?.progress_percent ?? 0} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      {formatPrice(document.pricing)}
                    </span>
                    <Button asChild>
                      <Link href={`/library/${document.slug}`}>
                        <BookOpen />
                        Open
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-slate-600">
              No library documents match the current search or category filter.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
