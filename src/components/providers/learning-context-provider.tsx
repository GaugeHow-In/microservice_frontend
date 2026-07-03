"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type LearningPageContext = {
  course_id: string | null;
  course_title: string | null;
  course_slug: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  lesson_slug: string | null;
  lesson_summary: string | null;
  playback_seconds: number | null;
  page_path: string | null;
};

type LearningContextValue = {
  context: LearningPageContext | null;
  setContext: (context: LearningPageContext | null) => void;
};

const LearningContext = createContext<LearningContextValue | null>(null);
const defaultLearningContext: LearningContextValue = {
  context: null,
  setContext: () => {},
};

export function LearningContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<LearningPageContext | null>(null);
  const value = useMemo(() => ({ context, setContext }), [context]);

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearningContext() {
  return useContext(LearningContext) ?? defaultLearningContext;
}
