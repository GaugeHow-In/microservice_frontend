"use client";

import {
  ArrowsClockwise,
  Barbell,
  CheckCircle,
  ClipboardText,
  Flag,
  FloppyDisk,
  GraduationCap,
  Lightning,
  PencilLine,
  Plus,
  Sparkle,
  SpinnerGap,
  Trash,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { aiClient, type Roadmap, type RoadmapPlan, type RoadmapStep } from "@/lib/ai-client";

const emptyAnswers: Roadmap["answers"] = {
  goal: "",
  current_level: "",
  target_date: null,
  weekly_hours: 6,
  focus_areas: [],
  preferences: null,
};

const KIND_META: Record<RoadmapStep["kind"], { icon: Icon; label: string }> = {
  course: { icon: GraduationCap, label: "Course" },
  test: { icon: ClipboardText, label: "Assessment" },
  practice: { icon: Barbell, label: "Practice" },
  revision: { icon: ArrowsClockwise, label: "Revision" },
  milestone: { icon: Flag, label: "Milestone" },
};

function stepProgress(step: RoadmapStep): number {
  if (typeof step.progress_percent === "number") return step.progress_percent;
  return step.completed ? 100 : 0;
}

function isStepDone(step: RoadmapStep): boolean {
  return step.completed || stepProgress(step) >= 100;
}

function overallProgress(roadmap: Roadmap | null): number {
  if (!roadmap?.plan.steps.length) return 0;
  const total = roadmap.plan.steps.reduce((sum, step) => sum + stepProgress(step), 0);
  return Math.round(total / roadmap.plan.steps.length);
}

function progressLabel(step: RoadmapStep): string {
  if (step.progress_source === "course") return "Synced from course progress";
  if (step.completed) return "Marked done";
  return "Manual task";
}

function stagePad(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export default function RoadmapsPage() {
  const { accessToken } = useAuth();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selected, setSelected] = useState<Roadmap | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProgress = useMemo(() => overallProgress(selected), [selected]);

  useEffect(() => {
    if (!accessToken) return;
    void aiClient
      .listRoadmaps(accessToken)
      .then((items) => {
        setRoadmaps(items);
        setSelected(items[0] ?? null);
        setIsEditing(items[0]?.status !== "saved");
      })
      .catch(() => setError("Could not load roadmaps."));
  }, [accessToken]);

  function selectRoadmap(roadmap: Roadmap) {
    setSelected(roadmap);
    setIsEditing(roadmap.status !== "saved");
    setError(null);
  }

  function replaceRoadmap(updated: Roadmap, editMode = updated.status !== "saved") {
    setSelected(updated);
    setIsEditing(editMode);
    setRoadmaps((items) => [updated, ...items.filter((item) => item.id !== updated.id)]);
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      replaceRoadmap(await aiClient.generateRoadmap(accessToken, answers), true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  function setPlan(plan: RoadmapPlan) {
    if (selected) setSelected({ ...selected, title: plan.title, plan });
  }

  async function save(status: Roadmap["status"] = "saved", editMode = false) {
    if (!accessToken || !selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await aiClient.updateRoadmap(accessToken, selected, {
        title: selected.title,
        plan: selected.plan,
        status,
      });
      replaceRoadmap(updated, editMode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revise() {
    if (!accessToken || !selected || !revision.trim()) return;
    setBusy(true);
    setError(null);
    try {
      replaceRoadmap(await aiClient.reviseRoadmap(accessToken, selected.id, revision), true);
      setRevision("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revision failed.");
    } finally {
      setBusy(false);
    }
  }

  async function markStep(stepId: string, completed: boolean) {
    if (!accessToken || !selected) return;
    const updatedPlan: RoadmapPlan = {
      ...selected.plan,
      steps: selected.plan.steps.map((step) =>
        step.id === stepId ? { ...step, completed } : step,
      ),
    };
    setBusy(true);
    setError(null);
    try {
      const updated = await aiClient.updateRoadmap(accessToken, selected, {
        plan: updatedPlan,
        status: selected.status,
      });
      replaceRoadmap(updated, false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update progress.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="reveal-up">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--border)] pb-6">
          <div className="max-w-xl space-y-2">
            <span className="rm-tag text-accent">Learning path</span>
            <h1 className="type-h2 text-slate-950">Chart your path, one stage at a time.</h1>
            <p className="text-sm leading-6 text-slate-600">
              Generate a plan from the GaugeHow catalog, refine it with AI, then advance node by
              node toward your goal.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setSelected(null);
              setIsEditing(false);
            }}
            className="shrink-0"
          >
            <Plus />
            New roadmap
          </Button>
        </header>

        {error && <p className="pt-4 text-sm font-medium text-orange-700">{error}</p>}

        <div className="grid gap-10 pt-8 lg:grid-cols-[14rem_1fr] lg:gap-12">
          <PathRail roadmaps={roadmaps} selectedId={selected?.id ?? null} onSelect={selectRoadmap} />

          {!selected ? (
            <Generator answers={answers} setAnswers={setAnswers} busy={busy} onSubmit={generate} />
          ) : isEditing ? (
            <RoadmapEditor
              selected={selected}
              busy={busy}
              revision={revision}
              setRevision={setRevision}
              setSelected={setSelected}
              setPlan={setPlan}
              save={() => void save("saved", false)}
              revise={() => void revise()}
            />
          ) : (
            <SavedRoadmapView
              selected={selected}
              busy={busy}
              progress={selectedProgress}
              onEdit={() => setIsEditing(true)}
              onMarkStep={(stepId, completed) => void markStep(stepId, completed)}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PathRail({
  roadmaps,
  selectedId,
  onSelect,
}: {
  roadmaps: Roadmap[];
  selectedId: string | null;
  onSelect: (roadmap: Roadmap) => void;
}) {
  return (
    <aside className="h-fit">
      <p className="rm-tag pb-3 text-slate-400">Saved paths</p>
      <div className="space-y-1">
        {roadmaps.map((roadmap) => {
          const progress = overallProgress(roadmap);
          const active = selectedId === roadmap.id;
          return (
            <button
              key={roadmap.id}
              onClick={() => onSelect(roadmap)}
              className={`rm-rail-item ${active ? "rm-rail-item--active" : ""}`}
            >
              <span
                className={`block truncate text-sm font-semibold ${
                  active ? "text-accent" : "text-slate-600"
                }`}
              >
                {roadmap.title}
              </span>
              <span className="mt-0.5 block text-[0.7rem] font-medium text-slate-400">
                {progress}% · v{roadmap.version} · {roadmap.status}
              </span>
            </button>
          );
        })}
        {!roadmaps.length && <p className="text-sm text-slate-500">No saved roadmaps yet.</p>}
      </div>
    </aside>
  );
}

function Generator({
  answers,
  setAnswers,
  busy,
  onSubmit,
}: {
  answers: Roadmap["answers"];
  setAnswers: (answers: Roadmap["answers"]) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <section className="max-w-2xl">
      <span className="rm-tag text-accent">New path · Briefing</span>
      <h2 className="type-h3 mt-1.5 text-slate-950">Tell us what the roadmap must achieve</h2>

      <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          Goal
          <Input
            required
            value={answers.goal}
            onChange={(event) => setAnswers({ ...answers, goal: event.target.value })}
            placeholder="Example: Prepare for GATE civil engineering"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Current level
          <Input
            required
            value={answers.current_level}
            onChange={(event) => setAnswers({ ...answers, current_level: event.target.value })}
            placeholder="Beginner, second-year student…"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Target date
          <Input
            type="date"
            value={answers.target_date ?? ""}
            onChange={(event) => setAnswers({ ...answers, target_date: event.target.value || null })}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Weekly study hours
          <Input
            type="number"
            min={1}
            max={80}
            value={answers.weekly_hours}
            onChange={(event) => setAnswers({ ...answers, weekly_hours: Number(event.target.value) })}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
          Focus areas
          <Input
            value={answers.focus_areas.join(", ")}
            onChange={(event) =>
              setAnswers({
                ...answers,
                focus_areas: event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Structures, surveying, mathematics"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
          Preferences
          <Textarea
            value={answers.preferences ?? ""}
            onChange={(event) => setAnswers({ ...answers, preferences: event.target.value || null })}
            placeholder="Weekends for tests, shorter weekday sessions…"
          />
        </label>
        <Button className="justify-self-start sm:col-span-2" disabled={busy}>
          {busy ? <SpinnerGap className="animate-spin" /> : <Sparkle />}
          Generate roadmap
        </Button>
      </form>
    </section>
  );
}

function RoadmapEditor({
  selected,
  busy,
  revision,
  setRevision,
  setSelected,
  setPlan,
  save,
  revise,
}: {
  selected: Roadmap;
  busy: boolean;
  revision: string;
  setRevision: (value: string) => void;
  setSelected: (roadmap: Roadmap) => void;
  setPlan: (plan: RoadmapPlan) => void;
  save: () => void;
  revise: () => void;
}) {
  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="rm-tag text-accent">
            Editing · v{selected.version} · {selected.plan.total_weeks} weeks
          </span>
          <Input
            className="mt-2 text-lg font-semibold"
            value={selected.title}
            onChange={(event) =>
              setSelected({
                ...selected,
                title: event.target.value,
                plan: { ...selected.plan, title: event.target.value },
              })
            }
          />
        </div>
        <Button disabled={busy} onClick={save} className="mt-6 shrink-0">
          <FloppyDisk />
          Save roadmap
        </Button>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{selected.plan.summary}</p>

      <div className="rm-divide mt-8 border-t border-[color:var(--border)]">
        {selected.plan.steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3 py-5">
            <span className="rm-tag mt-3 w-6 shrink-0 text-slate-400">{stagePad(index)}</span>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={step.title}
                  onChange={(event) =>
                    setPlan({
                      ...selected.plan,
                      steps: selected.plan.steps.map((item) =>
                        item.id === step.id ? { ...item, title: event.target.value } : item,
                      ),
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete step"
                  onClick={() =>
                    setPlan({
                      ...selected.plan,
                      steps: selected.plan.steps.filter((item) => item.id !== step.id),
                    })
                  }
                >
                  <Trash />
                </Button>
              </div>
              <p className="text-sm leading-6 text-slate-600">{step.description}</p>
              <div className="rm-meta">
                <span className="capitalize">{step.kind}</span>
                <span>Week {step.week_start}</span>
                <span>{step.duration_weeks} wk</span>
                <label className="flex items-center gap-1.5">
                  Hours/week
                  <input
                    className="w-12 rounded border border-[color:var(--border)] bg-transparent px-1.5 py-0.5 text-slate-950"
                    type="number"
                    min="0"
                    max="80"
                    step="0.5"
                    value={step.weekly_hours}
                    onChange={(event) =>
                      setPlan({
                        ...selected.plan,
                        steps: selected.plan.steps.map((item) =>
                          item.id === step.id
                            ? { ...item, weekly_hours: Number(event.target.value) }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-4"
        onClick={() =>
          setPlan({
            ...selected.plan,
            steps: [
              ...selected.plan.steps,
              {
                id: crypto.randomUUID(),
                title: "New practice block",
                description: "Add details for this study activity.",
                kind: "practice",
                week_start: selected.plan.total_weeks,
                duration_weeks: 1,
                weekly_hours: 2,
                course_slug: null,
                important_points: [],
                completed: false,
                progress_percent: 0,
                progress_source: "manual",
              },
            ],
          })
        }
      >
        <Plus />
        Add step
      </Button>

      <div className="mt-10 border-t border-[color:var(--border)] pt-6">
        <span className="rm-tag text-slate-400">Refine with AI</span>
        <div className="mt-3 flex gap-2">
          <Textarea
            value={revision}
            onChange={(event) => setRevision(event.target.value)}
            placeholder="Make the plan less intense, add more revision before tests…"
          />
          <Button disabled={busy || !revision.trim()} onClick={revise}>
            {busy ? <SpinnerGap className="animate-spin" /> : <Sparkle />}
            Improve
          </Button>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: StatIcon, label, value }: { icon: Icon; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-slate-400">
        <StatIcon className="size-3.5" />
        <span className="rm-tag">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function SavedRoadmapView({
  selected,
  busy,
  progress,
  onEdit,
  onMarkStep,
}: {
  selected: Roadmap;
  busy: boolean;
  progress: number;
  onEdit: () => void;
  onMarkStep: (stepId: string, completed: boolean) => void;
}) {
  const steps = selected.plan.steps;
  const doneCount = steps.filter(isStepDone).length;
  const activeIndex = steps.findIndex((step) => !isStepDone(step));
  const milestoneCount = steps.filter((step) => step.kind === "milestone").length;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="rm-tag text-accent">
            {selected.status} · v{selected.version} · {selected.plan.total_weeks} weeks
          </span>
          <h2 className="type-h3 mt-2 text-slate-950">{selected.title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} className="shrink-0">
          <PencilLine />
          Edit
        </Button>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{selected.plan.summary}</p>

      <div className="mt-7">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-600">Overall progress</span>
          <span className="text-accent">{progress}%</span>
        </div>
        <Progress value={progress} className="mt-2 h-1.5" />
      </div>

      <div className="rm-stats mt-7">
        <Stat icon={Flag} label="Stages cleared" value={`${doneCount}/${steps.length}`} />
        <Stat icon={ArrowsClockwise} label="Total span" value={`${selected.plan.total_weeks} wks`} />
        <Stat
          icon={Lightning}
          label="Current stage"
          value={activeIndex === -1 ? "Complete" : `#${stagePad(activeIndex)}`}
        />
        <Stat icon={GraduationCap} label="Milestones" value={String(milestoneCount)} />
      </div>

      <div className="rm-timeline mt-10 border-t border-[color:var(--border)] pt-8">
        <span className="rm-spine" aria-hidden />
        {steps.map((step, index) => (
          <StageRow
            key={step.id}
            step={step}
            index={index}
            state={isStepDone(step) ? "done" : index === activeIndex ? "active" : "todo"}
            busy={busy}
            onMarkStep={onMarkStep}
          />
        ))}
      </div>
    </section>
  );
}

function StageRow({
  step,
  index,
  state,
  busy,
  onMarkStep,
}: {
  step: RoadmapStep;
  index: number;
  state: "done" | "active" | "todo";
  busy: boolean;
  onMarkStep: (stepId: string, completed: boolean) => void;
}) {
  const percent = Math.round(stepProgress(step));
  const isCourseSynced = step.progress_source === "course";
  const meta = KIND_META[step.kind];
  const KindIcon = meta.icon;
  const statusLabel = state === "done" ? "Complete" : state === "active" ? "Active" : "Upcoming";

  return (
    <div className="rm-row">
      <span className={`rm-node rm-node--${state}`} aria-hidden />

      <div className={state === "todo" ? "opacity-75" : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rm-tag flex items-center gap-1.5 text-slate-400">
            <KindIcon className="size-3.5" />
            Stage {stagePad(index)} · {meta.label}
          </span>
          <span
            className={`rm-tag flex items-center gap-1 ${
              state === "active" ? "text-accent" : "text-slate-400"
            }`}
          >
            {state === "done" && <CheckCircle weight="fill" className="size-3.5" />}
            {statusLabel}
          </span>
        </div>

        <h3
          className={`mt-2 text-base font-semibold ${
            state === "done" ? "text-slate-600" : "text-slate-950"
          }`}
        >
          {step.title}
        </h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{step.description}</p>

        <div className="rm-meta mt-2.5">
          <span>Week {step.week_start}</span>
          <span>{step.duration_weeks} wk</span>
          <span>{step.weekly_hours} hr/wk</span>
          {step.course_slug && <span>{step.course_slug}</span>}
        </div>

        {(state !== "todo" || percent > 0) && (
          <div className="mt-4 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{progressLabel(step)}</span>
              <span className={state === "done" ? "text-accent" : undefined}>{percent}%</span>
            </div>
            <Progress value={percent} className="h-1" />
          </div>
        )}

        {!!step.important_points.length && (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-600 marker:text-slate-300">
            {step.important_points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}

        {!isCourseSynced && !step.completed && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onMarkStep(step.id, true)}
            className="mt-3 -ml-3"
          >
            <CheckCircle />
            Mark as done
          </Button>
        )}
      </div>
    </div>
  );
}
