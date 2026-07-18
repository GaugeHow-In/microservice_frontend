"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  CheckCircle,
  Cpu,
  Factory,
  Gauge,
  PenNib,
  Robot,
  SpinnerGap,
  Wind,
  type Icon,
} from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiClient, type StudentAIContext } from "@/lib/ai-client";

type Level = "beginner" | "intermediate" | "advanced";

const roleOptions: { label: string; hint: string; value: Level }[] = [
  { label: "1st or 2nd year student", hint: "Building the fundamentals", value: "beginner" },
  { label: "3rd or 4th year student", hint: "Going deeper into your field", value: "intermediate" },
  { label: "Working professional", hint: "Sharpening real-world expertise", value: "advanced" },
];

const interestOptions: { label: string; icon: Icon }[] = [
  { label: "Design Engineer", icon: PenNib },
  { label: "CAE/Simulation Analyst", icon: Wind },
  { label: "Quality/Metrology Engineer", icon: Gauge },
  { label: "Manufacturing/Production Engineer", icon: Factory },
  { label: "Automation/Robotics Engineer", icon: Robot },
  { label: "EV/Battery Engineer", icon: BatteryCharging },
  { label: "Digital/Industry 4.0 Engineer", icon: Cpu },
];

const referralOptions = [
  "Instagram",
  "LinkedIn",
  "YouTube",
  "College or campus partner",
  "A friend told me",
  "Somewhere else",
];

const TOTAL_STEPS = 4;

export type PersonalizationSurveyProps = {
  /** Full context loaded for this user, so degree/goals/etc. survive a re-save. */
  baseContext: StudentAIContext;
  initialPhone: string;
  mode: "onboarding" | "edit";
  onDone: () => void;
};

export function PersonalizationSurvey({ baseContext, initialPhone, mode, onDone }: PersonalizationSurveyProps) {
  const { accessToken, updateProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Level | null>(
    (baseContext.academic_level as Level | null) ?? null,
  );
  const [interests, setInterests] = useState<string[]>(baseContext.interests);
  const [referral, setReferral] = useState<string | null>(baseContext.referral_source);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneError = useMemo(() => {
    const value = phone.trim();
    if (!value) return null;
    return /^[+()\d][\d\s()-]{5,}$/.test(value) ? null : "Enter a valid phone number.";
  }, [phone]);

  const toggleInterest = (label: string) =>
    setInterests((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );

  async function persist(context: StudentAIContext, phoneToSave: string | null) {
    if (!accessToken) {
      setError("Your session expired. Please sign in again.");
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await aiClient.updateContext(accessToken, context);
      if (phoneToSave) await updateProfile({ phone_number: phoneToSave });
      return true;
    } catch {
      setError("We couldn't save your preferences. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (phoneError) return;
    const ok = await persist(
      { ...baseContext, academic_level: role, interests, referral_source: referral, onboarding_skipped: false },
      phone.trim() || null,
    );
    if (ok) onDone();
  }

  async function skip() {
    const ok = await persist({ ...baseContext, onboarding_skipped: true }, null);
    if (ok) onDone();
  }

  const canContinue = step === 0 ? role !== null : step === 3 ? !phoneError : true;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <main className="premium-bg flex min-h-screen flex-col px-4 py-6 sm:px-6">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between">
        <BrandLogo compact />
        {mode === "onboarding" ? (
          // Intentionally low-emphasis: we want the survey filled, not dismissed.
          <button
            type="button"
            onClick={() => void skip()}
            disabled={saving}
            className="text-xs text-slate-400/70 underline-offset-4 transition hover:text-slate-500 hover:underline"
          >
            skip
          </button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onDone} disabled={saving}>
            Cancel
          </Button>
        )}
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index <= step ? "bg-orange-600" : "bg-black/10"
            }`}
          />
        ))}
      </div>

      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
        {step === 0 && (
          <Step
            eyebrow="A quick hello"
            title="Where are you in your engineering journey?"
            subtitle="We'll tune the pace and depth to match."
          >
            <div className="grid gap-3">
              {roleOptions.map((option) => (
                <SelectCard
                  key={option.value}
                  selected={role === option.value}
                  onClick={() => setRole(option.value)}
                  title={option.label}
                  hint={option.hint}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step
            eyebrow="Your focus"
            title="Which areas do you want to master?"
            subtitle="Pick as many as you like."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {interestOptions.map(({ label, icon: IconCmp }) => {
                const selected = interests.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleInterest(label)}
                    aria-pressed={selected}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-orange-500 bg-orange-50 shadow-[var(--shadow-sm)]"
                        : "border-black/10 bg-white/60 hover:border-orange-300"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        selected ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      <IconCmp className="size-5" />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{label}</span>
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step eyebrow="One more thing" title="How did you find GaugeHow?" subtitle="It helps us reach more learners like you.">
            <div className="grid gap-3 sm:grid-cols-2">
              {referralOptions.map((option) => (
                <SelectCard
                  key={option}
                  selected={referral === option}
                  onClick={() => setReferral(option)}
                  title={option}
                />
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step eyebrow="Stay in the loop" title="Where can we reach you?" subtitle="For batch updates, mentor replies, and your certificates. Optional.">
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Phone number
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={Boolean(phoneError)}
              />
              {phoneError && <span className="block text-xs font-medium text-red-600">{phoneError}</span>}
            </label>
          </Step>
        )}

        {error && <p className="mt-6 text-sm font-medium text-red-600">{error}</p>}
      </section>

      <footer className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || saving}
        >
          <ArrowLeft />
          Back
        </Button>
        {isLast ? (
          <Button onClick={() => void finish()} disabled={!canContinue || saving}>
            {saving ? <SpinnerGap className="animate-spin" /> : <CheckCircle />}
            {mode === "edit" ? "Save" : "Finish"}
          </Button>
        ) : (
          <Button onClick={() => setStep((current) => current + 1)} disabled={!canContinue || saving}>
            Continue
            <ArrowRight />
          </Button>
        )}
      </footer>
    </main>
  );
}

function Step({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="type-caption font-semibold uppercase tracking-wide text-orange-600">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-950 sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function SelectCard({
  selected,
  onClick,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-orange-500 bg-orange-50 shadow-[var(--shadow-sm)]"
          : "border-black/10 bg-white/60 hover:border-orange-300"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      </span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-orange-600 bg-orange-600 text-white" : "border-black/20"
        }`}
      >
        {selected && <CheckCircle weight="fill" className="size-5" />}
      </span>
    </button>
  );
}
