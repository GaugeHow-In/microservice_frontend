"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, FileText, MessageCircle, Play, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  getCurrentTime?: (callback: (value: number) => void) => void;
  getDuration?: (callback: (value: number) => void) => void;
  setCurrentTime?: (value: number) => void;
};

declare global {
  interface Window {
    playerjs?: {
      Player: new (element: string | HTMLIFrameElement) => PlayerJsPlayer;
    };
  }
}

let bunnyPlayerScriptPromise: Promise<void> | null = null;

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

function completionWindowSeconds(durationSeconds: number): number {
  return Math.min(10, Math.max(1, Math.ceil(durationSeconds * 0.1)));
}

function buildBunnyEmbedUrl(videoUrl: string, lessonId: string): string {
  const [baseUrl, queryString] = videoUrl.split("?");
  const embedBase = baseUrl.includes("/embed/")
    ? baseUrl
    : baseUrl.replace("/play/", "/embed/");
  const params = new URLSearchParams(queryString ?? "");
  params.set("preload", "true");
  params.set("responsive", "true");
  params.set("gh", lessonId);
  return `${embedBase}?${params.toString()}`;
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

export default function VideoLearningPage({ params }: Props) {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bunnyPlayerRef = useRef<PlayerJsPlayer | null>(null);
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
  const [discussionTitle, setDiscussionTitle] = useState("");
  const [discussionBody, setDiscussionBody] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void params.then((value) => {
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

  const applyProgressLocally = useStableEvent((progress: LessonProgress) => {
    setLesson((current) => (current ? { ...current, progress } : current));
    setCourse((current) => {
      if (!current || !lesson) return current;
      const modules = current.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((item) =>
          item.id === lesson.id ? { ...item, progress_percent: progress.progress_percent } : item,
        ),
      }));
      return {
        ...current,
        modules,
        access: current.access
          ? {
              ...current.access,
              current_lesson_id: lesson.id,
              progress_percent: computeCourseCompletion(modules),
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
    bunnyPlayerRef.current?.pause();
    videoRef.current?.pause();
  });

  const resumePlayback = useStableEvent(() => {
    bunnyPlayerRef.current?.play();
    void videoRef.current?.play().catch(() => undefined);
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

  useEffect(() => {
    if (!courseSlug) return;
    const activeCourseSlug = courseSlug;
    let cancelled = false;

    async function loadLearningState() {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const coursePayload = await learningClient.getCourseDetail(activeCourseSlug, {
          countryCode: "IN",
          token: accessToken,
        });
        const defaultLessonSlug =
          lessonSlugFromQuery ??
          coursePayload.modules.flatMap((module) => module.lessons).find((item) => item.accessible)?.slug ??
          coursePayload.modules[0]?.lessons[0]?.slug;

        if (!defaultLessonSlug) {
          throw new Error("No accessible lesson found for this course.");
        }

        if (activeLessonSlugRef.current && activeLessonSlugRef.current !== defaultLessonSlug) {
          await flushProgress();
        }

        const lessonPayload = await learningClient.getLessonDetail(
          activeCourseSlug,
          defaultLessonSlug,
          accessToken,
        );
        if (!cancelled) {
          setCourse(coursePayload);
          setLesson(lessonPayload);
          setQuestionStates({});
          questionLockRef.current = {};
          setArtifacts({});
          setReplyDrafts({});
          setDiscussionTitle("");
          setDiscussionBody("");
          setActiveCheckpointId(null);
        }
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
  }, [accessToken, courseSlug, flushProgress, lessonSlugFromQuery]);

  useEffect(() => {
    if (!lesson) return;
    activeLessonSlugRef.current = lesson.slug;
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
      const startAt = lesson.progress?.last_position_seconds ?? lesson.progress?.watched_seconds ?? 0;
      if (startAt > 0) {
        player?.setCurrentTime?.(startAt);
      }
    };
    const onTimeUpdate = (data?: PlayerJsEventData) => {
      handlePlaybackSample(data?.seconds ?? 0, data?.duration ?? lesson.duration_seconds ?? 0);
    };
    const onPause = () => {
      scheduleIdleSync();
    };
    const onPlay = () => {
      scheduleIdleSync();
    };
    const onEnded = () => {
      void flushProgress({ forceComplete: true });
    };

    void ensureBunnyPlayerScript()
      .then(() => {
        if (cancelled || !window.playerjs?.Player) return;
        player = new window.playerjs.Player(iframeElement);
        bunnyPlayerRef.current = player;
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
      player?.off?.("ready", onReady);
      player?.off?.("timeupdate", onTimeUpdate);
      player?.off?.("pause", onPause);
      player?.off?.("play", onPlay);
      player?.off?.("ended", onEnded);
      if (bunnyPlayerRef.current === player) {
        bunnyPlayerRef.current = null;
      }
    };
  }, [bunnyEmbedUrl, flushProgress, handlePlaybackSample, lesson, scheduleIdleSync]);

  async function handleQuestionAttempt(questionId: string, optionId?: string) {
    if (!courseSlug || !lesson || !accessToken) return;
    if (!optionId) return;

    if (questionLockRef.current[questionId]) {
      return;
    }
    questionLockRef.current[questionId] = true;

    setQuestionStates((current) => ({
      ...current,
      [questionId]: {
        selectedOptionId: optionId,
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
        { selectedOptionId: optionId },
      );
      setQuestionStates((current) => ({
        ...current,
        [questionId]: {
          selectedOptionId: optionId,
          isLocked: true,
          isSubmitting: false,
          result: { correct: result.is_correct, explanation: result.explanation },
          error: null,
        },
      }));
    } catch (cause) {
      questionLockRef.current[questionId] = false;
      setQuestionStates((current) => ({
        ...current,
        [questionId]: {
          selectedOptionId: optionId,
          isLocked: false,
          isSubmitting: false,
          result: null,
          error: cause instanceof Error ? cause.message : "Unable to submit answer.",
        },
      }));
    }
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

  async function handleCreateDiscussion() {
    if (!courseSlug || !lesson || !accessToken) return;
    setSubmitting("discussion");
    try {
      const thread = await learningClient.createDiscussion(courseSlug, lesson.slug, accessToken, {
        title: discussionTitle,
        body: discussionBody,
      });
      setLesson((current) =>
        current
          ? { ...current, discussions: [thread, ...current.discussions] }
          : current,
      );
      setDiscussionTitle("");
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
        <Card className="h-96 animate-pulse border-slate-200 bg-white" />
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

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm shadow-slate-950/10">
            <div className="aspect-video p-4 text-white sm:p-5">
              {bunnyEmbedUrl ? (
                <iframe
                  ref={iframeRef}
                  src={bunnyEmbedUrl}
                  title={lesson.title}
                  className="h-full w-full rounded-lg border-0"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media;"
                  allowFullScreen
                />
              ) : lesson.video_url ? (
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
            <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-3">
              <Button variant="secondary" onClick={() => void handleArtifact("lesson_notes")}>
                <FileText className="size-4" />
                {submitting === "lesson_notes" ? "Generating..." : "Lesson notes"}
              </Button>
              <Button variant="secondary" onClick={() => void handleArtifact("flashcards")}>
                <Sparkles className="size-4" />
                {submitting === "flashcards" ? "Generating..." : "Flashcards"}
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/courses/${course.slug}`}>Back to course overview</Link>
              </Button>
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
              <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <Input
                  placeholder="Discussion title"
                  value={discussionTitle}
                  onChange={(event) => setDiscussionTitle(event.target.value)}
                />
                <Textarea
                  placeholder="Ask a lesson-specific question"
                  value={discussionBody}
                  onChange={(event) => setDiscussionBody(event.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => void handleCreateDiscussion()}
                  disabled={
                    submitting === "discussion" ||
                    !discussionTitle.trim() ||
                    !discussionBody.trim()
                  }
                >
                  <MessageCircle className="size-4" />
                  {submitting === "discussion" ? "Posting..." : "Add discussion"}
                </Button>
              </div>

              {lesson.discussions.length ? (
                lesson.discussions.map((thread) => (
                  <div key={thread.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{thread.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{thread.body}</p>
                        <p className="mt-2 text-xs text-slate-500">{thread.user_display_name}</p>
                      </div>
                      <Badge variant="blue">{thread.status}</Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      {thread.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg bg-slate-50 px-3 py-2">
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
                        placeholder="Write a reply"
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
                <p className="text-sm text-slate-500">No discussion threads yet.</p>
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
