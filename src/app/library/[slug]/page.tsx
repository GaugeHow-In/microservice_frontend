"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Expand,
  Highlighter,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/learning-client";
import {
  libraryClient,
  type LibraryAnnotation,
  type LibraryAnnotationType,
  type LibraryDocumentDetail,
  type LibraryViewerSession,
} from "@/lib/library-client";

type Props = {
  params: Promise<{ slug: string }>;
};

type PdfViewport = {
  width: number;
  height: number;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => { promise: Promise<void>; cancel: () => void };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void>;
};

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { url: string; disableAutoFetch?: boolean; disableStream?: boolean }) => {
    promise: Promise<PdfDocument>;
  };
};

let pdfJsPromise: Promise<PdfJsModule> | null = null;

function ensurePdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist").then((module) => {
      const pdfjs = module as unknown as PdfJsModule;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfJsPromise;
}

function currentTimeSpentSeconds(startedAt: number): number {
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
}

function accessBadge(document: LibraryDocumentDetail): string {
  if (document.access?.has_access) return "Access active";
  if (document.recommended_pricing?.purchase_type === "free") return "Free";
  return "Premium";
}

export default function LibraryDetailPage({ params }: Props) {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);
  const [document, setDocument] = useState<LibraryDocumentDetail | null>(null);
  const [viewerSession, setViewerSession] = useState<LibraryViewerSession | null>(null);
  const [annotations, setAnnotations] = useState<LibraryAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [grantingFreeAccess, setGrantingFreeAccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [scale, setScale] = useState(1.15);
  const [annotationType, setAnnotationType] = useState<LibraryAnnotationType>("note");
  const [annotationBody, setAnnotationBody] = useState("");
  const [savingAnnotation, setSavingAnnotation] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<PdfDocument | null>(null);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(params).then((value) => {
      if (!cancelled) setSlug(value.slug);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  const saveProgress = useCallback(
    async (options?: { keepalive?: boolean; markCompleted?: boolean }) => {
      if (!slug || !accessToken || !viewerSession) return;
      try {
        const response = await libraryClient.updateProgress(
          slug,
          accessToken,
          {
            currentPage,
            pageCount,
            timeSpentSeconds: currentTimeSpentSeconds(startedAtRef.current),
            markCompleted: options?.markCompleted ?? false,
          },
          { keepalive: options?.keepalive ?? false },
        );
        setProgressPercent(response.progress_percent);
      } catch {
        // Progress writes are retried by the next page change or unload event.
      }
    },
    [accessToken, currentPage, pageCount, slug, viewerSession],
  );

  const startViewer = useCallback(
    async (documentSlug: string) => {
      if (!accessToken) return;
      setViewerLoading(true);
      setReaderError(null);
      try {
        const session = await libraryClient.createViewerSession(documentSlug, accessToken);
        setViewerSession(session);
      } catch (cause) {
        setReaderError(cause instanceof Error ? cause.message : "Unable to open reader.");
      } finally {
        setViewerLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!slug || isAuthLoading) return;
    const documentSlug = slug;
    let cancelled = false;

    async function loadDocument() {
      setLoading(true);
      setError(null);
      try {
        const payload = await libraryClient.getDocument(documentSlug, { token: accessToken });
        if (!cancelled) {
          setDocument(payload);
          setAnnotations(payload.annotations);
          const startPage = payload.progress?.current_page ?? 1;
          setCurrentPage(startPage);
          setPageCount(payload.progress?.page_count ?? payload.page_count);
          setProgressPercent(payload.progress?.progress_percent ?? 0);
          if (payload.access?.has_access && accessToken) {
            void startViewer(documentSlug);
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load library item.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDocument();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading, slug, startViewer]);

  useEffect(() => {
    if (!viewerSession) return;
    const session = viewerSession;
    let cancelled = false;

    async function loadPdf() {
      setRendering(true);
      setReaderError(null);
      try {
        const pdfjs = await ensurePdfJs();
        if (pdfRef.current?.destroy) {
          await pdfRef.current.destroy();
        }
        const pdf = await pdfjs.getDocument({
          url: session.pdf_url,
          disableAutoFetch: true,
          disableStream: false,
        }).promise;
        if (!cancelled) {
          pdfRef.current = pdf;
          setPageCount(pdf.numPages);
          setCurrentPage((page) => Math.min(Math.max(page, 1), pdf.numPages));
        }
      } catch (cause) {
        if (!cancelled) {
          setReaderError(cause instanceof Error ? cause.message : "Unable to render PDF.");
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    void loadPdf();
    return () => {
      cancelled = true;
    };
  }, [viewerSession]);

  useEffect(() => {
    const pdfDocument = pdfRef.current;
    const canvasElement = canvasRef.current;
    if (!pdfDocument || !canvasElement) return;
    const activePdf: PdfDocument = pdfDocument;
    const activeCanvas: HTMLCanvasElement = canvasElement;
    let cancelled = false;
    let renderTask: { promise: Promise<void>; cancel: () => void } | null = null;

    async function renderPage() {
      setRendering(true);
      try {
        const page = await activePdf.getPage(currentPage);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const context = activeCanvas.getContext("2d", { alpha: false });
        if (!context) return;
        const outputScale = window.devicePixelRatio || 1;
        activeCanvas.width = Math.floor(viewport.width * outputScale);
        activeCanvas.height = Math.floor(viewport.height * outputScale);
        activeCanvas.style.width = `${Math.floor(viewport.width)}px`;
        activeCanvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (cause) {
        if (!cancelled && cause instanceof Error && cause.name !== "RenderingCancelledException") {
          setReaderError(cause.message);
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [currentPage, scale, viewerSession]);

  useEffect(() => {
    if (!viewerSession) return;
    const timeout = window.setTimeout(() => {
      void saveProgress();
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [currentPage, saveProgress, viewerSession]);

  useEffect(() => {
    if (!viewerSession) return;
    const blockContextMenu = (event: MouseEvent) => event.preventDefault();
    const blockShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["s", "p", "o"].includes(key)) {
        event.preventDefault();
      }
    };
    const beforePrint = (event: Event) => event.preventDefault();
    const unload = () => {
      void saveProgress({ keepalive: true });
    };
    window.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("keydown", blockShortcuts);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("pagehide", unload);
    return () => {
      window.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("keydown", blockShortcuts);
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("pagehide", unload);
    };
  }, [saveProgress, viewerSession]);

  useEffect(() => {
    return () => {
      if (pdfRef.current?.destroy) {
        void pdfRef.current.destroy();
        pdfRef.current = null;
      }
    };
  }, []);

  const grantFreeAccess = async () => {
    if (!slug || !accessToken) return;
    setGrantingFreeAccess(true);
    setError(null);
    try {
      await libraryClient.grantFreeAccess(slug, accessToken);
      const payload = await libraryClient.getDocument(slug, { token: accessToken });
      setDocument(payload);
      setAnnotations(payload.annotations);
      await startViewer(slug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to unlock document.");
    } finally {
      setGrantingFreeAccess(false);
    }
  };

  const saveAnnotation = async () => {
    if (!slug || !accessToken || !annotationBody.trim()) return;
    setSavingAnnotation(true);
    try {
      const annotation = await libraryClient.createAnnotation(slug, accessToken, {
        annotationType,
        pageNumber: currentPage,
        body: annotationBody,
        color:
          annotationType === "highlight"
            ? "#fcbc6c"
            : annotationType === "bookmark"
              ? "#0f766e"
              : "#334155",
      });
      setAnnotations((items) => [...items, annotation]);
      setAnnotationBody("");
    } finally {
      setSavingAnnotation(false);
    }
  };

  const deleteAnnotation = async (annotation: LibraryAnnotation) => {
    if (!accessToken) return;
    await libraryClient.deleteAnnotation(annotation.id, accessToken);
    setAnnotations((items) => items.filter((item) => item.id !== annotation.id));
  };

  const enterFullscreen = async () => {
    await readerRef.current?.requestFullscreen();
  };

  if (loading || isAuthLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-[560px] rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !document) {
    return (
      <AppShell>
        <p className="text-sm font-medium text-rose-600">
          {error ?? "Library document was not found."}
        </p>
      </AppShell>
    );
  }

  const hasAccess = Boolean(document.access?.has_access || viewerSession);
  const freeAccessAvailable = document.recommended_pricing?.purchase_type === "free";
  const pageAnnotations = annotations.filter((annotation) => annotation.page_number === currentPage);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Library reader"
          title={document.title}
          description={document.short_description ?? "Study material from GaugeHow Library."}
          action={
            <Button asChild variant="secondary">
              <Link href="/library">
                <ArrowLeft />
                Library
              </Link>
            </Button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section
            ref={readerRef}
            className="min-h-[620px] overflow-hidden rounded-2xl bg-slate-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={hasAccess ? "green" : "orange"}>{accessBadge(document)}</Badge>
                <Badge variant="dark">
                  {pageCount ? `${pageCount} pages` : document.page_count ? `${document.page_count} pages` : "PDF"}
                </Badge>
                <Badge>{formatPrice(document.recommended_pricing)}</Badge>
              </div>
              {hasAccess ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="dark"
                    size="icon"
                    title="Previous page"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="min-w-20 text-center text-sm font-semibold">
                    {currentPage}/{pageCount ?? "-"}
                  </span>
                  <Button
                    variant="dark"
                    size="icon"
                    title="Next page"
                    onClick={() => setCurrentPage((page) => Math.min(pageCount ?? page + 1, page + 1))}
                    disabled={pageCount !== null && currentPage >= pageCount}
                  >
                    <ChevronRight />
                  </Button>
                  <Button
                    variant="dark"
                    size="icon"
                    title="Zoom out"
                    onClick={() => setScale((value) => Math.max(0.7, Number((value - 0.15).toFixed(2))))}
                  >
                    <Minus />
                  </Button>
                  <Button
                    variant="dark"
                    size="icon"
                    title="Zoom in"
                    onClick={() => setScale((value) => Math.min(2, Number((value + 0.15).toFixed(2))))}
                  >
                    <Plus />
                  </Button>
                  <Button variant="dark" size="icon" title="Fullscreen" onClick={enterFullscreen}>
                    <Maximize2 />
                  </Button>
                </div>
              ) : null}
            </div>

            {!hasAccess ? (
              <div className="flex min-h-[560px] flex-col items-center justify-center gap-4 px-6 text-center text-white">
                <BookOpen className="size-14 text-orange-300" />
                <div>
                  <h2 className="text-2xl font-bold">Access required</h2>
                  <p className="mt-2 max-w-lg text-sm text-slate-300">
                    {freeAccessAvailable
                      ? "This document can be added to your library at no cost."
                      : "This premium document needs an active subscription or purchase access."}
                  </p>
                </div>
                {freeAccessAvailable ? (
                  <Button onClick={grantFreeAccess} disabled={grantingFreeAccess || !accessToken}>
                    {grantingFreeAccess ? <Loader2 className="animate-spin" /> : <BookOpen />}
                    Start reading
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    <Expand />
                    Subscription required
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative flex min-h-[560px] justify-center overflow-auto bg-slate-900 p-4">
                {(viewerLoading || rendering) && (
                  <div className="absolute left-4 top-4 z-10 rounded-lg bg-slate-950/80 px-3 py-2 text-sm font-semibold text-white">
                    Loading...
                  </div>
                )}
                {readerError ? (
                  <div className="m-auto max-w-md rounded-xl surface-primary p-5 text-sm font-semibold text-rose-600">
                    {readerError}
                  </div>
                ) : (
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="max-w-none rounded bg-white shadow-2xl"
                      aria-label={`${document.title} page ${currentPage}`}
                    />
                    {viewerSession?.watermark ? (
                      <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
                        <div className="-rotate-12 select-none text-center text-4xl font-bold uppercase tracking-widest text-slate-950/10">
                          {viewerSession.watermark}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5" />
                  Reading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                  <span>Progress</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} />
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void saveProgress({ markCompleted: true })}
                  disabled={!hasAccess}
                >
                  <Bookmark />
                  Mark done
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StickyNote className="size-5" />
                  Annotations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "note" as const, icon: StickyNote, label: "Note" },
                    { type: "highlight" as const, icon: Highlighter, label: "Highlight" },
                    { type: "bookmark" as const, icon: Bookmark, label: "Bookmark" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.type}
                        variant={annotationType === item.type ? "default" : "secondary"}
                        size="sm"
                        title={item.label}
                        onClick={() => setAnnotationType(item.type)}
                        disabled={!hasAccess}
                      >
                        <Icon />
                      </Button>
                    );
                  })}
                </div>
                <Textarea
                  value={annotationBody}
                  onChange={(event) => setAnnotationBody(event.target.value)}
                  placeholder="Write an annotation"
                  disabled={!hasAccess}
                />
                <Button
                  className="w-full"
                  onClick={saveAnnotation}
                  disabled={!hasAccess || savingAnnotation || !annotationBody.trim()}
                >
                  {savingAnnotation ? <Loader2 className="animate-spin" /> : <StickyNote />}
                  Save
                </Button>
                <div className="max-h-72 space-y-2 overflow-auto pr-1">
                  {pageAnnotations.length ? (
                    pageAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="rounded-lg surface-secondary p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge>{annotation.annotation_type}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete annotation"
                            onClick={() => void deleteAnnotation(annotation)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        <p className="mt-2 text-slate-700">{annotation.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg surface-secondary p-3 text-sm text-slate-500">
                      No annotations on this page.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
