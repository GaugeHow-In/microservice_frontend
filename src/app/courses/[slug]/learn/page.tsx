"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bold,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Download,
  Eye,
  ExternalLink,
  Heading,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Lock,
  Maximize2,
  Pause,
  Play,
  Quote,
  RotateCcw,
  RotateCw,
  Sparkles,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLearningContext } from "@/components/providers/learning-context-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  type AccessSummary,
  type CourseDetail,
  type DiscussionComment,
  type DiscussionThread,
  type LessonAIArtifact,
  type LessonDetail,
  type LessonProgress,
  type LessonResource,
  formatSeconds,
  learningCache,
  learningClient,
} from "@/lib/learning-client";

type Props = {
  params: Promise<{ slug: string }>;
};

type PlayerJsEventData = {
  seconds?: number;
  duration?: number;
};

type QuestionResultState = {
  correct: boolean;
  explanation: string | null;
};

type QuestionAttemptState = {
  selectedOptionId: string | null;
  isLocked: boolean;
  isSubmitting: boolean;
  result: QuestionResultState | null;
  error: string | null;
};

type MarkdownEditorAction =
  | "heading"
  | "bold"
  | "italic"
  | "unordered-list"
  | "ordered-list"
  | "quote"
  | "code"
  | "link";

type MarkdownToolbarAction = {
  action: MarkdownEditorAction;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const markdownToolbarActions: MarkdownToolbarAction[] = [
  { action: "heading", label: "Heading", Icon: Heading },
  { action: "bold", label: "Bold", Icon: Bold },
  { action: "italic", label: "Italic", Icon: Italic },
  { action: "unordered-list", label: "Bulleted list", Icon: List },
  { action: "ordered-list", label: "Numbered list", Icon: ListOrdered },
  { action: "quote", label: "Quote", Icon: Quote },
  { action: "code", label: "Code", Icon: Code2 },
  { action: "link", label: "Link", Icon: Link2 },
];

type PlayerJsPlayer = {
  on: (event: string, callback: (data?: PlayerJsEventData) => void) => void;
  off?: (event: string, callback?: (data?: PlayerJsEventData) => void) => void;
  pause: () => void;
  play: () => void;
  destroy?: () => void;
  getMuted?: (callback: (value: boolean) => void) => void;
  getPaused?: (callback: (value: boolean) => void) => void;
  getCurrentTime?: (callback: (value: number) => void) => void;
  getDuration?: (callback: (value: number) => void) => void;
  getVolume?: (callback: (value: number) => void) => void;
  mute?: () => void;
  setCurrentTime?: (value: number) => void;
  setVolume?: (value: number) => void;
  supports?: (kind: "method" | "event", methodOrEventName: string) => boolean;
  unmute?: () => void;
};

type YouTubePlayerEvent = {
  data: number;
  target: YouTubePlayer;
};

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVolume: () => number;
  isMuted: () => boolean;
  mute: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
  unMute: () => void;
};

declare global {
  interface Window {
    playerjs?: {
      Player: new (element: string | HTMLIFrameElement) => PlayerJsPlayer;
    };
    YT?: {
      Player: new (
        element: string | HTMLIFrameElement,
        options: {
          events: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: YouTubePlayerEvent) => void;
          };
        },
      ) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let bunnyPlayerScriptPromise: Promise<void> | null = null;
let youtubeIframeApiPromise: Promise<void> | null = null;

function useStableEvent<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  return useCallback((...args: TArgs) => handlerRef.current(...args), []);
}

function ensureBunnyPlayerScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.playerjs?.Player) return Promise.resolve();
  if (bunnyPlayerScriptPromise) return bunnyPlayerScriptPromise;

  bunnyPlayerScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-bunny-playerjs="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Bunny player.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";
    script.async = true;
    script.dataset.bunnyPlayerjs = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load Bunny player.")), { once: true });
    document.head.appendChild(script);
  });
  return bunnyPlayerScriptPromise;
}

function ensureYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      resolve();
    };
    const existing = document.querySelector('script[data-youtube-iframe-api="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("error", () => reject(new Error("Unable to load YouTube player.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.youtubeIframeApi = "true";
    script.addEventListener("error", () => reject(new Error("Unable to load YouTube player.")), { once: true });
    document.head.appendChild(script);
  });
  return youtubeIframeApiPromise;
}

function buildAccessLabel(access: AccessSummary | null): string {
  if (!access) return "Access pending";
  if (access.is_lifetime_access) return "Lifetime access";
  if (access.days_left !== null) {
    return access.days_left === 1 ? "1 day left" : `${access.days_left} days left`;
  }
  return "Active access";
}

function computeCourseCompletion(modules: CourseDetail["modules"]): number {
  const lessons = modules.flatMap((m) => m.lessons);
  if (!lessons.length) return 0;
  const completed = lessons.filter((l) => (l.progress_percent ?? 0) >= 100).length;
  return Number(((completed / lessons.length) * 100).toFixed(2));
}

function findLessonSlugById(course: CourseDetail, lessonId: string | null | undefined): string | null {
  if (!lessonId) return null;
  return course.modules.flatMap((m) => m.lessons).find((item) => item.id === lessonId)?.slug ?? null;
}

function completionWindowSeconds(durationSeconds: number): number {
  return Math.min(10, Math.max(1, Math.ceil(durationSeconds * 0.1)));
}

function clampPlaybackValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildBunnyEmbedUrl(videoUrl: string, lessonId: string): string {
  const [baseUrl, queryString] = videoUrl.split("?");
  const embedBase = baseUrl.includes("/embed/") ? baseUrl : baseUrl.replace("/play/", "/embed/");
  const params = new URLSearchParams(queryString ?? "");
  params.set("preload", "true");
  params.set("responsive", "true");
  params.set("compactControls", "true");
  params.set("gh", lessonId);
  return `${embedBase}?${params.toString()}`;
}

function resolveYouTubeVideoId(assetIdOrUrl: string): string {
  try {
    const parsed = new URL(assetIdOrUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.replace("/", "");
    if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.replace("/embed/", "").split("/")[0] ?? assetIdOrUrl;
    return parsed.searchParams.get("v") ?? assetIdOrUrl;
  } catch {
    return assetIdOrUrl;
  }
}

function buildYouTubeEmbedUrl(assetIdOrUrl: string, lessonId: string): string {
  const videoId = resolveYouTubeVideoId(assetIdOrUrl);
  const params = new URLSearchParams({
    color: "white",
    controls: "0",
    disablekb: "1",
    enablejsapi: "1",
    fs: "0",
    iv_load_policy: "3",
    playsinline: "1",
    rel: "0",
    gh: lessonId,
  });
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function getQuestionOptionClass(questionState: QuestionAttemptState | undefined, optionId: string): string {
  const base = "h-auto min-h-11 justify-start whitespace-normal px-4 py-3 text-left";
  if (questionState?.selectedOptionId !== optionId) return base;
  if (questionState.isSubmitting) return `${base} !bg-orange-50 !text-orange-700 !ring-orange-200`;
  if (questionState.result?.correct) return `${base} !bg-emerald-50 !text-emerald-700 !ring-emerald-200`;
  return `${base} !bg-rose-50 !text-rose-700 !ring-rose-200`;
}

function isStalePlayerPostMessageError(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
  return message.includes("Cannot read properties of null") && message.includes("postMessage");
}

function runPlayerCommand(command: () => void): void {
  try {
    command();
  } catch (cause) {
    if (!isStalePlayerPostMessageError(cause)) console.error(cause);
  }
}

// ── Markdown renderer/editor for lesson notes (no external deps) ────────────

function normalizeMarkdown(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

function sanitizeMarkdownHref(href: string): string {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
  return "#";
}

function splitMarkdownBlocks(content: string): string[] {
  const blocks: string[] = [];
  const lines = normalizeMarkdown(content).split("\n");
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    if (!buffer.length) return;
    blocks.push(buffer.join("\n"));
    buffer = [];
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      buffer.push(line);
      inFence = !inFence;
      continue;
    }
    if (!inFence && line.trim() === "") {
      flush();
      continue;
    }
    buffer.push(line);
  }

  flush();
  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const tokenPattern = /(!\[[^\]]*]\([^)]+\)|`[^`]+`|\[[^\]]+]\([^)]+\)|\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|\*[^*\n]+\*|_[^_\n]+_)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("![") && token.includes("](")) {
      nodes.push(token);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-orange-700">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const labelEnd = token.indexOf("](");
      const label = token.slice(1, labelEnd);
      const href = sanitizeMarkdownHref(token.slice(labelEnd + 2, -1));
      nodes.push(
        <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="font-medium text-orange-700 underline underline-offset-4">
          {label}
        </a>,
      );
    } else if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
      nodes.push(<strong key={key} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      nodes.push(<del key={key} className="text-slate-500">{token.slice(2, -2)}</del>);
    } else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderInlineWithBreaks(text: string): React.ReactNode[] {
  return normalizeMarkdown(text).split("\n").flatMap((line, index) => {
    const content = renderInline(line);
    return index === 0 ? content : [<br key={`br-${index}`} />, ...content];
  });
}

function parseMarkdownTable(lines: string[]) {
  const separator = lines[1]?.trim() ?? "";
  if (lines.length < 2 || !lines[0]?.includes("|") || !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator)) {
    return null;
  }
  return lines.map((line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim()),
  );
}

function SimpleMarkdown({ content, compact = false }: { content: string; compact?: boolean }) {
  const blocks = splitMarkdownBlocks(content);
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (/^```/.test(trimmed)) {
          const lines = trimmed.split("\n");
          const language = lines[0]?.replace(/^```/, "").trim();
          const code = lines.slice(1, lines.at(-1)?.trim().startsWith("```") ? -1 : undefined).join("\n");
          return (
            <pre key={bi} className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              <code>{language ? `// ${language}\n${code}` : code}</code>
            </pre>
          );
        }

        const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
        if (headingMatch && !trimmed.includes("\n")) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          if (level <= 2) {
            return (
              <h2 key={bi} className="border-b border-slate-200 pb-2 text-lg font-semibold text-slate-950">
                {renderInline(text)}
              </h2>
            );
          }
          return (
            <h3 key={bi} className="text-base font-semibold text-slate-900">
              {renderInline(text)}
            </h3>
          );
        }

        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
          return <hr key={bi} className="border-slate-200" />;
        }

        const lines = trimmed.split("\n");
        const table = parseMarkdownTable(lines);
        if (table) {
          const [head, , ...rows] = table;
          return (
            <div key={bi} className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-96 border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-900">
                  <tr>
                    {head.map((cell, index) => (
                      <th key={index} className="border-b border-slate-200 px-3 py-2 font-semibold">{renderInline(cell)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-slate-100">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-slate-700">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (lines.every((line) => /^>\s?/.test(line.trim()))) {
          const quoteContent = lines.map((line) => line.trim().replace(/^>\s?/, "")).join("\n");
          return (
            <blockquote key={bi} className="border-l-4 border-orange-300 bg-orange-50/60 py-2 pl-4 pr-3 text-sm text-slate-700">
              <SimpleMarkdown content={quoteContent} compact />
            </blockquote>
          );
        }

        const isListBlock = lines.every((l) => /^[-*+]\s+/.test(l.trim()) || /^\d+\.\s+/.test(l.trim()) || /^[-*+]\s+\[[ xX]]\s+/.test(l.trim()));

        if (isListBlock) {
          const isOrdered = /^\d+\.\s+/.test(lines[0]?.trim() ?? "");
          const Tag = isOrdered ? "ol" : "ul";
          return (
            <Tag key={bi} className={`space-y-1.5 pl-5 ${isOrdered ? "list-decimal" : "list-disc"}`}>
              {lines.map((l, li) => {
                const rawText = l.trim().replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "");
                const task = /^\[[ xX]]\s+/.exec(rawText);
                const text = rawText.replace(/^\[[ xX]]\s+/, "");
                return (
                  <li key={li} className="text-sm leading-6 text-slate-700">
                    {task ? (
                      <span className="flex items-start gap-2">
                        <input type="checkbox" checked={task[0].toLowerCase().includes("x")} readOnly className="mt-1 accent-orange-500" />
                        <span>{renderInline(text)}</span>
                      </span>
                    ) : (
                      renderInline(text)
                    )}
                  </li>
                );
              })}
            </Tag>
          );
        }

        return (
          <p key={bi} className="text-sm leading-7 text-slate-700">
            {renderInlineWithBreaks(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function MarkdownNoteEditor({
  value,
  onChange,
  onSave,
  isSaving,
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const commitValue = (nextValue: string, selectionStart?: number, selectionEnd?: number) => {
    onChange(nextValue);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      if (selectionStart !== undefined && selectionEnd !== undefined) {
        textarea.setSelectionRange(selectionStart, selectionEnd);
      }
    });
  };

  const replaceSelection = (prefix: string, suffix: string, fallback: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    const nextStart = start + prefix.length;
    commitValue(nextValue, nextStart, nextStart + selected.length);
  };

  const prefixSelectedLines = (prefix: string, ordered = false) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextLineBreak = value.indexOf("\n", end);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const selectedBlock = value.slice(lineStart, lineEnd) || "List item";
    const nextBlock = selectedBlock
      .split("\n")
      .map((line, index) => {
        const cleaned = line.replace(/^(\s*)(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/, "$1");
        return `${ordered ? `${index + 1}. ` : prefix}${cleaned}`;
      })
      .join("\n");
    commitValue(`${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`, lineStart, lineStart + nextBlock.length);
  };

  const applyAction = (action: MarkdownEditorAction) => {
    setIsPreviewing(false);
    if (action === "bold") replaceSelection("**", "**", "bold text");
    if (action === "italic") replaceSelection("*", "*", "italic text");
    if (action === "heading") prefixSelectedLines("# ");
    if (action === "unordered-list") prefixSelectedLines("- ");
    if (action === "ordered-list") prefixSelectedLines("1. ", true);
    if (action === "quote") prefixSelectedLines("> ");
    if (action === "link") replaceSelection("[", "](https://example.com)", "link text");
    if (action === "code") {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? value.length;
      const selected = value.slice(start, end);
      if (selected.includes("\n")) {
        replaceSelection("```\n", "\n```", selected);
      } else {
        replaceSelection("`", "`", selected || "code");
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-white/80">
      <div className="flex min-h-11 flex-wrap items-center gap-1 border-b border-[color:var(--border)] bg-slate-50/80 px-2 py-1.5">
        {markdownToolbarActions.map(({ action, label, Icon }) => (
          <button
            key={action}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => applyAction(action)}
            className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <Icon className="size-4" />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        <button
          type="button"
          title="Preview"
          aria-label="Preview"
          aria-pressed={isPreviewing}
          onClick={() => setIsPreviewing((current) => !current)}
          className={`inline-flex size-8 items-center justify-center rounded-md transition focus:outline-none focus:ring-2 focus:ring-orange-200 ${
            isPreviewing ? "bg-white text-orange-700" : "text-slate-600 hover:bg-white hover:text-slate-950"
          }`}
        >
          <Eye className="size-4" />
        </button>
      </div>
      {isPreviewing ? (
        <div className="min-h-36 bg-white px-4 py-3">
          {value.trim() ? <SimpleMarkdown content={value} /> : <p className="text-sm text-slate-500">Nothing to preview yet.</p>}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          placeholder="Type here... (Markdown is enabled)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-36 resize-y rounded-none border-0 bg-white px-4 py-3 font-mono text-sm leading-6 shadow-none focus-visible:ring-0"
        />
      )}
      <div className="flex items-center justify-between border-t border-[color:var(--border)] bg-white px-3 py-2">
        <span className="text-xs text-slate-500">Markdown enabled</span>
        <Button onClick={onSave} disabled={isSaving || !value.trim()} size="sm">
          {isSaving ? "Saving..." : "Save note"}
        </Button>
      </div>
    </div>
  );
}

// ── Flashcard Q/A parser ─────────────────────────────────────────────────────

type FlashcardPair = { question: string; answer: string };

function parseFlashcards(markdown: string): FlashcardPair[] {
  const pairs: FlashcardPair[] = [];
  const lines = markdown.split("\n");
  let currentQ = "";
  let currentA = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Q:")) {
      if (currentQ && currentA) pairs.push({ question: currentQ, answer: currentA });
      currentQ = trimmed.slice(2).trim();
      currentA = "";
    } else if (trimmed.startsWith("A:")) {
      currentA = trimmed.slice(2).trim();
    } else if (trimmed && currentA) {
      currentA += " " + trimmed;
    }
  }
  if (currentQ && currentA) pairs.push({ question: currentQ, answer: currentA });
  return pairs;
}

function FlashcardDisplay({
  markdown,
  lessonTitle,
  onDownload,
}: {
  markdown: string;
  lessonTitle: string;
  onDownload: () => void;
}) {
  const pairs = useMemo(() => parseFlashcards(markdown), [markdown]);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  if (!pairs.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950 p-5 text-white">
        <p className="text-xs font-semibold uppercase text-orange-300">GaugeHow flashcard</p>
        <h3 className="mt-3 text-xl font-semibold">{lessonTitle}</h3>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">{markdown}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{pairs.length} cards — click to reveal answer</p>
        <Button variant="secondary" size="sm" onClick={onDownload}>
          <Download className="size-3.5" /> PNG
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {pairs.map((pair, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setFlipped((s) => ({ ...s, [i]: !s[i] }))}
            className="group relative min-h-36 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] text-left backdrop-blur transition-colors hover:border-orange-200"
          >
            {flipped[i] ? (
              <div className="flex h-full min-h-36 flex-col justify-between bg-slate-950 p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Answer</span>
                <p className="mt-2 text-sm leading-6 text-slate-100">{pair.answer}</p>
                <span className="mt-3 text-[10px] text-slate-500">Tap to see question</span>
              </div>
            ) : (
              <div className="flex h-full min-h-36 flex-col justify-between p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Question</span>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{pair.question}</p>
                <span className="mt-3 text-[10px] text-slate-400">Tap to reveal answer</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Resources list ───────────────────────────────────────────────────────────

function ResourceItem({ resource }: { resource: LessonResource }) {
  const url = resource.external_url ?? resource.media_url;
  const icon = resource.is_downloadable ? (
    <Download className="size-4 shrink-0 text-orange-500" />
  ) : resource.external_url ? (
    <ExternalLink className="size-4 shrink-0 text-slate-400" />
  ) : (
    <Link2 className="size-4 shrink-0 text-slate-400" />
  );

  const inner = (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-4 backdrop-blur transition-colors hover:border-orange-200">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-50">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{resource.title}</p>
        {resource.description ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{resource.description}</p>
        ) : null}
        <p className="mt-0.5 text-xs font-medium text-slate-400 uppercase">{resource.resource_type}</p>
      </div>
    </div>
  );

  if (!url) return inner;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={resource.is_downloadable || undefined}>
      {inner}
    </a>
  );
}

// ── Simulation panel ─────────────────────────────────────────────────────────

function SimulationPanel({ config }: { config: { title?: string; xLabel?: string; yLabel?: string; amplitude?: number; frequency?: number; phase?: number } }) {
  const [amplitude, setAmplitude] = useState(config.amplitude ?? 1);
  const [frequency, setFrequency] = useState(config.frequency ?? 1);
  const [phase, setPhase] = useState(config.phase ?? 0);
  const points = Array.from({ length: 80 }, (_, index) => {
    const x = index / 79;
    const y = amplitude * Math.sin(x * Math.PI * 2 * frequency + (phase * Math.PI) / 180);
    return { x, y };
  });
  const maxY = Math.max(1, ...points.map((p) => Math.abs(p.y)));
  const path = points.map((p, i) => {
    const x = 40 + p.x * 520;
    const y = 160 - (p.y / maxY) * 110;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <section className="mt-10 border-t border-[color:var(--border)] pt-10">
      <h2 className="text-2xl font-extrabold text-slate-950">{config.title || "Graph simulation"}</h2>
      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-3 backdrop-blur">
          <svg viewBox="0 0 600 320" className="h-72 w-full">
            <line x1="40" y1="160" x2="560" y2="160" stroke="#cbd5e1" />
            <line x1="40" y1="36" x2="40" y2="284" stroke="#cbd5e1" />
            <path d={path} fill="none" stroke="#f97316" strokeWidth="4" />
            <text x="300" y="306" textAnchor="middle" className="fill-slate-500 text-xs">{config.xLabel || "Input"}</text>
            <text x="18" y="160" textAnchor="middle" transform="rotate(-90 18 160)" className="fill-slate-500 text-xs">{config.yLabel || "Output"}</text>
          </svg>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["Amplitude", "Frequency", "Phase"] as const).map((label) => {
            const props = label === "Amplitude"
              ? { min: 0, max: 10, step: 0.1, value: amplitude, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAmplitude(Number(e.target.value)) }
              : label === "Frequency"
              ? { min: 0, max: 10, step: 0.1, value: frequency, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFrequency(Number(e.target.value)) }
              : { min: -180, max: 180, step: 1, value: phase, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPhase(Number(e.target.value)) };
            return (
              <label key={label} className="text-sm font-medium text-slate-700">
                {label}
                <input className="mt-2 w-full" type="range" {...props} />
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Player controls ───────────────────────────────────────────────────────────

function LessonPlayerControls({
  available,
  ready,
  playing,
  currentSeconds,
  durationSeconds,
  volume,
  muted,
  checkpoints,
  onTogglePlayback,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onFullscreen,
}: {
  available: boolean;
  ready: boolean;
  playing: boolean;
  currentSeconds: number;
  durationSeconds: number;
  volume: number;
  muted: boolean;
  checkpoints: { id: string; timestamp_seconds: number }[];
  onTogglePlayback: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}) {
  const canControl = available && ready;
  const timelineMax = Math.max(0, Math.floor(durationSeconds));
  const timelineValue = clampPlaybackValue(Math.floor(currentSeconds), 0, timelineMax || 0);
  const progressPercent = timelineMax > 0 ? (timelineValue / timelineMax) * 100 : 0;

  return (
    <div className="border-t border-white/10 bg-slate-900 px-4 py-3 text-white sm:px-5">
      <div className="flex flex-col gap-3">
        <div className="relative flex h-3.5 items-center">
          <div className="pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-orange-500 transition-[width] duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {timelineMax > 0
            ? checkpoints.map((checkpoint) => (
                <span
                  key={checkpoint.id}
                  className="pointer-events-none absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 ring-1 ring-slate-900"
                  style={{ left: `${clampPlaybackValue((checkpoint.timestamp_seconds / timelineMax) * 100, 0, 100)}%` }}
                />
              ))
            : null}
          <input
            aria-label="Seek lesson video"
            className="gh-player-range relative h-3.5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canControl || timelineMax <= 0}
            max={timelineMax}
            min={0}
            onChange={(e) => onSeek(Number(e.target.value))}
            step={1}
            type="range"
            value={timelineValue}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            aria-label={playing ? "Pause" : "Play"}
            className="h-10 w-10 rounded-full bg-white text-slate-950 hover:bg-orange-100"
            disabled={!canControl}
            onClick={onTogglePlayback}
            size="icon"
            type="button"
            variant="ghost"
          >
            {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
          </Button>
          <Button
            aria-label="Rewind 10 seconds"
            className="h-9 w-9 text-slate-100 hover:bg-white/10"
            disabled={!canControl}
            onClick={() => onSeek(clampPlaybackValue(currentSeconds - 10, 0, timelineMax))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            aria-label="Forward 10 seconds"
            className="h-9 w-9 text-slate-100 hover:bg-white/10"
            disabled={!canControl}
            onClick={() => onSeek(clampPlaybackValue(currentSeconds + 10, 0, timelineMax))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RotateCw className="size-4" />
          </Button>
          <span className="min-w-28 text-sm font-medium tabular-nums text-slate-200">
            {formatSeconds(timelineValue)} / {formatSeconds(timelineMax)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              aria-label={muted ? "Unmute" : "Mute"}
              className="h-9 w-9 text-slate-100 hover:bg-white/10"
              disabled={!canControl}
              onClick={onToggleMute}
              size="icon"
              type="button"
              variant="ghost"
            >
              {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
            </Button>
            <div className="relative flex h-3.5 w-20 items-center sm:w-28">
              <div className="pointer-events-none absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${muted ? 0 : volume}%` }}
                />
              </div>
              <input
                aria-label="Volume"
                className="gh-player-range relative h-3.5 w-full disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canControl}
                max={100}
                min={0}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                step={1}
                type="range"
                value={muted ? 0 : volume}
              />
            </div>
            <Button
              aria-label="Fullscreen"
              className="h-9 w-9 text-slate-100 hover:bg-white/10"
              disabled={!available}
              onClick={onFullscreen}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Maximize2 />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function lessonTypeBadgeLabel(type: string): string {
  const map: Record<string, string> = {
    video: "Video",
    article: "Article",
    quiz: "Quiz",
    live: "Live session",
    case_study: "Case study",
    resource: "Resource",
  };
  return map[type] ?? type;
}

// ── Main page component ───────────────────────────────────────────────────────

function VideoLearningPageContent({ params }: Props) {
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const { setContext: setLearningContext } = useLearningContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const bunnyPlayerRef = useRef<{ player: PlayerJsPlayer; iframe: HTMLIFrameElement } | null>(null);
  const youtubePlayerRef = useRef<{ player: YouTubePlayer; iframe: HTMLIFrameElement } | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionLockRef = useRef<Record<string, boolean>>({});
  const syncInFlightRef = useRef(false);
  const dirtyProgressRef = useRef(false);
  const progressDraftRef = useRef({ watchedSeconds: 0, timeSpentSeconds: 0, lastPositionSeconds: 0 });
  const activeLessonSlugRef = useRef<string | null>(null);
  const lastSyncedProgressRef = useRef({ watchedSeconds: 0, lastPositionSeconds: 0, completed: false });

  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionAttemptState>>({});
  const [artifacts, setArtifacts] = useState<Partial<Record<"flashcards", LessonAIArtifact>>>({});
  const [discussionBody, setDiscussionBody] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [noteBody, setNoteBody] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playbackPositionSeconds, setPlaybackPositionSeconds] = useState(0);
  const [playbackDurationSeconds, setPlaybackDurationSeconds] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(80);
  const [playerMuted, setPlayerMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(params).then((value) => { if (!cancelled) setCourseSlug(value.slug); });
    return () => { cancelled = true; };
  }, [params]);

  const lessonSlugFromQuery = searchParams.get("lesson");

  const bunnyEmbedUrl = useMemo(() => {
    if (!lesson?.video_url || lesson.video_provider !== "bunny") return null;
    return buildBunnyEmbedUrl(lesson.video_url, lesson.id);
  }, [lesson?.id, lesson?.video_provider, lesson?.video_url]);

  const youtubeEmbedUrl = useMemo(() => {
    if (lesson?.video_provider !== "youtube") return null;
    const assetIdOrUrl = lesson.video_url ?? lesson.video_provider_asset_id;
    if (!assetIdOrUrl) return null;
    return buildYouTubeEmbedUrl(assetIdOrUrl, lesson.id);
  }, [lesson?.id, lesson?.video_provider, lesson?.video_provider_asset_id, lesson?.video_url]);

  const iframeEmbedUrl = bunnyEmbedUrl ?? youtubeEmbedUrl;
  const hasCustomPlayerControls = Boolean(iframeEmbedUrl);

  const allLessons = useMemo(() => course?.modules.flatMap((m) => m.lessons) ?? [], [course]);
  const currentLessonIndex = useMemo(
    () => allLessons.findIndex((item) => item.id === lesson?.id) + 1,
    [allLessons, lesson?.id],
  );
  const completedLessonsCount = useMemo(
    () => allLessons.filter((item) => (item.progress_percent ?? 0) >= 100).length,
    [allLessons],
  );

  const activeCheckpoint = useMemo(
    () => lesson?.questions.find((q) => q.id === activeCheckpointId) ?? null,
    [activeCheckpointId, lesson?.questions],
  );
  const activeCheckpointState = activeCheckpoint ? questionStates[activeCheckpoint.id] : undefined;

  useEffect(() => {
    const startingPosition = lesson?.progress?.last_position_seconds ?? lesson?.progress?.watched_seconds ?? 0;
    setPlayerReady(false);
    setPlayerPlaying(false);
    setPlaybackPositionSeconds(startingPosition);
    setPlaybackDurationSeconds(lesson?.duration_seconds ?? 0);
    setPlayerMuted(false);
  }, [lesson?.duration_seconds, lesson?.id, lesson?.progress?.last_position_seconds, lesson?.progress?.watched_seconds]);

  const applyProgressLocally = useStableEvent((progress: LessonProgress) => {
    setLesson((current) => (current ? { ...current, progress } : current));
    setCourse((current) => {
      if (!current || !lesson) return current;
      const modules = current.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((item) =>
          item.id === lesson.id
            ? { ...item, progress_percent: Math.max(item.progress_percent ?? 0, progress.progress_percent) }
            : item,
        ),
      }));
      const computedCourseProgress = computeCourseCompletion(modules);
      return {
        ...current,
        modules,
        access: current.access
          ? {
              ...current.access,
              current_lesson_id: lesson.id,
              progress_percent: Math.max(current.access.progress_percent ?? 0, computedCourseProgress),
            }
          : current.access,
      };
    });
  });

  const scheduleIdleSync = useStableEvent(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => { void flushProgress(); }, 60_000);
  });

  const pausePlayback = useStableEvent(() => {
    if (bunnyPlayerRef.current?.iframe.isConnected) runPlayerCommand(() => bunnyPlayerRef.current?.player.pause());
    if (youtubePlayerRef.current?.iframe.isConnected) runPlayerCommand(() => youtubePlayerRef.current?.player.pauseVideo());
    videoRef.current?.pause();
    setPlayerPlaying(false);
  });

  const resumePlayback = useStableEvent(() => {
    if (bunnyPlayerRef.current?.iframe.isConnected) runPlayerCommand(() => bunnyPlayerRef.current?.player.play());
    if (youtubePlayerRef.current?.iframe.isConnected) runPlayerCommand(() => youtubePlayerRef.current?.player.playVideo());
    void videoRef.current?.play().catch(() => undefined);
    setPlayerPlaying(true);
  });

  const flushProgress = useStableEvent(
    async ({ forceComplete = false, keepalive = false }: { forceComplete?: boolean; keepalive?: boolean } = {}) => {
      if (!courseSlug || !lesson || !accessToken || syncInFlightRef.current) return;
      const durationSeconds = lesson.duration_seconds ?? 0;
      if (durationSeconds <= 0) return;
      const watchedSeconds = Math.min(progressDraftRef.current.watchedSeconds, durationSeconds);
      const lastPositionSeconds = Math.min(progressDraftRef.current.lastPositionSeconds, durationSeconds);
      const shouldComplete = forceComplete || durationSeconds - watchedSeconds <= completionWindowSeconds(durationSeconds);
      const nothingPending =
        !dirtyProgressRef.current &&
        watchedSeconds <= lastSyncedProgressRef.current.watchedSeconds &&
        (!shouldComplete || lastSyncedProgressRef.current.completed);
      if (nothingPending) return;
      syncInFlightRef.current = true;
      try {
        const progress = await learningClient.updateLessonProgress(courseSlug, lesson.slug, accessToken, {
          watchedSeconds,
          timeSpentSeconds: Math.max(progressDraftRef.current.timeSpentSeconds, watchedSeconds),
          lastPositionSeconds,
          markCompleted: shouldComplete,
        }, { keepalive });
        lastSyncedProgressRef.current = {
          watchedSeconds: progress.watched_seconds,
          lastPositionSeconds: progress.last_position_seconds ?? lastPositionSeconds,
          completed: progress.status === "completed",
        };
        progressDraftRef.current = {
          watchedSeconds: progress.watched_seconds,
          timeSpentSeconds: progress.time_spent_seconds,
          lastPositionSeconds: progress.last_position_seconds ?? lastPositionSeconds,
        };
        dirtyProgressRef.current = false;
        applyProgressLocally(progress);
      } catch (cause) {
        if (!keepalive) setError(cause instanceof Error ? cause.message : "Unable to sync lesson progress.");
      } finally {
        syncInFlightRef.current = false;
      }
    },
  );

  const handlePlaybackSample = useStableEvent((seconds: number, duration?: number) => {
    if (!lesson) return;
    const lessonDuration = duration ?? lesson.duration_seconds ?? 0;
    if (lessonDuration <= 0) return;
    const normalizedSecond = Math.max(0, Math.min(Math.floor(seconds), lessonDuration));
    setPlaybackDurationSeconds(lessonDuration);
    setPlaybackPositionSeconds(normalizedSecond);
    progressDraftRef.current.watchedSeconds = Math.max(
      progressDraftRef.current.watchedSeconds, normalizedSecond, lesson.progress?.watched_seconds ?? 0,
    );
    progressDraftRef.current.timeSpentSeconds = Math.max(
      progressDraftRef.current.timeSpentSeconds, normalizedSecond, lesson.progress?.time_spent_seconds ?? 0,
    );
    progressDraftRef.current.lastPositionSeconds = normalizedSecond;
    dirtyProgressRef.current = true;
    scheduleIdleSync();

    const checkpoint = lesson.questions.find(
      (q) => q.timestamp_seconds <= normalizedSecond && !questionStates[q.id]?.result,
    );
    if (checkpoint && activeCheckpointId !== checkpoint.id) {
      pausePlayback();
      setActiveCheckpointId(checkpoint.id);
    }

    if (lessonDuration - normalizedSecond <= completionWindowSeconds(lessonDuration) && !lastSyncedProgressRef.current.completed) {
      void flushProgress({ forceComplete: true });
    }
  });

  const togglePlayback = useStableEvent(() => {
    if (playerPlaying) { pausePlayback(); return; }
    resumePlayback();
  });

  const seekPlayback = useStableEvent((seconds: number) => {
    const duration = playbackDurationSeconds || lesson?.duration_seconds || 0;
    const nextSecond = duration > 0 ? clampPlaybackValue(seconds, 0, duration) : Math.max(0, seconds);
    setPlaybackPositionSeconds(nextSecond);
    if (bunnyPlayerRef.current?.iframe.isConnected) runPlayerCommand(() => bunnyPlayerRef.current?.player.setCurrentTime?.(nextSecond));
    if (youtubePlayerRef.current?.iframe.isConnected) runPlayerCommand(() => youtubePlayerRef.current?.player.seekTo(nextSecond, true));
    if (videoRef.current) videoRef.current.currentTime = nextSecond;
    handlePlaybackSample(nextSecond, duration);
  });

  const changePlayerVolume = useStableEvent((volume: number) => {
    const nextVolume = Math.round(clampPlaybackValue(volume, 0, 100));
    setPlayerVolume(nextVolume);
    setPlayerMuted(nextVolume === 0);
    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => bunnyPlayerRef.current?.player.setVolume?.(nextVolume));
      runPlayerCommand(() => nextVolume === 0 ? bunnyPlayerRef.current?.player.mute?.() : bunnyPlayerRef.current?.player.unmute?.());
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => youtubePlayerRef.current?.player.setVolume(nextVolume));
      runPlayerCommand(() => nextVolume === 0 ? youtubePlayerRef.current?.player.mute() : youtubePlayerRef.current?.player.unMute());
    }
    if (videoRef.current) { videoRef.current.volume = nextVolume / 100; videoRef.current.muted = nextVolume === 0; }
  });

  const togglePlayerMute = useStableEvent(() => {
    const nextMuted = !playerMuted;
    setPlayerMuted(nextMuted);
    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => nextMuted ? bunnyPlayerRef.current?.player.mute?.() : bunnyPlayerRef.current?.player.unmute?.());
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => nextMuted ? youtubePlayerRef.current?.player.mute() : youtubePlayerRef.current?.player.unMute());
    }
    if (videoRef.current) videoRef.current.muted = nextMuted;
  });

  const requestPlayerFullscreen = useStableEvent(() => {
    const element = playerShellRef.current;
    if (!element) return;
    if (document.fullscreenElement) { void document.exitFullscreen().catch(() => undefined); return; }
    void element.requestFullscreen().catch(() => undefined);
  });

  useEffect(() => {
    if (!courseSlug || isAuthLoading) return;
    const activeCourseSlug = courseSlug;
    let cancelled = false;

    async function loadLearningState() {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const cacheOptions = { viewerKey: user?.id ?? null };
        const cachedCourse = learningCache.getCourseDetail(activeCourseSlug, cacheOptions);
        const coursePayload = cachedCourse ?? (await learningClient.getCourseDetail(activeCourseSlug, { token: accessToken }));
        if (!cachedCourse) learningCache.setCourseDetail(coursePayload, cacheOptions);

        const defaultLessonSlug =
          lessonSlugFromQuery ??
          findLessonSlugById(coursePayload, coursePayload.access?.current_lesson_id) ??
          coursePayload.modules.flatMap((m) => m.lessons).find((item) => item.accessible)?.slug ??
          coursePayload.modules[0]?.lessons[0]?.slug;

        if (!defaultLessonSlug) throw new Error("No accessible lesson found for this course.");

        if (activeLessonSlugRef.current && activeLessonSlugRef.current !== defaultLessonSlug) await flushProgress();

        const lessonPayload = await learningClient.getLessonDetail(activeCourseSlug, defaultLessonSlug, {
          token: accessToken,
          includeTranscript: false,
        });
        if (!cancelled) {
          setCourse(coursePayload);
          setLesson(lessonPayload);
          setIsDiscussionLoading(true);
          setQuestionStates({});
          questionLockRef.current = {};
          setArtifacts({});
          setReplyDrafts({});
          setDiscussionBody("");
          setActiveCheckpointId(null);
        }
        void learningClient
          .listLessonDiscussions(activeCourseSlug, defaultLessonSlug, accessToken)
          .then((payload) => {
            if (cancelled) return;
            setLesson((current) =>
              current && current.slug === defaultLessonSlug ? { ...current, discussions: payload.items } : current,
            );
          })
          .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load discussions."); })
          .finally(() => { if (!cancelled) setIsDiscussionLoading(false); });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load lesson.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLearningState();
    return () => { cancelled = true; };
  }, [accessToken, courseSlug, flushProgress, isAuthLoading, lessonSlugFromQuery, user?.id]);

  useEffect(() => {
    if (!course) return;
    learningCache.setCourseDetail(course, { viewerKey: user?.id ?? null });
  }, [course, user?.id]);

  useEffect(() => {
    if (!lesson || !course) { setLearningContext(null); return; }
    setLearningContext({
      course_id: course.id,
      course_title: course.title,
      course_slug: course.slug,
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      lesson_slug: lesson.slug,
      lesson_summary: lesson.summary ?? course.short_description ?? null,
      playback_seconds: lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? null,
      page_path: pathname,
    });
    return () => setLearningContext(null);
  }, [course, lesson, pathname, setLearningContext]);

  useEffect(() => {
    if (!lesson) return;
    activeLessonSlugRef.current = lesson.slug;
    const watchedSeconds = lesson.progress?.watched_seconds ?? 0;
    const lastPositionSeconds = lesson.progress?.last_position_seconds ?? watchedSeconds;
    progressDraftRef.current = { watchedSeconds, timeSpentSeconds: lesson.progress?.time_spent_seconds ?? watchedSeconds, lastPositionSeconds };
    lastSyncedProgressRef.current = { watchedSeconds, lastPositionSeconds, completed: lesson.progress?.status === "completed" };
    dirtyProgressRef.current = false;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  }, [lesson]);

  useEffect(() => {
    if (!lesson) return;
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") void flushProgress({ keepalive: true }); };
    const onPageHide = () => { void flushProgress({ keepalive: true }); };
    const onUserActivity = () => { scheduleIdleSync(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("mousemove", onUserActivity);
    window.addEventListener("keydown", onUserActivity);
    window.addEventListener("scroll", onUserActivity, { passive: true });
    window.addEventListener("touchstart", onUserActivity, { passive: true });
    scheduleIdleSync();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("mousemove", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("scroll", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [flushProgress, lesson, scheduleIdleSync]);

  useEffect(() => {
    if (!bunnyEmbedUrl || !iframeRef.current || !lesson) return;
    let cancelled = false;
    let player: PlayerJsPlayer | null = null;
    const iframeElement = iframeRef.current;
    const onReady = () => {
      if (cancelled || !iframeElement.isConnected) return;
      setPlayerReady(true);
      const startAt = lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? 0;
      if (startAt > 0) { runPlayerCommand(() => player?.setCurrentTime?.(startAt)); setPlaybackPositionSeconds(startAt); }
      runPlayerCommand(() => player?.getDuration?.((v) => setPlaybackDurationSeconds(v)));
      runPlayerCommand(() => player?.getVolume?.((v) => setPlayerVolume(v)));
      runPlayerCommand(() => player?.getMuted?.((v) => setPlayerMuted(v)));
      runPlayerCommand(() => player?.getPaused?.((v) => setPlayerPlaying(!v)));
    };
    const onTimeUpdate = (data?: PlayerJsEventData) => {
      if (cancelled || !iframeElement.isConnected) return;
      handlePlaybackSample(data?.seconds ?? 0, data?.duration ?? lesson.duration_seconds ?? 0);
    };
    const onPause = () => { if (cancelled || !iframeElement.isConnected) return; setPlayerPlaying(false); scheduleIdleSync(); };
    const onPlay = () => { if (cancelled || !iframeElement.isConnected) return; setPlayerPlaying(true); scheduleIdleSync(); };
    const onEnded = () => {
      if (cancelled || !iframeElement.isConnected) return;
      setPlayerPlaying(false);
      runPlayerCommand(() => player?.getDuration?.((v) => setPlaybackPositionSeconds(v || lesson.duration_seconds || 0)));
      void flushProgress({ forceComplete: true });
    };
    void ensureBunnyPlayerScript().then(() => {
      if (cancelled || !window.playerjs?.Player) return;
      player = new window.playerjs.Player(iframeElement);
      bunnyPlayerRef.current = { player, iframe: iframeElement };
      player.on("ready", onReady);
      player.on("timeupdate", onTimeUpdate);
      player.on("pause", onPause);
      player.on("play", onPlay);
      player.on("ended", onEnded);
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to initialize Bunny player."); });
    return () => {
      cancelled = true;
      if (bunnyPlayerRef.current?.player === player) bunnyPlayerRef.current = null;
      runPlayerCommand(() => player?.off?.("ready", onReady));
      runPlayerCommand(() => player?.off?.("timeupdate", onTimeUpdate));
      runPlayerCommand(() => player?.off?.("pause", onPause));
      runPlayerCommand(() => player?.off?.("play", onPlay));
      runPlayerCommand(() => player?.off?.("ended", onEnded));
      runPlayerCommand(() => player?.destroy?.());
    };
  }, [bunnyEmbedUrl, flushProgress, handlePlaybackSample, lesson, scheduleIdleSync]);

  useEffect(() => {
    if (!youtubeEmbedUrl || !iframeRef.current || !lesson) return;
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    const iframeElement = iframeRef.current;
    const clearProgressTimer = () => { if (progressTimer) { clearInterval(progressTimer); progressTimer = null; } };
    const sampleProgress = () => {
      if (!player || cancelled || !iframeElement.isConnected) return;
      handlePlaybackSample(player.getCurrentTime(), player.getDuration() || lesson.duration_seconds || 0);
    };
    const startProgressTimer = () => { clearProgressTimer(); progressTimer = setInterval(sampleProgress, 1000); };
    void ensureYouTubeIframeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      player = new window.YT.Player(iframeElement, {
        events: {
          onReady: (event) => {
            setPlayerReady(true);
            setPlaybackDurationSeconds(event.target.getDuration() || lesson.duration_seconds || 0);
            setPlayerVolume(event.target.getVolume());
            setPlayerMuted(event.target.isMuted());
            const startAt = lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? 0;
            if (startAt > 0) { event.target.seekTo(startAt, true); setPlaybackPositionSeconds(startAt); }
          },
          onStateChange: (event) => {
            if (cancelled || !iframeElement.isConnected) return;
            if (event.data === window.YT?.PlayerState.PLAYING) { setPlayerPlaying(true); scheduleIdleSync(); startProgressTimer(); }
            if (event.data === window.YT?.PlayerState.PAUSED) { setPlayerPlaying(false); sampleProgress(); clearProgressTimer(); scheduleIdleSync(); }
            if (event.data === window.YT?.PlayerState.ENDED) {
              setPlayerPlaying(false); sampleProgress(); clearProgressTimer();
              setPlaybackPositionSeconds(player?.getDuration() || lesson.duration_seconds || 0);
              void flushProgress({ forceComplete: true });
            }
          },
        },
      });
      youtubePlayerRef.current = { player, iframe: iframeElement };
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to initialize YouTube player."); });
    return () => {
      cancelled = true;
      clearProgressTimer();
      if (youtubePlayerRef.current?.player === player) youtubePlayerRef.current = null;
      runPlayerCommand(() => player?.destroy());
    };
  }, [flushProgress, handlePlaybackSample, lesson, scheduleIdleSync, youtubeEmbedUrl]);

  async function handleQuestionAttempt(questionId: string, optionId?: string, answerText?: string) {
    if (!courseSlug || !lesson || !accessToken) return;
    if (!optionId && !answerText?.trim()) return;
    if (questionLockRef.current[questionId]) return;
    questionLockRef.current[questionId] = true;
    setQuestionStates((current) => ({
      ...current,
      [questionId]: { selectedOptionId: optionId ?? null, isLocked: true, isSubmitting: true, result: null, error: null },
    }));
    try {
      const result = await learningClient.submitQuestionAttempt(courseSlug, lesson.slug, questionId, accessToken, { selectedOptionId: optionId, answerText });
      setQuestionStates((current) => ({
        ...current,
        [questionId]: { selectedOptionId: optionId ?? null, isLocked: true, isSubmitting: false, result: { correct: result.is_correct, explanation: result.explanation }, error: null },
      }));
      setAnswerDrafts((current) => ({ ...current, [questionId]: "" }));
    } catch (cause) {
      questionLockRef.current[questionId] = false;
      setQuestionStates((current) => ({
        ...current,
        [questionId]: { selectedOptionId: optionId ?? null, isLocked: false, isSubmitting: false, result: null, error: cause instanceof Error ? cause.message : "Unable to submit answer." },
      }));
    }
  }

  async function handleLessonLike() {
    if (!courseSlug || !lesson || !accessToken) return;
    const nextLiked = !lesson.liked_by_me;
    try {
      const response = await learningClient.setLessonLike(courseSlug, lesson.slug, accessToken, nextLiked);
      setLesson((current) => current ? { ...current, liked_by_me: response.liked, like_count: response.like_count } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update like.");
    }
  }

  async function handleCreateNote() {
    if (!courseSlug || !lesson || !accessToken || !noteBody.trim()) return;
    setSubmitting("note");
    try {
      const note = await learningClient.createLessonNote(courseSlug, lesson.slug, accessToken, {
        timestampSeconds: Math.floor(progressDraftRef.current.lastPositionSeconds),
        body: noteBody,
      });
      setLesson((current) => (current ? { ...current, notes: [...current.notes, note] } : current));
      setNoteBody("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save note.");
    } finally {
      setSubmitting(null);
    }
  }

  function downloadFlashcardPng() {
    if (!lesson?.flashcard_markdown) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(0, 0, canvas.width, 12);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px sans-serif";
    ctx.fillText(lesson.title, 64, 92);
    ctx.font = "400 30px sans-serif";
    const words = lesson.flashcard_markdown.replace(/[#*_`>-]/g, "").split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = `${line} ${word}`.trim();
      if (ctx.measureText(next).width > 1060) { lines.push(line); line = word; } else { line = next; }
    }
    if (line) lines.push(line);
    lines.slice(0, 12).forEach((item, i) => ctx.fillText(item, 64, 160 + i * 42));
    const link = document.createElement("a");
    link.download = `${lesson.slug}-flashcard.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleArtifact(type: "flashcards") {
    if (!courseSlug || !lesson || !accessToken) return;
    setSubmitting(type);
    try {
      const artifact = await learningClient.generateArtifact(courseSlug, lesson.slug, accessToken, type);
      setArtifacts((current) => ({ ...current, [type]: artifact }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate artifact.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCreateDiscussion() {
    if (!courseSlug || !lesson || !accessToken) return;
    setSubmitting("discussion");
    try {
      const thread = await learningClient.createDiscussion(courseSlug, lesson.slug, accessToken, { body: discussionBody });
      setLesson((current) => current ? { ...current, discussions: [thread, ...current.discussions] } : current);
      setDiscussionBody("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create discussion.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleReply(thread: DiscussionThread) {
    if (!accessToken) return;
    const body = replyDrafts[thread.id]?.trim();
    if (!body) return;
    setSubmitting(`reply:${thread.id}`);
    try {
      const comment = await learningClient.addDiscussionComment(thread.id, accessToken, { body });
      setLesson((current) =>
        current
          ? { ...current, discussions: current.discussions.map((item) =>
              item.id === thread.id ? { ...item, comments: [...item.comments, comment as DiscussionComment] } : item,
            )}
          : current,
      );
      setReplyDrafts((current) => ({ ...current, [thread.id]: "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add reply.");
    } finally {
      setSubmitting(null);
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────

  if (loading || !course || !lesson) {
    return (
      <AppShell>
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
          <section className="space-y-5">
            <Card>
              <CardContent className="space-y-5 p-6">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/5 rounded-md" />
                  <Skeleton className="h-10 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                </div>
              </CardContent>
            </Card>
            <Card><CardContent className="p-4"><Skeleton className="aspect-video rounded-xl" /></CardContent></Card>
            <Card>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <Skeleton className="h-4 w-4/6 rounded-md" />
              </CardContent>
            </Card>
          </section>
          <aside className="space-y-5">
            <Card>
              <CardContent className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </CardContent>
            </Card>
          </aside>
        </div>
      </AppShell>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
        {/* ── Main content column ── */}
        <section className="space-y-0">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Header */}
          <div className="pb-6">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-orange-600">
              <Link href={`/courses/${course.slug}`} className="hover:text-orange-700">
                {course.title}
              </Link>
              {currentLessonIndex > 0 ? (
                <>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-500">Lesson {currentLessonIndex} of {allLessons.length}</span>
                </>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="orange">{buildAccessLabel(course.access)}</Badge>
              <Badge variant="default">{lessonTypeBadgeLabel(lesson.lesson_type)}</Badge>
              {lesson.progress?.status === "completed" ? <Badge variant="green">Completed</Badge> : null}
              {lesson.duration_seconds ? (
                <Badge variant="default">
                  <Clock3 className="size-3.5" />
                  {formatSeconds(lesson.duration_seconds)}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold text-slate-950 sm:text-4xl">{lesson.title}</h1>
            {(lesson.summary ?? course.short_description) ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                {lesson.summary ?? course.short_description}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleLessonLike()}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  lesson.liked_by_me
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-[color:var(--border)] bg-white/70 text-slate-600 hover:border-orange-200 hover:text-orange-700"
                }`}
                aria-pressed={lesson.liked_by_me}
              >
                <ThumbsUp className="size-3.5" />
                <span>{lesson.like_count > 0 ? lesson.like_count : "Like"}</span>
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleArtifact("flashcards")}
                disabled={submitting === "flashcards"}
              >
                <Sparkles className="size-4" />
                {submitting === "flashcards" ? "Generating..." : "AI flashcards"}
              </Button>
            </div>
          </div>

          {/* Video player */}
          <div
            ref={playerShellRef}
            className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-slate-950"
          >
            <div className="relative aspect-video p-4 text-white sm:p-5">
              {iframeEmbedUrl ? (
                <iframe
                  key={iframeEmbedUrl}
                  ref={iframeRef}
                  src={iframeEmbedUrl}
                  title={lesson.title}
                  className="h-full w-full rounded-lg border-0 bg-black"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : lesson.video_url && lesson.video_provider !== "youtube" ? (
                <video
                  ref={videoRef}
                  className="h-full w-full rounded-lg object-cover"
                  controls
                  disablePictureInPicture
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    const startAt = lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? 0;
                    if (startAt > 0) e.currentTarget.currentTime = startAt;
                  }}
                  onTimeUpdate={(e) => handlePlaybackSample(e.currentTarget.currentTime, e.currentTarget.duration || lesson.duration_seconds || 0)}
                  onPause={() => scheduleIdleSync()}
                  onPlay={() => scheduleIdleSync()}
                  onEnded={() => { void flushProgress({ forceComplete: true }); }}
                >
                  <source src={lesson.video_url} />
                </video>
              ) : (
                <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="dark">Lesson player</Badge>
                    <Badge variant="orange">{lesson.video_provider ?? "Video pending"}</Badge>
                  </div>
                  <div className="flex flex-col items-start gap-4">
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/10 text-orange-400">
                      <Play className="ml-0.5 size-6 fill-current" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold">{lesson.title}</h2>
                      <p className="mt-2 text-slate-300">{course.title}</p>
                      <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                        Add the lesson video URL or Bunny player URL to enable playback here.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-black/20 px-3 py-2 text-xs text-slate-300">
                    Provider asset: {lesson.video_provider_asset_id ?? "not configured"}
                  </div>
                </div>
              )}

              {hasCustomPlayerControls && !playerReady ? (
                <div className="absolute inset-4 flex items-center justify-center rounded-lg bg-slate-950/50 sm:inset-5">
                  <Loader2 className="size-8 animate-spin text-white/80" />
                </div>
              ) : null}

              {hasCustomPlayerControls && playerReady && !playerPlaying ? (
                <button
                  type="button"
                  aria-label="Play lesson video"
                  onClick={togglePlayback}
                  className="group absolute inset-4 flex items-center justify-center rounded-lg bg-slate-950/20 transition-colors hover:bg-slate-950/35 sm:inset-5"
                >
                  <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-xl transition-transform group-hover:scale-110">
                    <Play className="ml-1 size-7 fill-current" />
                  </span>
                </button>
              ) : null}
            </div>

            {iframeEmbedUrl ? (
              <LessonPlayerControls
                available={hasCustomPlayerControls}
                checkpoints={lesson.questions.map((question) => ({
                  id: question.id,
                  timestamp_seconds: question.timestamp_seconds,
                }))}
                currentSeconds={playbackPositionSeconds}
                durationSeconds={playbackDurationSeconds}
                muted={playerMuted}
                onFullscreen={requestPlayerFullscreen}
                onSeek={seekPlayback}
                onToggleMute={togglePlayerMute}
                onTogglePlayback={togglePlayback}
                onVolumeChange={changePlayerVolume}
                playing={playerPlaying}
                ready={playerReady}
                volume={playerVolume}
              />
            ) : null}

            {/* Checkpoint overlay */}
            {activeCheckpoint && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/78 p-4">
                <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="orange">Checkpoint at {formatSeconds(activeCheckpoint.timestamp_seconds)}</Badge>
                    <Badge variant="dark">
                      {activeCheckpointState?.isSubmitting ? "Checking…" : activeCheckpointState?.result ? "Answered" : "Answer to continue"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{activeCheckpoint.prompt}</p>
                  {activeCheckpoint.question_type === "fill_blank" ? (
                    <div className="mt-4 flex gap-2">
                      <Input
                        value={answerDrafts[activeCheckpoint.id] ?? ""}
                        onChange={(e) => setAnswerDrafts((s) => ({ ...s, [activeCheckpoint.id]: e.target.value }))}
                        placeholder="Type your answer"
                        disabled={Boolean(activeCheckpointState?.result)}
                      />
                      <Button
                        onClick={() => void handleQuestionAttempt(activeCheckpoint.id, undefined, answerDrafts[activeCheckpoint.id])}
                        disabled={activeCheckpointState?.isSubmitting || Boolean(activeCheckpointState?.result)}
                      >
                        Submit
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-2">
                      {activeCheckpoint.options.map((option) => (
                        <Button
                          key={option.id}
                          variant="secondary"
                          className={getQuestionOptionClass(activeCheckpointState, option.id)}
                          onClick={() => void handleQuestionAttempt(activeCheckpoint.id, option.id)}
                          disabled={activeCheckpointState?.isLocked || activeCheckpointState?.isSubmitting || Boolean(activeCheckpointState?.result)}
                        >
                          <span className="flex-1">{option.option_text}</span>
                          {activeCheckpointState?.selectedOptionId === option.id ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                              {activeCheckpointState.isSubmitting ? "Locked" : activeCheckpointState.result?.correct ? "Correct" : "Chosen"}
                            </span>
                          ) : null}
                        </Button>
                      ))}
                    </div>
                  )}
                  {activeCheckpointState?.error ? (
                    <div className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{activeCheckpointState.error}</div>
                  ) : null}
                  {activeCheckpointState?.result ? (
                    <>
                      <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${activeCheckpointState.result.correct ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
                        {activeCheckpointState.result.correct ? "Correct." : "Incorrect."}
                        {activeCheckpointState.result.explanation ? ` ${activeCheckpointState.result.explanation}` : ""}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => { setActiveCheckpointId(null); resumePlayback(); }}>Continue lesson</Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* ── Flashcard section ─── */}
          {lesson.flashcard_markdown ? (
            <section className="mt-10 border-t border-[color:var(--border)] pt-10">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-orange-500" />
                <h2 className="text-2xl font-extrabold text-slate-950">Flashcards</h2>
              </div>
              <div className="mt-5">
                <FlashcardDisplay
                  markdown={lesson.flashcard_markdown}
                  lessonTitle={lesson.title}
                  onDownload={downloadFlashcardPng}
                />
              </div>
            </section>
          ) : null}

          {/* ── Resources ─── */}
          {lesson.resources.length > 0 ? (
            <section className="mt-10 border-t border-[color:var(--border)] pt-10">
              <div className="flex items-center gap-2">
                <Download className="size-5 text-orange-500" />
                <h2 className="text-2xl font-extrabold text-slate-950">Resources</h2>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {lesson.resources.map((resource) => (
                  <ResourceItem key={resource.id} resource={resource} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Simulation panel */}
          {lesson.has_simulation ? <SimulationPanel config={lesson.simulation_config} /> : null}

          {/* Jupyter notebook */}
          {lesson.has_jupyter_notebook ? (
            <section className="mt-10 border-t border-[color:var(--border)] pt-10">
              <h2 className="text-2xl font-extrabold text-slate-950">Notebook</h2>
              <div className="mt-5 space-y-3">
                {lesson.jupyter_config.instructions ? (
                  <p className="text-sm leading-6 text-slate-600">{lesson.jupyter_config.instructions}</p>
                ) : null}
                {lesson.jupyter_config.embedUrl ? (
                  <iframe
                    src={lesson.jupyter_config.embedUrl}
                    title={`${lesson.title} notebook`}
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    className="h-[520px] w-full rounded-2xl border border-[color:var(--border)]"
                  />
                ) : (
                  <p className="text-sm text-slate-500">Notebook embed is not configured yet.</p>
                )}
              </div>
            </section>
          ) : null}

          {/* ── AI-generated flashcards ─── */}
          {artifacts.flashcards ? (
            <section className="mt-10 border-t border-[color:var(--border)] pt-10">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-orange-500" />
                <h2 className="text-2xl font-extrabold text-slate-950">AI flashcards</h2>
              </div>
              <div className="mt-5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-4 backdrop-blur">
                <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {artifacts.flashcards.content_markdown}
                </pre>
              </div>
            </section>
          ) : null}

          {/* ── Lesson checks (quiz questions) ─── */}
          {lesson.questions.length > 0 ? (
            <section className="mt-10 border-t border-[color:var(--border)] pt-10">
              <h2 className="text-2xl font-extrabold text-slate-950">Lesson checks</h2>
              <p className="mt-2 text-sm text-slate-500">{lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""}</p>
              <div className="mt-5 space-y-4">
                {lesson.questions.map((question) => {
                  const questionState = questionStates[question.id];
                  const result = questionState?.result;
                  return (
                    <div key={question.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-5 backdrop-blur">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-950">{question.prompt}</p>
                        <Badge variant="blue" className="shrink-0">{formatSeconds(question.timestamp_seconds)}</Badge>
                      </div>
                      {question.question_type === "fill_blank" ? (
                        <div className="mt-3 flex gap-2">
                          <Input
                            value={answerDrafts[question.id] ?? ""}
                            onChange={(e) => setAnswerDrafts((s) => ({ ...s, [question.id]: e.target.value }))}
                            placeholder="Type your answer"
                            disabled={Boolean(questionState?.result)}
                          />
                          <Button
                            variant="secondary"
                            onClick={() => void handleQuestionAttempt(question.id, undefined, answerDrafts[question.id])}
                            disabled={questionState?.isSubmitting || Boolean(questionState?.result)}
                          >
                            Submit
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {question.options.map((option) => (
                            <Button
                              key={option.id}
                              variant="secondary"
                              className={getQuestionOptionClass(questionState, option.id)}
                              onClick={() => void handleQuestionAttempt(question.id, option.id)}
                              disabled={questionState?.isLocked || questionState?.isSubmitting || Boolean(questionState?.result)}
                            >
                              <span className="flex-1">{option.option_text}</span>
                              {questionState?.selectedOptionId === option.id ? (
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                  {questionState.isSubmitting ? "Locked" : questionState.result?.correct ? "Correct" : "Chosen"}
                                </span>
                              ) : null}
                            </Button>
                          ))}
                        </div>
                      )}
                      {questionState?.isSubmitting ? (
                        <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">Checking…</div>
                      ) : null}
                      {questionState?.error ? (
                        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{questionState.error}</div>
                      ) : null}
                      {result ? (
                        <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${result.correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {result.correct ? "Correct." : "Incorrect."}
                          {result.explanation ? ` ${result.explanation}` : ""}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* FAQs */}
          {course.faqs.length > 0 ? (
            <section className="mt-10 border-t border-[color:var(--border)] pt-10">
              <h2 className="text-2xl font-extrabold text-slate-950">FAQs</h2>
              <div className="mt-5 divide-y divide-[color:var(--border)] rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-glass)] backdrop-blur">
                {course.faqs.map((faq, i) => (
                  <details key={`${faq.question}-${i}`} className="group px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-950">
                      <span>{faq.question}</span>
                      <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {/* Discussion */}
          <section className="mt-10 border-t border-[color:var(--border)] pt-10">
            <h2 className="text-2xl font-extrabold text-slate-950">Discussion</h2>
            <div className="mt-5 space-y-3">
              <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-white/70 p-3 backdrop-blur">
                <Textarea
                  placeholder="Ask a question or share a thought…"
                  value={discussionBody}
                  onChange={(e) => setDiscussionBody(e.target.value)}
                  className="min-h-20 border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
                />
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleCreateDiscussion()}
                    disabled={submitting === "discussion" || !discussionBody.trim()}
                  >
                    {submitting === "discussion" ? "Posting…" : "Comment"}
                  </Button>
                </div>
              </div>

              {isDiscussionLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-14 rounded-lg" />
                </div>
              ) : lesson.discussions.length > 0 ? (
                lesson.discussions.map((thread) => (
                  <div key={thread.id} className="rounded-lg border border-[color:var(--border)] bg-white/65 px-3 py-3 backdrop-blur">
                    {thread.title ? (
                      <p className="mb-1 text-[11px] font-semibold uppercase text-orange-500">{thread.title}</p>
                    ) : null}
                    <p className="text-xs font-semibold text-slate-950">{thread.user_display_name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{thread.body}</p>
                    {thread.comments.length > 0 ? (
                      <div className="mt-3 space-y-2 border-l border-[color:var(--border)] pl-3">
                        {thread.comments.map((comment) => (
                          <div key={comment.id} className="rounded-md bg-[color:var(--surface-primary)] px-3 py-2">
                            <p className="text-xs font-medium text-slate-950">
                              {comment.user_display_name}
                              {comment.is_instructor_response ? (
                                <span className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">Instructor</span>
                              ) : null}
                              {comment.is_solution ? (
                                <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Solution</span>
                              ) : null}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-slate-600">{comment.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Reply…"
                        value={replyDrafts[thread.id] ?? ""}
                        onChange={(e) => setReplyDrafts((s) => ({ ...s, [thread.id]: e.target.value }))}
                        className="h-9"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleReply(thread)}
                        disabled={submitting === `reply:${thread.id}`}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No comments yet. Start the discussion!</p>
              )}
            </div>
          </section>
        </section>

        {/* ── Sidebar ── */}
        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          {/* Your notes */}
          <div className="border-t border-[color:var(--border)] pt-5">
            <h2 className="text-lg font-extrabold text-slate-950">Your notes</h2>
            <div className="mt-4 space-y-3">
              <MarkdownNoteEditor
                value={noteBody}
                onChange={setNoteBody}
                onSave={() => void handleCreateNote()}
                isSaving={submitting === "note"}
              />
              {lesson.notes.length > 0 ? (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {lesson.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-3 backdrop-blur">
                      <Badge variant="blue">{formatSeconds(note.timestamp_seconds)}</Badge>
                      <div className="mt-2">
                        <SimpleMarkdown content={note.body} compact />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No notes yet - add one while watching.</p>
              )}
            </div>
          </div>

          {/* Module-grouped lesson list */}
          <div className="border-t border-[color:var(--border)] pt-5">
            <h2 className="text-lg font-extrabold text-slate-950">Course content</h2>
            <p className="mt-1 text-sm text-slate-500">{completedLessonsCount} / {allLessons.length} lessons done</p>
            <div className="mt-5 space-y-5">
              {course.modules.map((module) => (
                <div key={module.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <ChevronRight className="size-3.5 shrink-0 text-orange-500" />
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{module.title}</p>
                  </div>
                  <div className="space-y-1.5">
                    {module.lessons.map((item) => {
                      const isActive = item.id === lesson.id;
                      const isDone = (item.progress_percent ?? 0) >= 100;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 backdrop-blur transition-colors ${
                            isActive
                              ? "border-orange-300 bg-orange-50"
                              : "border-[color:var(--border)] bg-[color:var(--surface-glass)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {item.accessible ? (
                              <Link
                                href={`/courses/${course.slug}/learn?lesson=${item.slug}`}
                                className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                                  isActive
                                    ? "bg-orange-500 text-white"
                                    : isDone
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-600"
                                }`}
                              >
                                {isDone ? <CheckCircle2 className="size-4" /> : <Play className="size-3.5" />}
                              </Link>
                            ) : (
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Lock className="size-3.5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${isActive ? "text-orange-700" : "text-slate-950"}`}>
                                {item.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {item.duration_seconds ? formatSeconds(item.duration_seconds) : "TBD"}
                              </p>
                            </div>
                          </div>
                          {(item.progress_percent ?? 0) > 0 ? (
                            <div className="mt-2">
                              <Progress value={item.progress_percent ?? 0} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress card */}
          <div className="border-t border-[color:var(--border)] pt-5">
            <h2 className="text-lg font-extrabold text-slate-950">Your progress</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Course completion</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                  {Math.round(course.access?.progress_percent ?? 0)}%
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {completedLessonsCount} of {allLessons.length} lessons completed
                </p>
              </div>
              <Progress value={course.access?.progress_percent ?? 0} />
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--border)] px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Access</p>
                <p className="text-sm font-semibold text-slate-950">{buildAccessLabel(course.access)}</p>
              </div>
              <Button asChild className="w-full" variant="secondary">
                <Link href={`/courses/${course.slug}`}>Course overview</Link>
              </Button>
            </div>
          </div>

        </aside>
      </div>
    </AppShell>
  );
}

export default function VideoLearningPage(props: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <VideoLearningPageContent {...props} />
    </Suspense>
  );
}
