"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LibraryRow, LibraryRowSkeleton } from "@/components/shared/library-row";
import { Input } from "@/components/ui/input";
import { libraryClient, type LibraryDocumentCatalogItem } from "@/lib/library-client";

export default function LibraryPage() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [documents, setDocuments] = useState<LibraryDocumentCatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const response = await libraryClient.listDocuments({
      query: deferredQuery.trim() || undefined,
      categories: activeCategory === "all" ? [] : [activeCategory],
      token: accessToken,
    });
    return response.items;
  }, [accessToken, activeCategory, deferredQuery]);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const items = await loadDocuments();
        if (!cancelled) setDocuments(items);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load library.");
          setDocuments([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, loadDocuments]);

  // A redeem changes access and balance, so pull the row's real state back.
  const refreshAfterRedeem = useCallback(() => {
    void loadDocuments()
      .then(setDocuments)
      .catch(() => undefined);
  }, [loadDocuments]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const document of documents) {
      if (document.category) map.set(document.category.slug, document.category.name);
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [documents]);

  return (
    <AppShell>
      <div className="reveal-up mx-auto max-w-3xl">
        <header className="space-y-2 border-b border-[color:var(--border)] pb-6">
          <span className="rm-tag text-accent">Library</span>
          <h1 className="type-h2 text-slate-950">Read, unlock, and pick up where you left off.</h1>
        </header>

        <div className="relative pt-6">
          <MagnifyingGlass className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-11 rounded-full surface-secondary pl-11"
            placeholder="Search books"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {categoryOptions.length ? (
          <div className="flex gap-1.5 overflow-x-auto pt-4">
            {[{ slug: "all", name: "All" }, ...categoryOptions].map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setActiveCategory(category.slug)}
                className={
                  activeCategory === category.slug
                    ? "shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white"
                    : "shrink-0 rounded-full px-3 py-1 text-xs font-medium text-slate-500 transition hover:text-slate-950"
                }
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="rm-divide pt-2">
          {error ? (
            <p className="py-8 text-sm text-rose-600">{error}</p>
          ) : isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <LibraryRowSkeleton key={index} className="animate-pulse" />
            ))
          ) : documents.length ? (
            documents.map((document) => (
              <LibraryRow
                key={document.slug}
                document={document}
                accessToken={accessToken}
                onRedeemed={refreshAfterRedeem}
              />
            ))
          ) : (
            <p className="py-8 type-caption text-slate-500">No books match.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
