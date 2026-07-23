"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowClockwise, ArrowCounterClockwise, ArrowSquareOut, CaretDown, CaretLeft, CaretRight, ChatCircleText, CheckCircle, CircleNotch, Code, CornersOut, DownloadSimple, Eye, LinkSimple, ListBullets, ListNumbers, Lock, NotePencil, Pause, Play, Question, Quotes, Sparkle, SpeakerHigh, SpeakerSlash, TextB, TextH, TextItalic, ThumbsUp, X } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLearningContext } from "@/components/providers/learning-context-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  type CourseDetail,
  type DiscussionComment,
  type DiscussionThread,
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

type LessonPanel = "flashcard" | "notes" | "discussion" | "faqs" | "resources";

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
  { action: "heading", label: "Heading", Icon: TextH },
  { action: "bold", label: "Bold", Icon: TextB },
  { action: "italic", label: "Italic", Icon: TextItalic },
  { action: "unordered-list", label: "Bulleted list", Icon: ListBullets },
  { action: "ordered-list", label: "Numbered list", Icon: ListNumbers },
  { action: "quote", label: "Quote", Icon: Quotes },
  { action: "code", label: "Code", Icon: Code },
  { action: "link", label: "Link", Icon: LinkSimple },
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
  setPlaybackRate?: (value: number) => void;
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
  setPlaybackRate: (rate: number) => void;
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
  const base = "h-auto min-h-11 justify-start whitespace-normal break-words px-4 py-3 text-left";
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
            <pre key={bi} className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
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
            <h3 key={bi} className="text-base font-semibold text-slate-950">
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
    <div className="overflow-hidden rounded-lg surface-secondary">
      <div className="flex min-h-11 flex-wrap items-center gap-1 px-2 py-1.5">
        {markdownToolbarActions.map(({ action, label, Icon }) => (
          <button
            key={action}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => applyAction(action)}
            className="inline-flex size-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-[color:var(--surface-primary)] hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
            isPreviewing ? "surface-primary text-orange-700" : "text-slate-600 hover:bg-[color:var(--surface-primary)] hover:text-slate-950"
          }`}
        >
          <Eye className="size-4" />
        </button>
      </div>
      {isPreviewing ? (
        <div className="min-h-36 surface-primary px-4 py-3">
          {value.trim() ? <SimpleMarkdown content={value} /> : <p className="text-sm text-slate-500">Nothing to preview yet.</p>}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          placeholder="Type here... (Markdown is enabled)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-36 resize-y rounded-none border-0 surface-primary px-4 py-3 font-mono text-sm leading-6 shadow-none focus-visible:ring-0"
        />
      )}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-slate-500">Markdown enabled</span>
        <Button onClick={onSave} disabled={isSaving || !value.trim()} size="sm">
          {isSaving ? "Saving..." : "Save note"}
        </Button>
      </div>
    </div>
  );
}

// ── Flashcard (lecture summary card) ─────────────────────────────────────────

const FLASHCARD_WORDMARK = "/GaugeHow logo transperent white.png";
const FLASHCARD_MARK = "/64 logo.png";

function parseFlashcardBullets(markdown: string): string[] {
  const bullets = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("• "))
    .map((line) => line.slice(2).trim());
  if (bullets.length) return bullets;
  return markdown.split("\n").map((line) => line.trim()).filter(Boolean);
}

function FlashcardCard({
  bullets,
  lessonTitle,
  courseTitle,
  onDownload,
  downloading,
  onClose,
}: {
  bullets: string[];
  lessonTitle: string;
  courseTitle: string;
  onDownload: () => void;
  downloading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
      <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FLASHCARD_WORDMARK} alt="GaugeHow" className="h-5 w-auto sm:h-7" />
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FLASHCARD_MARK} alt="" className="size-8 rounded-lg sm:size-10 sm:rounded-xl" />
            <button
              type="button"
              aria-label="Close flashcard"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="size-4" weight="bold" />
            </button>
          </div>
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-400 sm:mt-7">
          Lesson flashcard
        </p>
        <h3
          className="mt-1.5 text-lg font-extrabold leading-snug sm:text-2xl"
          style={{ color: "#f8fafc", textWrap: "balance" }}
        >
          {lessonTitle}
        </h3>
        <p className="mt-1 text-sm text-slate-400">{courseTitle}</p>
        <ul className="mt-5 space-y-3 sm:mt-6">
          {bullets.map((bullet, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-orange-400" />
              <span className="text-sm leading-6 text-slate-200">{bullet}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 sm:mt-7 sm:pt-5">
          <span className="text-xs font-medium tracking-wide text-slate-500">gaugehow.ai</span>
          <Button size="sm" onClick={onDownload} disabled={downloading}>
            <DownloadSimple className="size-4" />
            {downloading ? "Preparing..." : "Download PNG"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function loadFlashcardImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function renderFlashcardPng(input: {
  lessonTitle: string;
  courseTitle: string;
  bullets: string[];
  fileName: string;
}): Promise<void> {
  const width = 1200;
  const margin = 72;
  const contentWidth = width - margin * 2 - 40;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // measure first
  ctx.font = "700 44px system-ui, sans-serif";
  const titleLines = wrapCanvasText(ctx, input.lessonTitle, width - margin * 2);
  ctx.font = "400 27px system-ui, sans-serif";
  const bulletLines = input.bullets.map((bullet) => wrapCanvasText(ctx, bullet, contentWidth));
  const bulletsHeight = bulletLines.reduce((sum, lines) => sum + lines.length * 38 + 18, 0);
  const headerHeight = 200 + titleLines.length * 52;
  const height = Math.max(675, headerHeight + bulletsHeight + 150);

  canvas.width = width;
  canvas.height = height;

  // ground
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#0b1120");
  bg.addColorStop(1, "#111a2e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const bar = ctx.createLinearGradient(0, 0, width, 0);
  bar.addColorStop(0, "#f97316");
  bar.addColorStop(0.5, "#fbbf24");
  bar.addColorStop(1, "#f97316");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, width, 10);

  // brand row
  try {
    const [wordmark, mark] = await Promise.all([
      loadFlashcardImage(FLASHCARD_WORDMARK),
      loadFlashcardImage(FLASHCARD_MARK),
    ]);
    const wordmarkHeight = 42;
    const wordmarkWidth = (wordmark.width / wordmark.height) * wordmarkHeight;
    ctx.drawImage(wordmark, margin, 52, wordmarkWidth, wordmarkHeight);
    const markSize = 64;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(width - margin - markSize, 42, markSize, markSize, 14);
    ctx.clip();
    ctx.drawImage(mark, width - margin - markSize, 42, markSize, markSize);
    ctx.restore();
  } catch {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "800 40px system-ui, sans-serif";
    ctx.fillText("GAUGEHOW", margin, 88);
  }

  // eyebrow + title + course
  ctx.fillStyle = "#fb923c";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillText("L E S S O N   F L A S H C A R D", margin, 160);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 44px system-ui, sans-serif";
  titleLines.forEach((line, index) => ctx.fillText(line, margin, 214 + index * 52));
  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 26px system-ui, sans-serif";
  ctx.fillText(input.courseTitle, margin, 214 + titleLines.length * 52 + 4);

  // bullets
  let y = headerHeight + 60;
  for (const lines of bulletLines) {
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.arc(margin + 8, y - 9, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "400 27px system-ui, sans-serif";
    for (const line of lines) {
      ctx.fillText(line, margin + 40, y);
      y += 38;
    }
    y += 18;
  }

  // footer
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, height - 74);
  ctx.lineTo(width - margin, height - 74);
  ctx.stroke();
  ctx.fillStyle = "#64748b";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText("gaugehow.ai", margin, height - 34);
  ctx.textAlign = "right";
  ctx.fillText("Master the mechanics of tomorrow", width - margin, height - 34);
  ctx.textAlign = "left";

  const link = document.createElement("a");
  link.download = input.fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ── Resources list ───────────────────────────────────────────────────────────

function ResourceItem({ resource }: { resource: LessonResource }) {
  const url = resource.external_url ?? resource.media_url;
  const icon = resource.is_downloadable ? (
    <DownloadSimple className="size-4 shrink-0 text-orange-500" />
  ) : resource.external_url ? (
    <ArrowSquareOut className="size-4 shrink-0 text-slate-400" />
  ) : (
    <LinkSimple className="size-4 shrink-0 text-slate-400" />
  );

  const inner = (
    <div className="flex items-center gap-3 rounded-2xl surface-secondary p-4 transition-colors hover:bg-orange-100">
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
        <div className="rounded-2xl surface-secondary p-3">
          <svg viewBox="0 0 600 320" className="h-72 w-full">
            <line x1="40" y1="160" x2="560" y2="160" stroke="#d8c7b0" />
            <line x1="40" y1="36" x2="40" y2="284" stroke="#d8c7b0" />
            <path d={path} fill="none" stroke="#fcbc6c" strokeWidth="4" />
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

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

function LessonPlayerControls({
  available,
  ready,
  playing,
  currentSeconds,
  durationSeconds,
  volume,
  muted,
  playbackRate,
  checkpoints,
  onTogglePlayback,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onPlaybackRateChange,
  onFullscreen,
}: {
  available: boolean;
  ready: boolean;
  playing: boolean;
  currentSeconds: number;
  durationSeconds: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  checkpoints: { id: string; timestamp_seconds: number }[];
  onTogglePlayback: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onFullscreen: () => void;
}) {
  const canControl = available && ready;
  const timelineMax = Math.max(0, Math.floor(durationSeconds));
  const timelineValue = clampPlaybackValue(Math.floor(currentSeconds), 0, timelineMax || 0);
  const progressPercent = timelineMax > 0 ? (timelineValue / timelineMax) * 100 : 0;

  return (
    <div className="bg-slate-950 px-3 pb-2.5 pt-1 text-white sm:px-4">
      <div className="flex flex-col gap-1.5">
        <div className="group/timeline relative flex h-3 items-center">
          <div className="pointer-events-none absolute inset-x-0 h-[3px] overflow-hidden rounded-full bg-white/15 transition-[height] duration-150 group-hover/timeline:h-1.5">
            <div
              className="h-full rounded-full bg-orange-500 transition-[width] duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {timelineMax > 0
            ? checkpoints.map((checkpoint) => (
                <span
                  key={checkpoint.id}
                  className="pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
                  style={{ left: `${clampPlaybackValue((checkpoint.timestamp_seconds / timelineMax) * 100, 0, 100)}%` }}
                />
              ))
            : null}
          <input
            aria-label="Seek lesson video"
            className="gh-player-range relative h-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canControl || timelineMax <= 0}
            max={timelineMax}
            min={0}
            onChange={(e) => onSeek(Number(e.target.value))}
            step={1}
            type="range"
            value={timelineValue}
          />
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          <Button
            aria-label={playing ? "Pause" : "Play"}
            className="h-9 w-9 text-white hover:bg-white/10"
            disabled={!canControl}
            onClick={onTogglePlayback}
            size="icon"
            type="button"
            variant="ghost"
          >
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </Button>
          <Button
            aria-label="Rewind 10 seconds"
            className="h-9 w-9 text-slate-300 hover:bg-white/10 hover:text-white"
            disabled={!canControl}
            onClick={() => onSeek(clampPlaybackValue(currentSeconds - 10, 0, timelineMax))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowCounterClockwise className="size-4" />
          </Button>
          <Button
            aria-label="Forward 10 seconds"
            className="h-9 w-9 text-slate-300 hover:bg-white/10 hover:text-white"
            disabled={!canControl}
            onClick={() => onSeek(clampPlaybackValue(currentSeconds + 10, 0, timelineMax))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowClockwise className="size-4" />
          </Button>
          <span className="ml-1.5 text-xs font-medium tabular-nums text-slate-400">
            {formatSeconds(timelineValue)}
            <span className="mx-1 text-slate-600">/</span>
            {formatSeconds(timelineMax)}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Playback speed"
                  className="h-9 min-w-11 px-2 text-xs font-semibold tabular-nums text-slate-300 hover:bg-white/10 hover:text-white"
                  disabled={!canControl}
                  type="button"
                  variant="ghost"
                >
                  {playbackRate === 1 ? "1×" : `${playbackRate}×`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-24 border-white/10 bg-slate-900 text-white"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    className={
                      rate === playbackRate
                        ? "justify-between font-semibold text-orange-400 focus:bg-white/10 focus:text-orange-400"
                        : "justify-between text-slate-200 focus:bg-white/10 focus:text-white"
                    }
                    onSelect={() => onPlaybackRateChange(rate)}
                  >
                    {rate === 1 ? "Normal" : `${rate}×`}
                    {rate === playbackRate ? <CheckCircle className="size-3.5" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              aria-label={muted ? "Unmute" : "Mute"}
              className="h-9 w-9 text-slate-300 hover:bg-white/10 hover:text-white"
              disabled={!canControl}
              onClick={onToggleMute}
              size="icon"
              type="button"
              variant="ghost"
            >
              {muted || volume === 0 ? <SpeakerSlash /> : <SpeakerHigh />}
            </Button>
            <div className="relative hidden h-3 w-20 items-center sm:flex">
              <div className="pointer-events-none absolute inset-x-0 h-[3px] overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white/80"
                  style={{ width: `${muted ? 0 : volume}%` }}
                />
              </div>
              <input
                aria-label="Volume"
                className="gh-player-range relative h-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
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
              className="h-9 w-9 text-slate-300 hover:bg-white/10 hover:text-white"
              disabled={!available}
              onClick={onFullscreen}
              size="icon"
              type="button"
              variant="ghost"
            >
              <CornersOut />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

function VideoLearningPageContent({ params }: Props) {
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const { setContext: setLearningContext } = useLearningContext();
  const router = useRouter();
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
  const [activePanel, setActivePanel] = useState<LessonPanel | null>(null);
  const [flashcardDownloading, setFlashcardDownloading] = useState(false);
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);

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
  const previousLesson = currentLessonIndex > 1 ? allLessons[currentLessonIndex - 2] ?? null : null;
  const nextLesson = currentLessonIndex >= 1 ? allLessons[currentLessonIndex] ?? null : null;

  const activeCheckpoint = useMemo(
    () => lesson?.questions.find((q) => q.id === activeCheckpointId) ?? null,
    [activeCheckpointId, lesson?.questions],
  );
  const activeCheckpointState = activeCheckpoint ? questionStates[activeCheckpoint.id] : undefined;

  const isEnrolled = course?.access?.is_enrolled ?? false;
  const isLessonCompleted =
    lesson?.progress?.status === "completed" || (lesson?.progress?.progress_percent ?? 0) >= 100;
  const answeredQuestionsCount = useMemo(
    () => (lesson?.questions ?? []).filter((q) => questionStates[q.id]?.result).length,
    [lesson?.questions, questionStates],
  );
  const togglePanel = (panel: LessonPanel) =>
    setActivePanel((current) => (current === panel ? null : panel));

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
      // Progress is tracked per enrollment; access-only viewers watch untracked.
      if (!course?.access?.is_enrolled) return;
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

  const changePlaybackRate = useStableEvent((rate: number) => {
    setPlaybackRate(rate);
    playbackRateRef.current = rate;
    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => bunnyPlayerRef.current?.player.setPlaybackRate?.(rate));
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => youtubePlayerRef.current?.player.setPlaybackRate(rate));
    }
    if (videoRef.current) videoRef.current.playbackRate = rate;
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

        if (!coursePayload.access?.has_access) {
          const overviewParams = new URLSearchParams({
            lesson: defaultLessonSlug,
            source: "mentor",
          });
          router.replace(`/courses/${activeCourseSlug}?${overviewParams.toString()}`);
          return;
        }

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
          setActivePanel(null);
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
  }, [accessToken, courseSlug, flushProgress, isAuthLoading, lessonSlugFromQuery, router, user?.id]);

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
      if (playbackRateRef.current !== 1) {
        runPlayerCommand(() => player?.setPlaybackRate?.(playbackRateRef.current));
      }
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
            if (playbackRateRef.current !== 1) event.target.setPlaybackRate(playbackRateRef.current);
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

  async function handleEnroll() {
    if (!courseSlug || !accessToken || submitting === "enroll") return;
    setSubmitting("enroll");
    try {
      const response = await learningClient.enroll(courseSlug, accessToken);
      setCourse((current) => (current ? { ...current, access: response.access } : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to enroll in this course.");
    } finally {
      setSubmitting(null);
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

  async function handleFlashcardDownload() {
    if (!lesson?.flashcard_markdown || flashcardDownloading) return;
    setFlashcardDownloading(true);
    try {
      await renderFlashcardPng({
        lessonTitle: lesson.title,
        courseTitle: course?.title ?? "GaugeHow course",
        bullets: parseFlashcardBullets(lesson.flashcard_markdown),
        fileName: `${lesson.slug}-flashcard.png`,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to download flashcard.");
    } finally {
      setFlashcardDownloading(false);
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
      <AppShell fullWidth>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
          <section className="space-y-4">
            <Skeleton className="h-4 w-2/5 rounded-md" />
            <Skeleton className="aspect-video rounded-3xl" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-7 w-3/5 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          </section>
          <aside className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </aside>
        </div>
      </AppShell>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell fullWidth>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        {/* ── Main content column ── */}
        <section className="space-y-0">
          {error && (
            <div className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Top strip: breadcrumb + course progress (Coursera-style) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-orange-600">
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
            {isEnrolled ? (
              <div className="flex items-center gap-2">
                <div className="w-32 sm:w-44">
                  <Progress value={course.access?.progress_percent ?? 0} />
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-600">
                  {completedLessonsCount}/{allLessons.length}
                </span>
              </div>
            ) : (
              <Button size="sm" onClick={() => void handleEnroll()} disabled={submitting === "enroll"}>
                {submitting === "enroll" ? "Enrolling…" : "Enroll to track progress"}
              </Button>
            )}
          </div>

          {/* Video player */}
          <div
            ref={playerShellRef}
            className="relative overflow-hidden bg-slate-950"
          >
            <div className="relative aspect-video text-white">
              {iframeEmbedUrl ? (
                <iframe
                  key={iframeEmbedUrl}
                  ref={iframeRef}
                  src={iframeEmbedUrl}
                  title={lesson.title}
                  className="h-full w-full border-0 bg-black"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : lesson.video_url && lesson.video_provider !== "youtube" ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
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
                <div className="flex h-full flex-col justify-between bg-gradient-to-br from-white/[0.06] to-transparent p-6">
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
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50">
                  <CircleNotch className="size-8 animate-spin text-white/80" />
                </div>
              ) : null}

              {hasCustomPlayerControls && playerReady && !playerPlaying ? (
                <button
                  type="button"
                  aria-label="Play lesson video"
                  onClick={togglePlayback}
                  className="group absolute inset-0 flex items-center justify-center bg-slate-950/20 transition-colors hover:bg-slate-950/35"
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
                onPlaybackRateChange={changePlaybackRate}
                onSeek={seekPlayback}
                onToggleMute={togglePlayerMute}
                onTogglePlayback={togglePlayback}
                onVolumeChange={changePlayerVolume}
                playbackRate={playbackRate}
                playing={playerPlaying}
                ready={playerReady}
                volume={playerVolume}
              />
            ) : null}

            {/* Checkpoint overlay */}
            {activeCheckpoint && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/78 p-4">
                <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-slate-950/95 p-5 shadow-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="orange">Checkpoint at {formatSeconds(activeCheckpoint.timestamp_seconds)}</Badge>
                    <Badge variant="dark">
                      {activeCheckpointState?.isSubmitting ? "Checking…" : activeCheckpointState?.result ? "Answered" : "Answer to continue"}
                    </Badge>
                  </div>
                  <p className="mt-4 break-words text-lg font-semibold leading-snug text-white">{activeCheckpoint.prompt}</p>
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
                          <span className="min-w-0 flex-1 break-words">{option.option_text}</span>
                          {activeCheckpointState?.selectedOptionId === option.id ? (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em]">
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

          {/* Title below the video, Coursera-style */}
          <div className="mt-4">
            <h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">{lesson.title}</h1>
            {(lesson.summary ?? course.short_description) ? (
              <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-600">
                {lesson.summary ?? course.short_description}
              </p>
            ) : null}
          </div>

          {/* ── Action row: like + on-demand panels ─── */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void handleLessonLike()}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
                lesson.liked_by_me
                  ? "bg-orange-50 text-orange-700"
                  : "surface-secondary text-slate-600 hover:text-orange-700"
              }`}
              aria-pressed={lesson.liked_by_me}
            >
              <ThumbsUp className="size-3.5" />
              <span>{lesson.like_count > 0 ? lesson.like_count : "Like"}</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ...(lesson.flashcard_markdown ? [{ panel: "flashcard" as const, label: "Flashcard", Icon: Sparkle }] : []),
                  { panel: "notes" as const, label: "Notes", Icon: NotePencil },
                  { panel: "discussion" as const, label: "Discussion", Icon: ChatCircleText },
                  ...(course.faqs.length > 0 ? [{ panel: "faqs" as const, label: "FAQs", Icon: Question }] : []),
                  ...(lesson.resources.length > 0 ? [{ panel: "resources" as const, label: "Resources", Icon: DownloadSimple }] : []),
                ]
              ).map(({ panel, label, Icon }) => (
                <Button
                  key={panel}
                  variant="secondary"
                  size="sm"
                  aria-expanded={activePanel === panel}
                  onClick={() => togglePanel(panel)}
                  className={activePanel === panel ? "!bg-orange-50 !text-orange-700" : ""}
                >
                  <Icon className="size-4" />
                  {label}
                  <CaretDown className={`size-3 transition-transform ${activePanel === panel ? "rotate-180" : ""}`} />
                </Button>
              ))}
            </div>
          </div>

          {/* ── On-demand panel (opens below the action row) ─── */}
          {activePanel === "flashcard" && lesson.flashcard_markdown ? (
            <div className="mt-3">
              <FlashcardCard
                bullets={parseFlashcardBullets(lesson.flashcard_markdown)}
                lessonTitle={lesson.title}
                courseTitle={course?.title ?? "GaugeHow course"}
                onDownload={() => void handleFlashcardDownload()}
                downloading={flashcardDownloading}
                onClose={() => setActivePanel(null)}
              />
            </div>
          ) : null}

          {activePanel === "notes" ? (
            <div className="mt-3 space-y-3 rounded-2xl border border-[color:var(--border)] p-4">
              <MarkdownNoteEditor
                value={noteBody}
                onChange={setNoteBody}
                onSave={() => void handleCreateNote()}
                isSaving={submitting === "note"}
              />
              {lesson.notes.length > 0 ? (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {lesson.notes.map((note) => (
                    <div key={note.id} className="rounded-lg surface-secondary p-3">
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
          ) : null}

          {activePanel === "discussion" ? (
            <div className="mt-3 space-y-3 rounded-2xl border border-[color:var(--border)] p-4">
              <div className="space-y-2 rounded-lg surface-secondary p-3">
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
                  <div key={thread.id} className="rounded-lg surface-secondary px-3 py-3">
                    {thread.title ? (
                      <p className="mb-1 text-[11px] font-semibold uppercase text-orange-500">{thread.title}</p>
                    ) : null}
                    <p className="text-xs font-semibold text-slate-950">{thread.user_display_name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{thread.body}</p>
                    {thread.comments.length > 0 ? (
                      <div className="mt-3 space-y-2 border-l border-[color:var(--border)] pl-3">
                        {thread.comments.map((comment) => (
                          <div key={comment.id} className="rounded-md surface-primary px-3 py-2">
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
          ) : null}

          {activePanel === "faqs" && course.faqs.length > 0 ? (
            <div className="mt-3 divide-y divide-[color:var(--border)] rounded-2xl border border-[color:var(--border)]">
              {course.faqs.map((faq, i) => (
                <details key={`${faq.question}-${i}`} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-950">
                    <span>{faq.question}</span>
                    <CaretRight className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          ) : null}

          {activePanel === "resources" && lesson.resources.length > 0 ? (
            <div className="mt-3 grid gap-3 rounded-2xl border border-[color:var(--border)] p-4 sm:grid-cols-2">
              {lesson.resources.map((resource) => (
                <ResourceItem key={resource.id} resource={resource} />
              ))}
            </div>
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
                    className="h-[520px] w-full rounded-2xl"
                  />
                ) : (
                  <p className="text-sm text-slate-500">Notebook embed is not configured yet.</p>
                )}
              </div>
            </section>
          ) : null}

          {/* ── Lesson checks (in-video quiz review, shown after completion) ─── */}
          {lesson.questions.length > 0 && isLessonCompleted ? (
            <section className="mt-10 border-t border-[color:var(--border)] pt-10">
              <details className="group rounded-2xl surface-secondary">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-950">Lesson checks</h2>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {answeredQuestionsCount} / {lesson.questions.length} answered during the video — expand to review or retry
                      </p>
                    </div>
                  </div>
                  <CaretRight className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-4 px-5 pb-5">
                {lesson.questions.map((question) => {
                  const questionState = questionStates[question.id];
                  const result = questionState?.result;
                  return (
                    <div key={question.id} className="rounded-2xl surface-primary p-5">
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
                              <span className="min-w-0 flex-1 break-words">{option.option_text}</span>
                              {questionState?.selectedOptionId === option.id ? (
                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em]">
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
              </details>
            </section>
          ) : null}

        </section>

        {/* ── Sidebar: fixed course content panel (Coursera-style) ── */}
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          {/* Module-grouped lesson list */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-950">Course content</h2>
              <span className="text-xs font-medium tabular-nums text-slate-500">
                {completedLessonsCount}/{allLessons.length} done
              </span>
            </div>

            {/* Prev / next lesson */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {previousLesson?.accessible ? (
                <Button asChild variant="secondary" size="sm" className="justify-start">
                  <Link href={`/courses/${course.slug}/learn?lesson=${previousLesson.slug}`} title={previousLesson.title}>
                    <CaretLeft className="size-3.5" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="secondary" size="sm" className="justify-start" disabled>
                  <CaretLeft className="size-3.5" />
                  Previous
                </Button>
              )}
              {nextLesson?.accessible ? (
                <Button asChild size="sm" className="justify-end">
                  <Link href={`/courses/${course.slug}/learn?lesson=${nextLesson.slug}`} title={nextLesson.title}>
                    Next
                    <CaretRight className="size-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="justify-end" disabled>
                  Next
                  <CaretRight className="size-3.5" />
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-1">
              {course.modules.map((module) => {
                const containsActiveLesson = module.lessons.some((item) => item.id === lesson.id);
                const moduleDoneCount = module.lessons.filter((item) => (item.progress_percent ?? 0) >= 100).length;
                return (
                  <details key={module.id} open={containsActiveLesson} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[color:var(--surface-secondary)]">
                      <CaretRight className="size-3 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wide text-slate-600">
                        {module.title}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                        {moduleDoneCount}/{module.lessons.length}
                      </span>
                    </summary>
                    <div className="mb-1 ml-3 space-y-0.5 border-l border-[color:var(--border)] pl-2">
                      {module.lessons.map((item) => {
                        const isActive = item.id === lesson.id;
                        const isDone = (item.progress_percent ?? 0) >= 100;
                        const statusIcon = isDone ? (
                          <CheckCircle className="size-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <Play className={`size-3 shrink-0 ${isActive ? "text-orange-500" : "text-slate-400"}`} />
                        );
                        if (!item.accessible) {
                          return (
                            <div key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-400">
                              <Lock className="size-3 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{item.title}</span>
                            </div>
                          );
                        }
                        return (
                          <Link
                            key={item.id}
                            href={`/courses/${course.slug}/learn?lesson=${item.slug}`}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                              isActive
                                ? "bg-orange-50 font-semibold text-orange-700"
                                : "text-slate-700 hover:bg-[color:var(--surface-secondary)] hover:text-slate-950"
                            }`}
                          >
                            {statusIcon}
                            <span className="min-w-0 flex-1 truncate">{item.title}</span>
                            {item.duration_seconds ? (
                              <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                                {formatSeconds(item.duration_seconds)}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
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
