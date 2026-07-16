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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="space-y-6">
        <QuestHero
          onNew={() => {
            setSelected(null);
            setIsEditing(false);
          }}
        />

        {error && (
          <p className="rounded-xl border border-[color:var(--border)] bg-orange-50 p-3 text-sm font-medium text-orange-700">
            {error}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <PathRail roadmaps={roadmaps} selectedId={selected?.id ?? null} onSelect={selectRoadmap} />

          {!selected ? (
            <GeneratorCard
              answers={answers}
              setAnswers={setAnswers}
              busy={busy}
              onSubmit={generate}
            />
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

function QuestHero({ onNew }: { onNew: () => void }) {
  return (
    <div className="hero-aura reveal-up surface-glass relative overflow-hidden rounded-[var(--radius-token-lg)] p-6 sm:p-8">
      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl space-y-3">
          <span className="rm-log-pill">
            <span className="rm-log-dot" aria-hidden />
            Mission Log · Learning Path
          </span>
          <h1 className="type-h1 text-slate-950">Chart your path, one stage at a time.</h1>
          <p className="type-body-lg text-slate-600">
            Generate a plan from the GaugeHow catalog, refine it with AI, then advance node by node
            toward your goal.
          </p>
        </div>
        <Button variant="secondary" onClick={onNew} className="shrink-0">
          <Plus />
          New roadmap
        </Button>
      </div>
    </div>
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
    <Card className="h-fit p-3">
      <p className="rm-tag px-2 pb-3 text-slate-400">Saved paths</p>
      <div className="space-y-2">
        {roadmaps.map((roadmap) => {
          const progress = overallProgress(roadmap);
          const active = selectedId === roadmap.id;
          return (
            <button
              key={roadmap.id}
              onClick={() => onSelect(roadmap)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                active
                  ? "border-[color:color-mix(in_srgb,var(--primary)_45%,transparent_55%)] bg-orange-50"
                  : "border-transparent hover:bg-[color:var(--surface-secondary)]"
              }`}
            >
              <span
                className={`block truncate text-sm font-semibold ${
                  active ? "text-orange-700" : "text-slate-950"
                }`}
              >
                {roadmap.title}
              </span>
              <span className="mt-0.5 flex items-center justify-between text-[0.7rem] font-medium text-slate-400">
                <span className="capitalize">{roadmap.status}</span>
                <span>
                  {progress}% · v{roadmap.version}
                </span>
              </span>
              <Progress value={progress} className="mt-2 h-1.5" />
            </button>
          );
        })}
        {!roadmaps.length && <p className="px-2 text-sm text-slate-500">No saved roadmaps yet.</p>}
      </div>
    </Card>
  );
}

function GeneratorCard({
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
    <Card>
      <CardHeader>
        <span className="rm-tag text-accent">New Path · Briefing</span>
        <CardTitle className="mt-1">Tell us what the roadmap must achieve</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            Goal
            <Input
              required
              value={answers.goal}
              onChange={(event) => setAnswers({ ...answers, goal: event.target.value })}
              placeholder="Example: Prepare for GATE civil engineering"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Current level
            <Input
              required
              value={answers.current_level}
              onChange={(event) => setAnswers({ ...answers, current_level: event.target.value })}
              placeholder="Beginner, second-year student…"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Target date
            <Input
              type="date"
              value={answers.target_date ?? ""}
              onChange={(event) =>
                setAnswers({ ...answers, target_date: event.target.value || null })
              }
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Weekly study hours
            <Input
              type="number"
              min={1}
              max={80}
              value={answers.weekly_hours}
              onChange={(event) =>
                setAnswers({ ...answers, weekly_hours: Number(event.target.value) })
              }
            />
          </label>
          <label className="space-y-1 text-sm font-medium sm:col-span-2">
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
          <label className="space-y-1 text-sm font-medium sm:col-span-2">
            Preferences
            <Textarea
              value={answers.preferences ?? ""}
              onChange={(event) =>
                setAnswers({ ...answers, preferences: event.target.value || null })
              }
              placeholder="Weekends for tests, shorter weekday sessions…"
            />
          </label>
          <Button className="sm:col-span-2" disabled={busy}>
            {busy ? <SpinnerGap className="animate-spin" /> : <Sparkle />}
            Generate roadmap
          </Button>
        </form>
      </CardContent>
    </Card>
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Badge variant="orange">{selected.status}</Badge>
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
            <Button disabled={busy} onClick={save}>
              <FloppyDisk />
              Save roadmap
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-slate-600">{selected.plan.summary}</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            {selected.plan.total_weeks} weeks planned
          </p>
        </CardContent>
      </Card>

      <div className="divide-y divide-[color:var(--border)]">
        {selected.plan.steps.map((step, index) => (
          <div key={step.id} className="py-5 first:pt-0">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-orange-700">
                {index + 1}
              </div>
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
                <p className="text-sm text-slate-600">{step.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge>{step.kind}</Badge>
                  <span>Week {step.week_start}</span>
                  <span>{step.duration_weeks} week(s)</span>
                  <label>
                    Hours/week{" "}
                    <input
                      className="w-14 rounded surface-primary px-1"
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
          </div>
        ))}
      </div>

      <Button
        variant="outline"
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

      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ icon: TileIcon, label, value }: { icon: Icon; label: string; value: string }) {
  return (
    <div className="rm-stat">
      <div className="flex items-center gap-1.5 text-slate-400">
        <TileIcon className="size-3.5" />
        <span className="rm-tag">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-bold text-slate-950">{value}</p>
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
    <div className="space-y-6">
      {/* Mission control overview */}
      <div className="rm-quest-card data-panel overflow-hidden p-6 sm:p-7">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="orange">saved</Badge>
              <span className="rm-tag text-accent">
                Path · v{selected.version} · {selected.plan.total_weeks} weeks
              </span>
            </div>
            <h2 className="type-h3 mt-3 text-slate-950">{selected.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {selected.plan.summary}
            </p>
          </div>
          <Button variant="outline" onClick={onEdit} className="shrink-0">
            <PencilLine />
            Edit
          </Button>
        </div>

        <div className="relative z-10 mt-6 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-slate-600">Overall progress</span>
              <span className="text-accent">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-2 h-3" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={Flag} label="Stages cleared" value={`${doneCount}/${steps.length}`} />
            <StatTile icon={ArrowsClockwise} label="Total span" value={`${selected.plan.total_weeks} wks`} />
            <StatTile
              icon={Lightning}
              label="Current stage"
              value={activeIndex === -1 ? "Complete" : `#${stagePad(activeIndex)}`}
            />
            <StatTile icon={GraduationCap} label="Milestones" value={String(milestoneCount)} />
          </div>
        </div>
      </div>

      {/* Quest timeline */}
      <div className="rm-timeline">
        <span className="rm-spine" aria-hidden />
        {steps.map((step, index) => (
          <QuestNode
            key={step.id}
            step={step}
            index={index}
            state={isStepDone(step) ? "done" : index === activeIndex ? "active" : "todo"}
            side={index % 2 === 0 ? "left" : "right"}
            busy={busy}
            onMarkStep={onMarkStep}
          />
        ))}
      </div>
    </div>
  );
}

function QuestNode({
  step,
  index,
  state,
  side,
  busy,
  onMarkStep,
}: {
  step: RoadmapStep;
  index: number;
  state: "done" | "active" | "todo";
  side: "left" | "right";
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
      <div className="rm-node-cell">
        <div className={`rm-node rm-node--${state}`}>
          {state === "done" ? <CheckCircle weight="fill" className="size-5" /> : stagePad(index)}
        </div>
      </div>

      <div className={`rm-card-cell rm-card-cell--${side}`}>
        <div
          className={`rm-quest-card p-5 ${
            state === "active" ? "rm-quest-card--active" : state === "done" ? "rm-quest-card--done" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="rm-tag flex items-center gap-1.5 text-accent">
              <KindIcon className="size-3.5" />
              Stage {stagePad(index)} · {meta.label}
            </span>
            <span
              className={`rm-tag flex items-center gap-1 ${
                state === "done"
                  ? "text-accent"
                  : state === "active"
                    ? "text-orange-700"
                    : "text-slate-400"
              }`}
            >
              {state === "done" && <CheckCircle weight="fill" className="size-3.5" />}
              {statusLabel}
            </span>
          </div>

          <h3 className="mt-2.5 text-lg font-semibold text-slate-950">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.description}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rm-chip">Week {step.week_start}</span>
            <span className="rm-chip">{step.duration_weeks} wk</span>
            <span className="rm-chip">{step.weekly_hours} hr/wk</span>
            {step.course_slug && <span className="rm-chip">{step.course_slug}</span>}
          </div>

          {(state !== "todo" || percent > 0) && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{progressLabel(step)}</span>
                <span className={state === "done" ? "text-accent" : undefined}>{percent}%</span>
              </div>
              <Progress value={percent} />
            </div>
          )}

          {!!step.important_points.length && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {step.important_points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}

          {!isCourseSynced && !step.completed && (
            <Button
              size="sm"
              variant={state === "active" ? "default" : "outline"}
              disabled={busy}
              onClick={() => onMarkStep(step.id, true)}
              className="mt-4"
            >
              <CheckCircle />
              Mark as done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
