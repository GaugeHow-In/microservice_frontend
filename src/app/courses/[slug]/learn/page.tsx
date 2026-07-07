"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Clock3,
  Download,
  FileText,
  Maximize2,
  MessageCircle,
  Pause,
  Play,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.playerjs?.Player) {
    return Promise.resolve();
  }
  if (bunnyPlayerScriptPromise) {
    return bunnyPlayerScriptPromise;
  }

  bunnyPlayerScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-bunny-playerjs="true"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Bunny player.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";
    script.async = true;
    script.dataset.bunnyPlayerjs = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Unable to load Bunny player.")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return bunnyPlayerScriptPromise;
}

function ensureYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.YT?.Player) {
    return Promise.resolve();
  }
  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      resolve();
    };

    const existing = document.querySelector(
      'script[data-youtube-iframe-api="true"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("error", () => reject(new Error("Unable to load YouTube player.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.youtubeIframeApi = "true";
    script.addEventListener("error", () => reject(new Error("Unable to load YouTube player.")), {
      once: true,
    });
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
  const lessons = modules.flatMap((module) => module.lessons);
  if (!lessons.length) return 0;
  const completed = lessons.filter((lesson) => (lesson.progress_percent ?? 0) >= 100).length;
  return Number(((completed / lessons.length) * 100).toFixed(2));
}

function findLessonSlugById(course: CourseDetail, lessonId: string | null | undefined): string | null {
  if (!lessonId) return null;
  return course.modules
    .flatMap((module) => module.lessons)
    .find((item) => item.id === lessonId)?.slug ?? null;
}

function completionWindowSeconds(durationSeconds: number): number {
  return Math.min(10, Math.max(1, Math.ceil(durationSeconds * 0.1)));
}

function clampPlaybackValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildBunnyEmbedUrl(videoUrl: string, lessonId: string): string {
  const [baseUrl, queryString] = videoUrl.split("?");
  const embedBase = baseUrl.includes("/embed/")
    ? baseUrl
    : baseUrl.replace("/play/", "/embed/");
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
    if (host === "youtu.be") {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.replace("/embed/", "").split("/")[0] ?? assetIdOrUrl;
    }
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
  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function getQuestionOptionClass(
  questionState: QuestionAttemptState | undefined,
  optionId: string,
): string {
  const baseClassName =
    "h-auto min-h-11 justify-start whitespace-normal px-4 py-3 text-left";

  if (questionState?.selectedOptionId !== optionId) {
    return baseClassName;
  }

  if (questionState.isSubmitting) {
    return `${baseClassName} !bg-orange-50 !text-orange-700 !ring-orange-200`;
  }

  if (questionState.result?.correct) {
    return `${baseClassName} !bg-emerald-50 !text-emerald-700 !ring-emerald-200`;
  }

  return `${baseClassName} !bg-rose-50 !text-rose-700 !ring-rose-200`;
}

function isStalePlayerPostMessageError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";

  return message.includes("Cannot read properties of null") && message.includes("postMessage");
}

function runPlayerCommand(command: () => void): void {
  try {
    command();
  } catch (cause) {
    if (!isStalePlayerPostMessageError(cause)) {
      console.error(cause);
    }
  }
}

function SimulationPanel({
  config,
}: {
  config: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    amplitude?: number;
    frequency?: number;
    phase?: number;
  };
}) {
  const [amplitude, setAmplitude] = useState(config.amplitude ?? 1);
  const [frequency, setFrequency] = useState(config.frequency ?? 1);
  const [phase, setPhase] = useState(config.phase ?? 0);
  const points = Array.from({ length: 80 }, (_, index) => {
    const x = index / 79;
    const y = amplitude * Math.sin(x * Math.PI * 2 * frequency + (phase * Math.PI) / 180);
    return { x, y };
  });
  const maxY = Math.max(1, ...points.map((point) => Math.abs(point.y)));
  const path = points
    .map((point, index) => {
      const x = 40 + point.x * 520;
      const y = 160 - (point.y / maxY) * 110;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title || "Graph simulation"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <svg viewBox="0 0 600 320" className="h-72 w-full">
            <line x1="40" y1="160" x2="560" y2="160" stroke="#cbd5e1" />
            <line x1="40" y1="36" x2="40" y2="284" stroke="#cbd5e1" />
            <path d={path} fill="none" stroke="#f97316" strokeWidth="4" />
            <text x="300" y="306" textAnchor="middle" className="fill-slate-500 text-xs">
              {config.xLabel || "Input"}
            </text>
            <text x="18" y="160" textAnchor="middle" transform="rotate(-90 18 160)" className="fill-slate-500 text-xs">
              {config.yLabel || "Output"}
            </text>
          </svg>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Amplitude
            <input className="mt-2 w-full" type="range" min="0" max="10" step="0.1" value={amplitude} onChange={(event) => setAmplitude(Number(event.target.value))} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Frequency
            <input className="mt-2 w-full" type="range" min="0" max="10" step="0.1" value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Phase
            <input className="mt-2 w-full" type="range" min="-180" max="180" step="1" value={phase} onChange={(event) => setPhase(Number(event.target.value))} />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function LessonPlayerControls({
  available,
  ready,
  playing,
  currentSeconds,
  durationSeconds,
  volume,
  muted,
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
  onTogglePlayback: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}) {
  const canControl = available && ready;
  const timelineMax = Math.max(0, Math.floor(durationSeconds));
  const timelineValue = clampPlaybackValue(Math.floor(currentSeconds), 0, timelineMax || 0);
  const timeLabel = `${formatSeconds(timelineValue)} / ${formatSeconds(timelineMax)}`;

  return (
    <div className="border-t border-white/10 bg-slate-900 px-4 py-3 text-white sm:px-5">
      <div className="flex flex-col gap-3">
        <input
          aria-label="Seek lesson video"
          className="h-2 w-full accent-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canControl || timelineMax <= 0}
          max={timelineMax}
          min={0}
          onChange={(event) => onSeek(Number(event.target.value))}
          step={1}
          type="range"
          value={timelineValue}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            aria-label={playing ? "Pause lesson video" : "Play lesson video"}
            className="h-10 w-10 rounded-full bg-white text-slate-950 hover:bg-orange-100"
            disabled={!canControl}
            onClick={onTogglePlayback}
            size="icon"
            type="button"
            variant="ghost"
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <span className="min-w-28 text-sm font-medium tabular-nums text-slate-200">
            {timeLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              aria-label={muted ? "Unmute lesson video" : "Mute lesson video"}
              className="h-9 w-9 text-slate-100 hover:bg-white/10"
              disabled={!canControl}
              onClick={onToggleMute}
              size="icon"
              type="button"
              variant="ghost"
            >
              {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
            </Button>
            <input
              aria-label="Lesson video volume"
              className="h-2 w-20 accent-orange-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-28"
              disabled={!canControl}
              max={100}
              min={0}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              step={1}
              type="range"
              value={muted ? 0 : volume}
            />
            <Button
              aria-label="Fullscreen lesson player"
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
  const progressDraftRef = useRef({
    watchedSeconds: 0,
    timeSpentSeconds: 0,
    lastPositionSeconds: 0,
  });
  const activeLessonSlugRef = useRef<string | null>(null);
  const lastSyncedProgressRef = useRef({
    watchedSeconds: 0,
    lastPositionSeconds: 0,
    completed: false,
  });

  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionAttemptState>>({});
  const [artifacts, setArtifacts] = useState<
    Partial<Record<"lesson_notes" | "flashcards", LessonAIArtifact>>
  >({});
  const [discussionBody, setDiscussionBody] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [noteBody, setNoteBody] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(false);
  const [hasRequestedTranscript, setHasRequestedTranscript] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playbackPositionSeconds, setPlaybackPositionSeconds] = useState(0);
  const [playbackDurationSeconds, setPlaybackDurationSeconds] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(80);
  const [playerMuted, setPlayerMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(params).then((value) => {
      if (!cancelled) setCourseSlug(value.slug);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  const lessonSlugFromQuery = searchParams.get("lesson");

  const bunnyEmbedUrl = useMemo(() => {
    if (!lesson?.video_url || lesson.video_provider !== "bunny") {
      return null;
    }
    return buildBunnyEmbedUrl(lesson.video_url, lesson.id);
  }, [lesson?.id, lesson?.video_provider, lesson?.video_url]);

  const youtubeEmbedUrl = useMemo(() => {
    if (lesson?.video_provider !== "youtube") {
      return null;
    }
    const assetIdOrUrl = lesson.video_url ?? lesson.video_provider_asset_id;
    if (!assetIdOrUrl) {
      return null;
    }
    return buildYouTubeEmbedUrl(assetIdOrUrl, lesson.id);
  }, [lesson?.id, lesson?.video_provider, lesson?.video_provider_asset_id, lesson?.video_url]);

  const iframeEmbedUrl = bunnyEmbedUrl ?? youtubeEmbedUrl;
  const hasCustomPlayerControls = Boolean(iframeEmbedUrl);

  const allLessons = useMemo(() => course?.modules.flatMap((module) => module.lessons) ?? [], [course]);
  const currentLessonIndex = useMemo(
    () => allLessons.findIndex((item) => item.id === lesson?.id) + 1,
    [allLessons, lesson?.id],
  );
  const completedLessonsCount = useMemo(
    () => allLessons.filter((item) => (item.progress_percent ?? 0) >= 100).length,
    [allLessons],
  );

  const activeCheckpoint = useMemo(
    () => lesson?.questions.find((question) => question.id === activeCheckpointId) ?? null,
    [activeCheckpointId, lesson?.questions],
  );
  const activeCheckpointState = activeCheckpoint ? questionStates[activeCheckpoint.id] : undefined;

  useEffect(() => {
    const startingPosition =
      lesson?.progress?.last_position_seconds ?? lesson?.progress?.watched_seconds ?? 0;
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
      const modules = current.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((item) =>
          item.id === lesson.id
            ? {
                ...item,
                progress_percent: Math.max(item.progress_percent ?? 0, progress.progress_percent),
              }
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
              progress_percent: Math.max(
                current.access.progress_percent ?? 0,
                computedCourseProgress,
              ),
            }
          : current.access,
      };
    });
  });

  const scheduleIdleSync = useStableEvent(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      void flushProgress();
    }, 60_000);
  });

  const pausePlayback = useStableEvent(() => {
    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => bunnyPlayerRef.current?.player.pause());
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => youtubePlayerRef.current?.player.pauseVideo());
    }
    videoRef.current?.pause();
    setPlayerPlaying(false);
  });

  const resumePlayback = useStableEvent(() => {
    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => bunnyPlayerRef.current?.player.play());
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => youtubePlayerRef.current?.player.playVideo());
    }
    void videoRef.current?.play().catch(() => undefined);
    setPlayerPlaying(true);
  });

  const flushProgress = useStableEvent(
    async ({
      forceComplete = false,
      keepalive = false,
    }: {
      forceComplete?: boolean;
      keepalive?: boolean;
    } = {}) => {
      if (!courseSlug || !lesson || !accessToken || syncInFlightRef.current) return;
      const durationSeconds = lesson.duration_seconds ?? 0;
      if (durationSeconds <= 0) return;

      const watchedSeconds = Math.min(progressDraftRef.current.watchedSeconds, durationSeconds);
      const lastPositionSeconds = Math.min(
        progressDraftRef.current.lastPositionSeconds,
        durationSeconds,
      );
      const shouldComplete =
        forceComplete || durationSeconds - watchedSeconds <= completionWindowSeconds(durationSeconds);

      const nothingPending =
        !dirtyProgressRef.current &&
        watchedSeconds <= lastSyncedProgressRef.current.watchedSeconds &&
        (!shouldComplete || lastSyncedProgressRef.current.completed);
      if (nothingPending) return;

      syncInFlightRef.current = true;

      try {
        const progress = await learningClient.updateLessonProgress(
          courseSlug,
          lesson.slug,
          accessToken,
          {
            watchedSeconds,
            timeSpentSeconds: Math.max(
              progressDraftRef.current.timeSpentSeconds,
              watchedSeconds,
            ),
            lastPositionSeconds,
            markCompleted: shouldComplete,
          },
          { keepalive },
        );

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
        if (!keepalive) {
          setError(cause instanceof Error ? cause.message : "Unable to sync lesson progress.");
        }
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
      progressDraftRef.current.watchedSeconds,
      normalizedSecond,
      lesson.progress?.watched_seconds ?? 0,
    );
    progressDraftRef.current.timeSpentSeconds = Math.max(
      progressDraftRef.current.timeSpentSeconds,
      normalizedSecond,
      lesson.progress?.time_spent_seconds ?? 0,
    );
    progressDraftRef.current.lastPositionSeconds = normalizedSecond;
    dirtyProgressRef.current = true;

    scheduleIdleSync();

    const checkpoint = lesson.questions.find(
      (question) => question.timestamp_seconds <= normalizedSecond && !questionStates[question.id]?.result,
    );
    if (checkpoint && activeCheckpointId !== checkpoint.id) {
      pausePlayback();
      setActiveCheckpointId(checkpoint.id);
    }

    if (
      lessonDuration - normalizedSecond <= completionWindowSeconds(lessonDuration) &&
      !lastSyncedProgressRef.current.completed
    ) {
      void flushProgress({ forceComplete: true });
    }
  });

  const togglePlayback = useStableEvent(() => {
    if (playerPlaying) {
      pausePlayback();
      return;
    }
    resumePlayback();
  });

  const seekPlayback = useStableEvent((seconds: number) => {
    const duration = playbackDurationSeconds || lesson?.duration_seconds || 0;
    const nextSecond = duration > 0 ? clampPlaybackValue(seconds, 0, duration) : Math.max(0, seconds);
    setPlaybackPositionSeconds(nextSecond);

    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => bunnyPlayerRef.current?.player.setCurrentTime?.(nextSecond));
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => youtubePlayerRef.current?.player.seekTo(nextSecond, true));
    }
    if (videoRef.current) {
      videoRef.current.currentTime = nextSecond;
    }
    handlePlaybackSample(nextSecond, duration);
  });

  const changePlayerVolume = useStableEvent((volume: number) => {
    const nextVolume = Math.round(clampPlaybackValue(volume, 0, 100));
    setPlayerVolume(nextVolume);
    setPlayerMuted(nextVolume === 0);

    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => bunnyPlayerRef.current?.player.setVolume?.(nextVolume));
      if (nextVolume === 0) {
        runPlayerCommand(() => bunnyPlayerRef.current?.player.mute?.());
      } else {
        runPlayerCommand(() => bunnyPlayerRef.current?.player.unmute?.());
      }
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => youtubePlayerRef.current?.player.setVolume(nextVolume));
      if (nextVolume === 0) {
        runPlayerCommand(() => youtubePlayerRef.current?.player.mute());
      } else {
        runPlayerCommand(() => youtubePlayerRef.current?.player.unMute());
      }
    }
    if (videoRef.current) {
      videoRef.current.volume = nextVolume / 100;
      videoRef.current.muted = nextVolume === 0;
    }
  });

  const togglePlayerMute = useStableEvent(() => {
    const nextMuted = !playerMuted;
    setPlayerMuted(nextMuted);

    if (bunnyPlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => {
        if (nextMuted) {
          bunnyPlayerRef.current?.player.mute?.();
        } else {
          bunnyPlayerRef.current?.player.unmute?.();
        }
      });
    }
    if (youtubePlayerRef.current?.iframe.isConnected) {
      runPlayerCommand(() => {
        if (nextMuted) {
          youtubePlayerRef.current?.player.mute();
        } else {
          youtubePlayerRef.current?.player.unMute();
        }
      });
    }
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  });

  const requestPlayerFullscreen = useStableEvent(() => {
    const element = playerShellRef.current;
    if (!element) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }

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
        const coursePayload =
          cachedCourse ??
          (await learningClient.getCourseDetail(activeCourseSlug, {
            token: accessToken,
          }));

        if (!cachedCourse) {
          learningCache.setCourseDetail(coursePayload, cacheOptions);
        }
        const defaultLessonSlug =
          lessonSlugFromQuery ??
          findLessonSlugById(coursePayload, coursePayload.access?.current_lesson_id) ??
          coursePayload.modules.flatMap((module) => module.lessons).find((item) => item.accessible)?.slug ??
          coursePayload.modules[0]?.lessons[0]?.slug;

        if (!defaultLessonSlug) {
          throw new Error("No accessible lesson found for this course.");
        }

        if (activeLessonSlugRef.current && activeLessonSlugRef.current !== defaultLessonSlug) {
          await flushProgress();
        }

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
              current && current.slug === defaultLessonSlug
                ? { ...current, discussions: payload.items }
                : current,
            );
          })
          .catch((cause) => {
            if (!cancelled) {
              setError(cause instanceof Error ? cause.message : "Unable to load discussions.");
            }
          })
          .finally(() => {
            if (!cancelled) {
              setIsDiscussionLoading(false);
            }
          });
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load lesson.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLearningState();
    return () => {
      cancelled = true;
    };
  }, [accessToken, courseSlug, flushProgress, isAuthLoading, lessonSlugFromQuery, user?.id]);

  useEffect(() => {
    if (!course) return;
    learningCache.setCourseDetail(course, { viewerKey: user?.id ?? null });
  }, [course, user?.id]);

  useEffect(() => {
    if (!lesson || !course) {
      setLearningContext(null);
      return;
    }
    setLearningContext({
      course_id: course.id,
      course_title: course.title,
      course_slug: course.slug,
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      lesson_slug: lesson.slug,
      lesson_summary: lesson.summary ?? course.short_description ?? null,
      playback_seconds:
        lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? null,
      page_path: pathname,
    });
    return () => setLearningContext(null);
  }, [course, lesson, pathname, setLearningContext]);

  useEffect(() => {
    if (!lesson) return;
    activeLessonSlugRef.current = lesson.slug;
    setHasRequestedTranscript(Boolean(lesson.transcript));
    setIsTranscriptLoading(false);
    const watchedSeconds = lesson.progress?.watched_seconds ?? 0;
    const lastPositionSeconds = lesson.progress?.last_position_seconds ?? watchedSeconds;
    progressDraftRef.current = {
      watchedSeconds,
      timeSpentSeconds: lesson.progress?.time_spent_seconds ?? watchedSeconds,
      lastPositionSeconds,
    };
    lastSyncedProgressRef.current = {
      watchedSeconds,
      lastPositionSeconds,
      completed: lesson.progress?.status === "completed",
    };
    dirtyProgressRef.current = false;
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, [lesson]);

  useEffect(() => {
    if (!lesson) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushProgress({ keepalive: true });
      }
    };
    const onPageHide = () => {
      void flushProgress({ keepalive: true });
    };
    const onUserActivity = () => {
      scheduleIdleSync();
    };

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
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
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
      if (startAt > 0) {
        runPlayerCommand(() => player?.setCurrentTime?.(startAt));
        setPlaybackPositionSeconds(startAt);
      }
      runPlayerCommand(() => player?.getDuration?.((value) => setPlaybackDurationSeconds(value)));
      runPlayerCommand(() => player?.getVolume?.((value) => setPlayerVolume(value)));
      runPlayerCommand(() => player?.getMuted?.((value) => setPlayerMuted(value)));
      runPlayerCommand(() => player?.getPaused?.((value) => setPlayerPlaying(!value)));
    };
    const onTimeUpdate = (data?: PlayerJsEventData) => {
      if (cancelled || !iframeElement.isConnected) return;
      handlePlaybackSample(data?.seconds ?? 0, data?.duration ?? lesson.duration_seconds ?? 0);
    };
    const onPause = () => {
      if (cancelled || !iframeElement.isConnected) return;
      setPlayerPlaying(false);
      scheduleIdleSync();
    };
    const onPlay = () => {
      if (cancelled || !iframeElement.isConnected) return;
      setPlayerPlaying(true);
      scheduleIdleSync();
    };
    const onEnded = () => {
      if (cancelled || !iframeElement.isConnected) return;
      setPlayerPlaying(false);
      runPlayerCommand(() =>
        player?.getDuration?.((value) => setPlaybackPositionSeconds(value || lesson.duration_seconds || 0)),
      );
      void flushProgress({ forceComplete: true });
    };

    void ensureBunnyPlayerScript()
      .then(() => {
        if (cancelled || !window.playerjs?.Player) return;
        player = new window.playerjs.Player(iframeElement);
        bunnyPlayerRef.current = { player, iframe: iframeElement };
        player.on("ready", onReady);
        player.on("timeupdate", onTimeUpdate);
        player.on("pause", onPause);
        player.on("play", onPlay);
        player.on("ended", onEnded);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to initialize Bunny player.");
        }
      });

    return () => {
      cancelled = true;
      if (bunnyPlayerRef.current?.player === player) {
        bunnyPlayerRef.current = null;
      }
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

    const clearProgressTimer = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
    };
    const sampleProgress = () => {
      if (!player || cancelled || !iframeElement.isConnected) return;
      handlePlaybackSample(
        player.getCurrentTime(),
        player.getDuration() || lesson.duration_seconds || 0,
      );
    };
    const startProgressTimer = () => {
      clearProgressTimer();
      progressTimer = setInterval(sampleProgress, 1000);
    };

    void ensureYouTubeIframeApi()
      .then(() => {
        if (cancelled || !window.YT?.Player) return;
        player = new window.YT.Player(iframeElement, {
          events: {
            onReady: (event) => {
              setPlayerReady(true);
              setPlaybackDurationSeconds(event.target.getDuration() || lesson.duration_seconds || 0);
              setPlayerVolume(event.target.getVolume());
              setPlayerMuted(event.target.isMuted());
              const startAt =
                lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? 0;
              if (startAt > 0) {
                event.target.seekTo(startAt, true);
                setPlaybackPositionSeconds(startAt);
              }
            },
            onStateChange: (event) => {
              if (cancelled || !iframeElement.isConnected) return;
              if (event.data === window.YT?.PlayerState.PLAYING) {
                setPlayerPlaying(true);
                scheduleIdleSync();
                startProgressTimer();
              }
              if (event.data === window.YT?.PlayerState.PAUSED) {
                setPlayerPlaying(false);
                sampleProgress();
                clearProgressTimer();
                scheduleIdleSync();
              }
              if (event.data === window.YT?.PlayerState.ENDED) {
                setPlayerPlaying(false);
                sampleProgress();
                clearProgressTimer();
                setPlaybackPositionSeconds(player?.getDuration() || lesson.duration_seconds || 0);
                void flushProgress({ forceComplete: true });
              }
            },
          },
        });
        youtubePlayerRef.current = { player, iframe: iframeElement };
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to initialize YouTube player.");
        }
      });

    return () => {
      cancelled = true;
      clearProgressTimer();
      if (youtubePlayerRef.current?.player === player) {
        youtubePlayerRef.current = null;
      }
      runPlayerCommand(() => player?.destroy());
    };
  }, [flushProgress, handlePlaybackSample, lesson, scheduleIdleSync, youtubeEmbedUrl]);

  async function handleQuestionAttempt(questionId: string, optionId?: string, answerText?: string) {
    if (!courseSlug || !lesson || !accessToken) return;
    if (!optionId && !answerText?.trim()) return;

    if (questionLockRef.current[questionId]) {
      return;
    }
    questionLockRef.current[questionId] = true;

    setQuestionStates((current) => ({
      ...current,
      [questionId]: {
        selectedOptionId: optionId ?? null,
        isLocked: true,
        isSubmitting: true,
        result: null,
        error: null,
      },
    }));

    try {
      const result = await learningClient.submitQuestionAttempt(
        courseSlug,
        lesson.slug,
        questionId,
        accessToken,
        { selectedOptionId: optionId, answerText },
      );
      setQuestionStates((current) => ({
        ...current,
        [questionId]: {
          selectedOptionId: optionId ?? null,
          isLocked: true,
          isSubmitting: false,
          result: { correct: result.is_correct, explanation: result.explanation },
          error: null,
        },
      }));
      setAnswerDrafts((current) => ({ ...current, [questionId]: "" }));
    } catch (cause) {
      questionLockRef.current[questionId] = false;
      setQuestionStates((current) => ({
        ...current,
        [questionId]: {
          selectedOptionId: optionId ?? null,
          isLocked: false,
          isSubmitting: false,
          result: null,
          error: cause instanceof Error ? cause.message : "Unable to submit answer.",
        },
      }));
    }
  }

  async function handleLessonLike() {
    if (!courseSlug || !lesson || !accessToken) return;
    const nextLiked = !lesson.liked_by_me;
    try {
      const response = await learningClient.setLessonLike(courseSlug, lesson.slug, accessToken, nextLiked);
      setLesson((current) =>
        current ? { ...current, liked_by_me: response.liked, like_count: response.like_count } : current,
      );
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
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f97316";
    context.fillRect(0, 0, canvas.width, 12);
    context.fillStyle = "#ffffff";
    context.font = "700 44px sans-serif";
    context.fillText(lesson.title, 64, 92);
    context.font = "400 30px sans-serif";
    const words = lesson.flashcard_markdown.replace(/[#*_`>-]/g, "").split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = `${line} ${word}`.trim();
      if (context.measureText(next).width > 1060) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 12).forEach((item, index) => context.fillText(item, 64, 160 + index * 42));
    const link = document.createElement("a");
    link.download = `${lesson.slug}-flashcard.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleArtifact(type: "lesson_notes" | "flashcards") {
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

  async function handleLoadTranscript() {
    if (!courseSlug || !lesson || isTranscriptLoading) return;
    setIsTranscriptLoading(true);
    setHasRequestedTranscript(true);
    try {
      const payload = await learningClient.getLessonDetail(courseSlug, lesson.slug, {
        token: accessToken,
        includeTranscript: true,
      });
      setLesson((current) =>
        current && current.id === payload.id
          ? {
              ...current,
              transcript: payload.transcript,
            }
          : current,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load transcript.");
    } finally {
      setIsTranscriptLoading(false);
    }
  }

  async function handleCreateDiscussion() {
    if (!courseSlug || !lesson || !accessToken) return;
    setSubmitting("discussion");
    try {
      const thread = await learningClient.createDiscussion(courseSlug, lesson.slug, accessToken, {
        body: discussionBody,
      });
      setLesson((current) =>
        current
          ? { ...current, discussions: [thread, ...current.discussions] }
          : current,
      );
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
          ? {
              ...current,
              discussions: current.discussions.map((item) =>
                item.id === thread.id
                  ? { ...item, comments: [...item.comments, comment as DiscussionComment] }
                  : item,
              ),
            }
          : current,
      );
      setReplyDrafts((current) => ({ ...current, [thread.id]: "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add reply.");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading || !course || !lesson) {
    return (
      <AppShell>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
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
            <Card>
              <CardContent className="p-4">
                <Skeleton className="aspect-video rounded-xl" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
                <Skeleton className="h-11 rounded-lg" />
                <Skeleton className="h-11 rounded-lg" />
                <Skeleton className="h-11 rounded-lg" />
              </CardContent>
            </Card>
          </section>
          <aside className="space-y-5">
            <Card>
              <CardContent className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-xl" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-2.5 rounded-full" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-11 rounded-lg" />
              </CardContent>
            </Card>
          </aside>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          {error && (
            <Card>
              <CardContent className="p-4 text-sm text-rose-600">{error}</CardContent>
            </Card>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/[0.03]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange">{buildAccessLabel(course.access)}</Badge>
              {lesson.progress?.status === "completed" ? (
                <Badge variant="green">Completed</Badge>
              ) : null}
              {lesson.duration_seconds ? (
                <Badge variant="default">
                  <Clock3 className="size-3.5" />
                  {formatSeconds(lesson.duration_seconds)}
                </Badge>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {course.title}
                  {currentLessonIndex > 0 ? ` · Lesson ${currentLessonIndex} of ${allLessons.length}` : ""}
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  {lesson.title}
                </h1>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                {lesson.summary ?? course.short_description ?? "Learn through a focused video lesson."}
              </p>
            </div>
          </div>

          <div
            ref={playerShellRef}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm shadow-slate-950/10"
          >
            <div className="aspect-video p-4 text-white sm:p-5">
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
                  onLoadedMetadata={(event) => {
                    const startAt =
                      lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? 0;
                    if (startAt > 0) {
                      event.currentTarget.currentTime = startAt;
                    }
                  }}
                  onTimeUpdate={(event) => {
                    handlePlaybackSample(
                      event.currentTarget.currentTime,
                      event.currentTarget.duration || lesson.duration_seconds || 0,
                    );
                  }}
                  onPause={() => {
                    scheduleIdleSync();
                  }}
                  onPlay={() => {
                    scheduleIdleSync();
                  }}
                  onEnded={() => {
                    void flushProgress({ forceComplete: true });
                  }}
                >
                  <source src={lesson.video_url} />
                </video>
              ) : (
                <div className="flex h-full flex-col justify-between rounded-lg border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="dark">Lesson player</Badge>
                    <Badge variant="orange">
                      {lesson.video_provider ? lesson.video_provider : "Video pending"}
                    </Badge>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{lesson.title}</h1>
                    <p className="mt-2 text-slate-300">{course.title}</p>
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      Add the lesson video URL or Bunny player URL to enable playback here.
                    </p>
                  </div>
                  <div className="rounded-lg bg-black/20 px-3 py-2 text-xs text-slate-300">
                    Provider asset: {lesson.video_provider_asset_id ?? "not configured"}
                  </div>
                </div>
              )}
            </div>

            {iframeEmbedUrl ? (
              <LessonPlayerControls
                available={hasCustomPlayerControls}
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

            {activeCheckpoint && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/78 p-4">
                <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="orange">Checkpoint at {formatSeconds(activeCheckpoint.timestamp_seconds)}</Badge>
                    <Badge variant="dark">
                      {activeCheckpointState?.isSubmitting
                        ? "Checking answer"
                        : activeCheckpointState?.result
                          ? "Answered"
                          : "Answer to continue"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{activeCheckpoint.prompt}</p>
                  {activeCheckpoint.question_type === "fill_blank" ? (
                    <div className="mt-4 flex gap-2">
                      <Input
                        value={answerDrafts[activeCheckpoint.id] ?? ""}
                        onChange={(event) => setAnswerDrafts((current) => ({ ...current, [activeCheckpoint.id]: event.target.value }))}
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
                          disabled={
                            activeCheckpointState?.isLocked ||
                            activeCheckpointState?.isSubmitting ||
                            Boolean(activeCheckpointState?.result)
                          }
                        >
                          <span className="flex-1">{option.option_text}</span>
                          {activeCheckpointState?.selectedOptionId === option.id ? (
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                              {activeCheckpointState.isSubmitting
                                ? "Locked"
                                : activeCheckpointState.result?.correct
                                  ? "Correct"
                                  : "Chosen"}
                            </span>
                          ) : null}
                        </Button>
                      ))}
                    </div>
                  )}
                  {activeCheckpointState?.isSubmitting ? (
                    <div className="mt-4 rounded-lg bg-orange-50/10 px-3 py-2 text-sm text-orange-200">
                      Answer saved locally. Validating now.
                    </div>
                  ) : null}
                  {activeCheckpointState?.error ? (
                    <div className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                      {activeCheckpointState.error}
                    </div>
                  ) : null}
                  {activeCheckpointState?.result ? (
                    <div
                      className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                        activeCheckpointState.result.correct
                          ? "bg-emerald-500/10 text-emerald-200"
                          : "bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      {activeCheckpointState.result.correct ? "Correct." : "Incorrect."}
                      {activeCheckpointState.result.explanation
                        ? ` ${activeCheckpointState.result.explanation}`
                        : ""}
                    </div>
                  ) : null}
                  {activeCheckpointState?.result ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="default"
                        onClick={() => {
                          setActiveCheckpointId(null);
                          resumePlayback();
                        }}
                      >
                        Continue lesson
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Study tools</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-4">
              <Button variant={lesson.liked_by_me ? "default" : "secondary"} onClick={() => void handleLessonLike()}>
                <ThumbsUp className="size-4" />
                {lesson.like_count}
              </Button>
              <Button variant="secondary" onClick={() => void handleArtifact("lesson_notes")}>
                <FileText className="size-4" />
                {submitting === "lesson_notes" ? "Generating..." : "Lesson notes"}
              </Button>
              <Button variant="secondary" onClick={() => void handleArtifact("flashcards")}>
                <Sparkles className="size-4" />
                {submitting === "flashcards" ? "Generating..." : "Flashcards"}
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/courses/${course.slug}`}>Overview</Link>
              </Button>
            </CardContent>
          </Card>

          {lesson.flashcard_markdown ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Flashcard</CardTitle>
                  <Button variant="secondary" onClick={downloadFlashcardPng}>
                    <Download className="size-4" />
                    PNG
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                    GaugeHow flashcard
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">{lesson.title}</h3>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {lesson.flashcard_markdown}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {lesson.has_simulation ? (
            <SimulationPanel config={lesson.simulation_config} />
          ) : null}

          {lesson.has_jupyter_notebook ? (
            <Card>
              <CardHeader>
                <CardTitle>Notebook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lesson.jupyter_config.instructions ? (
                  <p className="text-sm leading-6 text-slate-600">{lesson.jupyter_config.instructions}</p>
                ) : null}
                {lesson.jupyter_config.embedUrl ? (
                  <iframe
                    src={lesson.jupyter_config.embedUrl}
                    title={`${lesson.title} notebook`}
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                    className="h-[520px] w-full rounded-lg border border-slate-200"
                  />
                ) : (
                  <p className="text-sm text-slate-500">Notebook embed is not configured yet.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Your notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Textarea
                  placeholder="Save a key point at the current timestamp"
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  className="min-h-24 border-0 bg-white"
                />
                <div className="flex justify-end">
                  <Button onClick={() => void handleCreateNote()} disabled={submitting === "note" || !noteBody.trim()}>
                    {submitting === "note" ? "Saving..." : "Save note"}
                  </Button>
                </div>
              </div>
              {lesson.notes.length ? (
                lesson.notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-slate-200 p-3">
                    <Badge variant="blue">{formatSeconds(note.timestamp_seconds)}</Badge>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{note.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No personal notes yet.</p>
              )}
            </CardContent>
          </Card>

          {(artifacts.lesson_notes || artifacts.flashcards) && (
            <Card>
              <CardHeader>
                <CardTitle>Generated study aids</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                {artifacts.lesson_notes && (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">Lesson notes</p>
                    <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {artifacts.lesson_notes.content_markdown}
                    </pre>
                  </div>
                )}
                {artifacts.flashcards && (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">Flashcards</p>
                    <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {artifacts.flashcards.content_markdown}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Lesson checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lesson.questions.length ? (
                lesson.questions.map((question) => {
                  const questionState = questionStates[question.id];
                  const result = questionState?.result;
                  return (
                    <div key={question.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-950">{question.prompt}</p>
                        <Badge variant="blue">{formatSeconds(question.timestamp_seconds)}</Badge>
                      </div>
                      {question.question_type === "fill_blank" ? (
                        <div className="mt-3 flex gap-2">
                          <Input
                            value={answerDrafts[question.id] ?? ""}
                            onChange={(event) => setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))}
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
                              disabled={
                                questionState?.isLocked ||
                                questionState?.isSubmitting ||
                                Boolean(questionState?.result)
                              }
                            >
                              <span className="flex-1">{option.option_text}</span>
                              {questionState?.selectedOptionId === option.id ? (
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                  {questionState.isSubmitting
                                    ? "Locked"
                                    : questionState.result?.correct
                                      ? "Correct"
                                      : "Chosen"}
                                </span>
                              ) : null}
                            </Button>
                          ))}
                        </div>
                      )}
                      {questionState?.isSubmitting ? (
                        <div className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
                          Answer submitted. Checking now.
                        </div>
                      ) : null}
                      {questionState?.error ? (
                        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          {questionState.error}
                        </div>
                      ) : null}
                      {result && (
                        <div
                          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                            result.correct
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {result.correct ? "Correct." : "Incorrect."}
                          {result.explanation ? ` ${result.explanation}` : ""}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No question checkpoints in this lesson yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.transcript ? (
                <div className="space-y-4">
                  <p className="rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {lesson.transcript.transcript_text}
                  </p>
                  {lesson.transcript.segments?.length ? (
                    <div className="space-y-2">
                      {lesson.transcript.segments.map((segment, index) => (
                        <div key={index} className="rounded-lg border border-slate-200 px-3 py-2">
                          <p className="text-xs font-semibold text-slate-500">
                            {formatSeconds(segment.start)} - {formatSeconds(segment.end)}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : !hasRequestedTranscript ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-slate-500">
                    Transcript is loaded on demand to keep lesson startup fast.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => void handleLoadTranscript()}
                    disabled={isTranscriptLoading}
                  >
                    <FileText className="size-4" />
                    {isTranscriptLoading ? "Loading transcript..." : "Load transcript"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Transcript is not available yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lesson discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Textarea
                  placeholder="Add a comment"
                  value={discussionBody}
                  onChange={(event) => setDiscussionBody(event.target.value)}
                  className="min-h-24 border-0 bg-white"
                />
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => void handleCreateDiscussion()}
                    disabled={submitting === "discussion" || !discussionBody.trim()}
                  >
                    <MessageCircle className="size-4" />
                    {submitting === "discussion" ? "Posting..." : "Comment"}
                  </Button>
                </div>
              </div>

              {isDiscussionLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              ) : lesson.discussions.length ? (
                lesson.discussions.map((thread) => (
                  <div key={thread.id} className="rounded-2xl border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{thread.user_display_name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{thread.body}</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {thread.comments.map((comment) => (
                        <div key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-sm font-medium text-slate-950">
                            {comment.user_display_name}
                            {comment.is_instructor_response ? " · Instructor" : ""}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{comment.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Input
                        placeholder="Reply..."
                        value={replyDrafts[thread.id] ?? ""}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [thread.id]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        onClick={() => void handleReply(thread)}
                        disabled={submitting === `reply:${thread.id}`}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No comments yet.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Course content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allLessons.map((item, index) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 ${
                    item.slug === lesson.slug
                      ? "border-orange-300 bg-orange-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Button
                      asChild={item.accessible}
                      size="icon"
                      variant={item.slug === lesson.slug ? "default" : "secondary"}
                    >
                      {item.accessible ? (
                        <Link href={`/courses/${course.slug}/learn?lesson=${item.slug}`}>
                          <Play />
                        </Link>
                      ) : (
                        <span>
                          <Play />
                        </span>
                      )}
                    </Button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {index + 1}. {item.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.duration_seconds ? formatSeconds(item.duration_seconds) : "TBD"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={item.progress_percent ?? 0} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Course completion</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  {Math.round(course.access?.progress_percent ?? 0)}%
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {completedLessonsCount} of {allLessons.length} lessons completed
                </p>
              </div>
              <Progress value={course.access?.progress_percent ?? 0} />
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Access
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {buildAccessLabel(course.access)}
                </p>
              </div>
              <Button asChild className="w-full" variant="secondary">
                <Link href={`/courses/${course.slug}`}>Course overview</Link>
              </Button>
            </CardContent>
          </Card>
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
