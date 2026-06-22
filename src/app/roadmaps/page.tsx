"use client";

import { LoaderCircle, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aiClient, type Roadmap, type RoadmapPlan } from "@/lib/ai-client";

const emptyAnswers: Roadmap["answers"] = {
  goal: "", current_level: "", target_date: null, weekly_hours: 6, focus_areas: [], preferences: null,
};

export default function RoadmapsPage() {
  const { accessToken } = useAuth();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selected, setSelected] = useState<Roadmap | null>(null);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void aiClient.listRoadmaps(accessToken).then((items) => { setRoadmaps(items); setSelected(items[0] ?? null); }).catch(() => setError("Could not load roadmaps."));
  }, [accessToken]);

  function replaceRoadmap(updated: Roadmap) {
    setSelected(updated);
    setRoadmaps((items) => [updated, ...items.filter((item) => item.id !== updated.id)]);
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setBusy(true); setError(null);
    try { replaceRoadmap(await aiClient.generateRoadmap(accessToken, answers)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Generation failed."); }
    finally { setBusy(false); }
  }

  function setPlan(plan: RoadmapPlan) {
    if (selected) setSelected({ ...selected, title: plan.title, plan });
  }

  async function save(status: Roadmap["status"] = "saved") {
    if (!accessToken || !selected) return;
    setBusy(true); setError(null);
    try { replaceRoadmap(await aiClient.updateRoadmap(accessToken, selected, { title: selected.title, plan: selected.plan, status })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function revise() {
    if (!accessToken || !selected || !revision.trim()) return;
    setBusy(true); setError(null);
    try { replaceRoadmap(await aiClient.reviseRoadmap(accessToken, selected.id, revision)); setRevision(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Revision failed."); }
    finally { setBusy(false); }
  }

  return (
    <AppShell><div className="space-y-6">
      <PageHeader eyebrow="AI roadmaps" title="Build a study path around your goal." description="Generate a plan from the GaugeHow catalog, refine it with AI, then edit every step yourself." action={<Button variant="secondary" onClick={() => setSelected(null)}><Plus />New roadmap</Button>} />
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <Card className="h-fit p-3"><p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Your roadmaps</p><div className="space-y-1">{roadmaps.map((roadmap) => <button key={roadmap.id} onClick={() => setSelected(roadmap)} className={`w-full rounded-lg px-3 py-2 text-left ${selected?.id === roadmap.id ? "bg-orange-50 text-orange-700" : "hover:bg-slate-50"}`}><span className="block truncate text-sm font-semibold">{roadmap.title}</span><span className="text-xs text-slate-400">{roadmap.status} · v{roadmap.version}</span></button>)}</div></Card>
        {!selected ? <Card><CardHeader><CardTitle>Tell us what the roadmap must achieve</CardTitle></CardHeader><CardContent><form onSubmit={generate} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Goal<Input required value={answers.goal} onChange={(e) => setAnswers({ ...answers, goal: e.target.value })} placeholder="Example: Prepare for GATE civil engineering" /></label>
          <label className="space-y-1 text-sm font-medium">Current level<Input required value={answers.current_level} onChange={(e) => setAnswers({ ...answers, current_level: e.target.value })} placeholder="Beginner, second-year student…" /></label>
          <label className="space-y-1 text-sm font-medium">Target date<Input type="date" value={answers.target_date ?? ""} onChange={(e) => setAnswers({ ...answers, target_date: e.target.value || null })} /></label>
          <label className="space-y-1 text-sm font-medium">Weekly study hours<Input type="number" min={1} max={80} value={answers.weekly_hours} onChange={(e) => setAnswers({ ...answers, weekly_hours: Number(e.target.value) })} /></label>
          <label className="space-y-1 text-sm font-medium sm:col-span-2">Focus areas<Input value={answers.focus_areas.join(", ")} onChange={(e) => setAnswers({ ...answers, focus_areas: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} placeholder="Structures, surveying, mathematics" /></label>
          <label className="space-y-1 text-sm font-medium sm:col-span-2">Preferences<Textarea value={answers.preferences ?? ""} onChange={(e) => setAnswers({ ...answers, preferences: e.target.value || null })} placeholder="Weekends for tests, shorter weekday sessions…" /></label>
          <Button className="sm:col-span-2" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}Generate roadmap</Button>
        </form></CardContent></Card> : <div className="space-y-4">
          <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><Badge variant="orange">{selected.status}</Badge><Input className="mt-2 text-lg font-semibold" value={selected.title} onChange={(e) => setSelected({ ...selected, title: e.target.value, plan: { ...selected.plan, title: e.target.value } })} /></div><Button disabled={busy} onClick={() => void save()}><Save />Save roadmap</Button></div></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{selected.plan.summary}</p><p className="mt-2 text-xs font-semibold text-slate-400">{selected.plan.total_weeks} weeks planned</p></CardContent></Card>
          <div className="space-y-3">{selected.plan.steps.map((step, index) => <Card key={step.id}><CardContent className="pt-5"><div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-orange-700">{index + 1}</div><div className="min-w-0 flex-1 space-y-3"><div className="flex gap-2"><Input value={step.title} onChange={(e) => setPlan({ ...selected.plan, steps: selected.plan.steps.map((item) => item.id === step.id ? { ...item, title: e.target.value } : item) })} /><Button size="icon" variant="ghost" aria-label="Delete step" onClick={() => setPlan({ ...selected.plan, steps: selected.plan.steps.filter((item) => item.id !== step.id) })}><Trash2 /></Button></div><p className="text-sm text-slate-600">{step.description}</p><div className="flex flex-wrap gap-2 text-xs text-slate-500"><Badge>{step.kind}</Badge><span>Week {step.week_start}</span><span>{step.duration_weeks} week(s)</span><label>Hours/week <input className="w-14 rounded border px-1" type="number" min="0.5" max="80" step="0.5" value={step.weekly_hours} onChange={(e) => setPlan({ ...selected.plan, steps: selected.plan.steps.map((item) => item.id === step.id ? { ...item, weekly_hours: Number(e.target.value) } : item) })} /></label></div></div></div></CardContent></Card>)}</div>
          <Button variant="outline" onClick={() => setPlan({ ...selected.plan, steps: [...selected.plan.steps, { id: crypto.randomUUID(), title: "New practice block", description: "Add details for this study activity.", kind: "practice", week_start: selected.plan.total_weeks, duration_weeks: 1, weekly_hours: 2, course_slug: null, important_points: [] }] })}><Plus />Add step</Button>
          <Card><CardContent className="pt-5"><div className="flex gap-2"><Textarea value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="Make the plan less intense, add more revision before tests…" /><Button disabled={busy || !revision.trim()} onClick={() => void revise()}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}Improve</Button></div></CardContent></Card>
        </div>}
      </div>
    </div></AppShell>
  );
}
