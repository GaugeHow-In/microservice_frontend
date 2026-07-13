"use client";

import {
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
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

function stepProgress(step: RoadmapStep): number {
  if (typeof step.progress_percent === "number") return step.progress_percent;
  return step.completed ? 100 : 0;
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
        <PageHeader
          eyebrow="AI roadmaps"
          title="Build a study path around your goal."
          description="Generate a plan from the GaugeHow catalog, refine it with AI, then track each roadmap task."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(null);
                setIsEditing(false);
              }}
            >
              <Plus />
              New roadmap
            </Button>
          }
        />

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <Card className="h-fit p-3">
            <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your roadmaps
            </p>
            <div className="space-y-1">
              {roadmaps.map((roadmap) => (
                <button
                  key={roadmap.id}
                  onClick={() => selectRoadmap(roadmap)}
                  className={`w-full rounded-lg px-3 py-2 text-left ${
                    selected?.id === roadmap.id
                      ? "bg-orange-50 text-orange-700"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="block truncate text-sm font-semibold">{roadmap.title}</span>
                  <span className="text-xs text-slate-400">
                    {roadmap.status} · {overallProgress(roadmap)}% done · v{roadmap.version}
                  </span>
                </button>
              ))}
              {!roadmaps.length && (
                <p className="px-2 text-sm text-slate-500">No saved roadmaps yet.</p>
              )}
            </div>
          </Card>

          {!selected ? (
            <Card>
              <CardHeader>
                <CardTitle>Tell us what the roadmap must achieve</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={generate} className="grid gap-4 sm:grid-cols-2">
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
                      onChange={(event) =>
                        setAnswers({ ...answers, current_level: event.target.value })
                      }
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
                    {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                    Generate roadmap
                  </Button>
                </form>
              </CardContent>
            </Card>
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
              <Save />
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
                    <Trash2 />
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
                      className="w-14 rounded bg-[color:var(--surface-primary)] px-1"
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
              {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
              Improve
            </Button>
          </div>
        </CardContent>
      </Card>
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
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge variant="orange">saved</Badge>
              <CardTitle className="mt-2">{selected.title}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selected.plan.summary}</p>
            </div>
            <Button variant="outline" onClick={onEdit}>
              <Edit3 />
              Edit roadmap
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Overall progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="mt-2" />
          <p className="mt-2 text-xs text-slate-500">
            Course steps sync from enrolled course progress. Other roadmap tasks are updated with
            the manual done button.
          </p>
        </CardContent>
      </Card>

      <div className="divide-y divide-[color:var(--border)]">
        {selected.plan.steps.map((step, index) => {
          const percent = Math.round(stepProgress(step));
          const isCourseSynced = step.progress_source === "course";
          return (
            <div key={step.id} className="py-5 first:pt-0">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-orange-700">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">{step.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                    </div>
                    {!isCourseSynced && !step.completed && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => onMarkStep(step.id, true)}
                      >
                        <CheckCircle2 />
                        Mark as done
                      </Button>
                    )}
                    {!isCourseSynced && step.completed && (
                      <Badge className="gap-1">
                        <CheckCircle2 className="size-3.5" />
                        Done
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <Badge>{step.kind}</Badge>
                    <span>Week {step.week_start}</span>
                    <span>{step.duration_weeks} week(s)</span>
                    <span>{step.weekly_hours} hr/week</span>
                    {step.course_slug && <span>Course: {step.course_slug}</span>}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>{progressLabel(step)}</span>
                      <span>{percent}%</span>
                    </div>
                    <Progress value={percent} />
                  </div>
                  {!!step.important_points.length && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {step.important_points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
