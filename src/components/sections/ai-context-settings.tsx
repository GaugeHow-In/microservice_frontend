"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { aiClient, type StudentAIContext } from "@/lib/ai-client";

const emptyContext: StudentAIContext = {
  academic_level: null, degree: null, institution: null, target_exams: [], goals: [], interests: [], preferred_language: null, weekly_study_hours: null, referral_source: null, onboarding_skipped: false,
};

export function AIContextSettings() {
  const { accessToken } = useAuth();
  const [value, setValue] = useState(emptyContext);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) void aiClient.getContext(accessToken).then((context) => context && setValue(context));
  }, [accessToken]);

  async function save() {
    if (!accessToken) return;
    setSaving(true); setMessage(null);
    try { setValue(await aiClient.updateContext(accessToken, value)); setMessage("AI learning context saved."); }
    catch { setMessage("Could not save AI learning context."); }
    finally { setSaving(false); }
  }

  const list = (text: string) => text.split(",").map((item) => item.trim()).filter(Boolean);
  return <Card className="panel-depth"><CardHeader><CardTitle>AI learning context</CardTitle><p className="text-sm text-slate-500">Optional details used to personalize Mentor and roadmap answers. You can leave any field blank.</p></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
    <label className="space-y-1 text-sm font-medium">Academic level<Input value={value.academic_level ?? ""} onChange={(e) => setValue({ ...value, academic_level: e.target.value || null })} /></label>
    <label className="space-y-1 text-sm font-medium">Degree or program<Input value={value.degree ?? ""} onChange={(e) => setValue({ ...value, degree: e.target.value || null })} /></label>
    <label className="space-y-1 text-sm font-medium">Institution<Input value={value.institution ?? ""} onChange={(e) => setValue({ ...value, institution: e.target.value || null })} /></label>
    <label className="space-y-1 text-sm font-medium">Weekly study hours<Input type="number" min={1} max={168} value={value.weekly_study_hours ?? ""} onChange={(e) => setValue({ ...value, weekly_study_hours: e.target.value ? Number(e.target.value) : null })} /></label>
    <label className="space-y-1 text-sm font-medium">Target exams (comma-separated)<Input value={value.target_exams.join(", ")} onChange={(e) => setValue({ ...value, target_exams: list(e.target.value) })} /></label>
    <label className="space-y-1 text-sm font-medium">Interests (comma-separated)<Input value={value.interests.join(", ")} onChange={(e) => setValue({ ...value, interests: list(e.target.value) })} /></label>
    <label className="space-y-1 text-sm font-medium sm:col-span-2">Goals (comma-separated)<Input value={value.goals.join(", ")} onChange={(e) => setValue({ ...value, goals: list(e.target.value) })} /></label>
    <div className="flex items-center gap-3 sm:col-span-2"><Button onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save AI context"}</Button>{message && <p className="text-sm text-slate-500">{message}</p>}</div>
  </CardContent></Card>;
}
