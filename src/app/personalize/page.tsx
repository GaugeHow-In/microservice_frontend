"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SpinnerGap } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { PersonalizationSurvey } from "@/components/sections/personalization-survey";
import { aiClient, needsPersonalization, type StudentAIContext } from "@/lib/ai-client";

const emptyContext: StudentAIContext = {
  academic_level: null,
  degree: null,
  institution: null,
  target_exams: [],
  goals: [],
  interests: [],
  preferred_language: null,
  weekly_study_hours: null,
  referral_source: null,
  onboarding_skipped: false,
};

function PersonalizeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const isEdit = params.get("edit") === "1";

  const [context, setContext] = useState<StudentAIContext | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    void (async () => {
      const loaded = await aiClient.getContext(accessToken).catch(() => null);
      if (cancelled) return;
      // Returning learners who already answered (or dismissed) skip straight through —
      // unless they came from Settings to deliberately edit their answers.
      if (!isEdit && !needsPersonalization(loaded)) {
        router.replace("/dashboard");
        return;
      }
      setContext(loaded ?? emptyContext);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading, isEdit, router]);

  const initialPhone = useMemo(() => user?.profile?.phone_number ?? "", [user]);

  if (!ready || !context) {
    return (
      <main className="premium-bg flex min-h-screen items-center justify-center">
        <SpinnerGap className="size-8 animate-spin text-orange-600" />
        <span className="sr-only">Loading personalization</span>
      </main>
    );
  }

  return (
    <PersonalizationSurvey
      baseContext={context}
      initialPhone={initialPhone}
      mode={isEdit ? "edit" : "onboarding"}
      onDone={() => router.replace(isEdit ? "/settings" : "/dashboard")}
    />
  );
}

export default function PersonalizePage() {
  return (
    <Suspense
      fallback={
        <main className="premium-bg flex min-h-screen items-center justify-center">
          <SpinnerGap className="size-8 animate-spin text-orange-600" />
        </main>
      }
    >
      <PersonalizeInner />
    </Suspense>
  );
}
