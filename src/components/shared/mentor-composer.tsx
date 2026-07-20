"use client";

import { BookOpen, GraduationCap, PaperPlaneTilt, PlayCircle, X } from "@phosphor-icons/react";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { learningClient, type CourseCatalogItem, type LessonSummary } from "@/lib/learning-client";
import { cn } from "@/lib/utils";

/**
 * Context the learner explicitly pins to a chat turn via the "/" picker. Mirrors
 * the shape the mentor page forwards to the RAG backend as filters + learning_context.
 */
export type MentorContext = {
  course_id: string;
  course_title: string;
  course_slug: string;
  lesson_id?: string | null;
  lesson_title?: string | null;
  lesson_slug?: string | null;
};

type ComposerVariant = "hero" | "docked";

type MentorComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  placeholder: string;
  variant?: ComposerVariant;
  attached: MentorContext | null;
  onAttach: (context: MentorContext | null) => void;
};

// Trailing "/query" token — the slash must start the line or follow whitespace,
// and the query itself carries no further slash/whitespace. Group 1 is the slash token.
const SLASH_TOKEN = /(?:^|\s)(\/[^\s/]*)$/;

type PickerMode = "course" | "lesson";

export function MentorComposer({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder,
  variant = "docked",
  attached,
  onAttach,
}: MentorComposerProps) {
  const { accessToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<CourseCatalogItem[] | null>(null);
  const [coursesError, setCoursesError] = useState(false);
  const [mode, setMode] = useState<PickerMode>("course");
  const [drillCourse, setDrillCourse] = useState<CourseCatalogItem | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // The active "/query", or null when the picker should be closed.
  const query = useMemo(() => {
    const match = value.match(SLASH_TOKEN);
    if (!match) return null;
    return match[1].slice(1); // drop the leading slash
  }, [value]);
  const open = query !== null;

  // Lazily pull the catalog the first time the picker is summoned.
  useEffect(() => {
    if (!open || courses !== null || !accessToken) return;
    learningClient
      .listCourses({ token: accessToken, pageSize: 100 })
      .then((response) => setCourses(response.items))
      .catch(() => setCoursesError(true));
  }, [open, courses, accessToken]);

  // Reset to the flat course list whenever the picker closes.
  useEffect(() => {
    if (!open) {
      setMode("course");
      setDrillCourse(null);
      setLessons(null);
    }
  }, [open]);

  const courseResults = useMemo(() => {
    if (mode !== "course" || !courses) return [];
    const q = (query ?? "").toLowerCase();
    const matches = q
      ? courses.filter((course) => course.title.toLowerCase().includes(q) || course.slug.includes(q))
      : courses;
    return matches.slice(0, 8);
  }, [mode, courses, query]);

  const lessonResults = useMemo(() => {
    if (mode !== "lesson" || !lessons) return [];
    const q = (query ?? "").toLowerCase();
    const matches = q ? lessons.filter((lesson) => lesson.title.toLowerCase().includes(q)) : lessons;
    return matches.slice(0, 8);
  }, [mode, lessons, query]);

  // Keep the highlighted row in range as the result set changes.
  const rowCount = mode === "course" ? courseResults.length : lessonResults.length + 1; // +1 = "whole course"
  useEffect(() => {
    setHighlight((current) => (rowCount === 0 ? 0 : Math.min(current, rowCount - 1)));
  }, [rowCount]);

  // Strip the trailing "/query" from the input once a selection is made.
  const stripToken = useCallback(() => {
    const match = value.match(SLASH_TOKEN);
    if (!match) return "";
    return value.slice(0, value.length - match[1].length);
  }, [value]);

  const closePicker = useCallback(() => {
    onChange(stripToken());
    inputRef.current?.focus();
  }, [onChange, stripToken]);

  const attachCourse = useCallback(
    (course: CourseCatalogItem) => {
      onAttach({ course_id: course.id, course_title: course.title, course_slug: course.slug });
      closePicker();
    },
    [onAttach, closePicker],
  );

  const attachLesson = useCallback(
    (course: CourseCatalogItem, lesson: LessonSummary) => {
      onAttach({
        course_id: course.id,
        course_title: course.title,
        course_slug: course.slug,
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        lesson_slug: lesson.slug,
      });
      closePicker();
    },
    [onAttach, closePicker],
  );

  const drillIntoCourse = useCallback(
    (course: CourseCatalogItem) => {
      setDrillCourse(course);
      setMode("lesson");
      setLessons(null);
      setLessonsLoading(true);
      setHighlight(0);
      // Reset the query so the next keystrokes filter lessons, not the earlier course search.
      onChange(`${stripToken()}/`);
      inputRef.current?.focus();
      learningClient
        .getCourseDetail(course.slug, { token: accessToken })
        .then((detail) => setLessons(detail.modules.flatMap((module) => module.lessons)))
        .catch(() => setLessons([]))
        .finally(() => setLessonsLoading(false));
    },
    [accessToken, onChange, stripToken],
  );

  const backToCourses = useCallback(() => {
    setMode("course");
    setDrillCourse(null);
    setLessons(null);
    setHighlight(0);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((current) => (rowCount === 0 ? 0 : (current + 1) % rowCount));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((current) => (rowCount === 0 ? 0 : (current - 1 + rowCount) % rowCount));
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closePicker();
        return;
      }
      if (mode === "lesson" && event.key === "Backspace" && (query ?? "") === "") {
        event.preventDefault();
        backToCourses();
        return;
      }
      if ((event.key === "ArrowRight" || event.key === "Tab") && mode === "course") {
        const course = courseResults[highlight];
        if (course) {
          event.preventDefault();
          drillIntoCourse(course);
          return;
        }
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (mode === "course") {
          const course = courseResults[highlight];
          if (course) attachCourse(course);
        } else if (drillCourse) {
          if (highlight === 0) {
            attachCourse(drillCourse); // "whole course" row
          } else {
            const lesson = lessonResults[highlight - 1];
            if (lesson) attachLesson(drillCourse, lesson);
          }
        }
        return;
      }
      // Any other key falls through to normal typing.
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (open) return; // Enter is owned by the picker while it's up.
    onSubmit();
  }

  const shadow = variant === "hero" ? "shadow-[var(--shadow-sm)]" : "shadow-[var(--shadow-lg)]";

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      {open && (
        <SlashMenu
          mode={mode}
          query={query ?? ""}
          drillCourse={drillCourse}
          courseResults={courseResults}
          lessonResults={lessonResults}
          lessonsLoading={lessonsLoading}
          coursesLoaded={courses !== null}
          coursesError={coursesError}
          highlight={highlight}
          onHighlight={setHighlight}
          onPickCourse={attachCourse}
          onDrillCourse={drillIntoCourse}
          onPickLesson={attachLesson}
          onBack={backToCourses}
        />
      )}

      <div className={cn("rounded-3xl surface-secondary p-2", shadow)}>
        {attached && (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/15 px-3 py-1 text-xs font-bold text-accent">
              {attached.lesson_title ? <PlayCircle className="size-3.5" /> : <BookOpen className="size-3.5" />}
              <span className="max-w-[16rem] truncate">
                {attached.course_title}
                {attached.lesson_title ? ` › ${attached.lesson_title}` : ""}
              </span>
              <button
                type="button"
                onClick={() => onAttach(null)}
                className="rounded-full p-0.5 transition hover:bg-orange-400/25"
                aria-label="Remove context"
              >
                <X className="size-3" />
              </button>
            </span>
          </div>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Message the AI mentor"
            className="h-14 w-full rounded-full bg-transparent pl-6 pr-20 text-base text-slate-950 outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={busy || !value.trim() || open}
            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-orange-400 text-slate-950 transition hover:bg-orange-300 disabled:opacity-50"
            aria-label="Send"
          >
            <PaperPlaneTilt className="size-5" />
          </button>
        </div>
      </div>
      {!attached && (
        <p className="px-4 pt-1.5 text-xs text-slate-400">
          Tip: type <span className="font-bold text-slate-500">/</span> to add a course or lesson as context.
        </p>
      )}
    </form>
  );
}

type SlashMenuProps = {
  mode: PickerMode;
  query: string;
  drillCourse: CourseCatalogItem | null;
  courseResults: CourseCatalogItem[];
  lessonResults: LessonSummary[];
  lessonsLoading: boolean;
  coursesLoaded: boolean;
  coursesError: boolean;
  highlight: number;
  onHighlight: (index: number) => void;
  onPickCourse: (course: CourseCatalogItem) => void;
  onDrillCourse: (course: CourseCatalogItem) => void;
  onPickLesson: (course: CourseCatalogItem, lesson: LessonSummary) => void;
  onBack: () => void;
};

function SlashMenu({
  mode,
  query,
  drillCourse,
  courseResults,
  lessonResults,
  lessonsLoading,
  coursesLoaded,
  coursesError,
  highlight,
  onHighlight,
  onPickCourse,
  onDrillCourse,
  onPickLesson,
  onBack,
}: SlashMenuProps) {
  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-md overflow-hidden rounded-2xl surface-secondary shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {mode === "course" ? "Add context" : "Pick a lesson"}
        </span>
        {mode === "lesson" && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onBack}
            className="text-xs font-bold text-slate-500 transition hover:text-accent"
          >
            ← Courses
          </button>
        )}
      </div>

      <ul className="max-h-64 overflow-y-auto py-1">
        {mode === "course" && (
          <>
            {coursesError && <li className="px-4 py-3 text-sm text-red-600">Couldn&apos;t load courses.</li>}
            {!coursesError && !coursesLoaded && (
              <li className="px-4 py-3 text-sm text-slate-400">Loading courses…</li>
            )}
            {coursesLoaded && courseResults.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">No courses match “{query}”.</li>
            )}
            {courseResults.map((course, index) => (
              <li key={course.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => onHighlight(index)}
                  onClick={() => onPickCourse(course)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                    index === highlight ? "bg-orange-400/15" : "hover:bg-orange-400/10",
                  )}
                >
                  <BookOpen className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-950">{course.title}</span>
                    <span className="block text-xs text-slate-400">{course.lesson_count} lessons</span>
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDrillCourse(course);
                    }}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-slate-400 transition hover:text-accent"
                  >
                    lessons →
                  </span>
                </button>
              </li>
            ))}
          </>
        )}

        {mode === "lesson" && drillCourse && (
          <>
            <li>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => onHighlight(0)}
                onClick={() => onPickCourse(drillCourse)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                  highlight === 0 ? "bg-orange-400/15" : "hover:bg-orange-400/10",
                )}
              >
                <GraduationCap className="size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-950">
                  Whole course: {drillCourse.title}
                </span>
              </button>
            </li>
            {lessonsLoading && <li className="px-4 py-3 text-sm text-slate-400">Loading lessons…</li>}
            {!lessonsLoading && lessonResults.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">No lessons match “{query}”.</li>
            )}
            {lessonResults.map((lesson, index) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => onHighlight(index + 1)}
                  onClick={() => onPickLesson(drillCourse, lesson)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                    index + 1 === highlight ? "bg-orange-400/15" : "hover:bg-orange-400/10",
                  )}
                >
                  <PlayCircle className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-950">{lesson.title}</span>
                </button>
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
