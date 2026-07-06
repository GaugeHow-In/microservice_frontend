import { API_BASE_URL } from "@/lib/api-base";

export type AIMessage = {
  id: string;
  conversation_id?: string;
  role: "user" | "assistant";
  content: string;
  disposition?: "answered" | "refused" | "crisis_support";
  confidence?: number | null;
  citations?: Citation[];
  retrieved_chunks?: RetrievedChunk[];
  processing_time_ms?: number | null;
  created_at: string;
};

export type Citation = {
  document_name: string;
  lesson: string | null;
  page_number: number | null;
  similarity_score: number;
  document_id: string;
  chunk_id: string;
};

export type RetrievedChunk = {
  chunk_id: string;
  document_id: string;
  document_name: string;
  lesson: string | null;
  page_number: number | null;
  content: string;
  similarity_score: number;
  lexical_score: number;
  rerank_score: number;
  metadata: Record<string, unknown>;
};

export type ChatFilters = {
  course_id?: string | null;
  lesson_id?: string | null;
  document_types?: Array<"pdf" | "markdown" | "transcript">;
};

export type ChatLearningContext = {
  course_id?: string | null;
  course_title?: string | null;
  course_slug?: string | null;
  lesson_id?: string | null;
  lesson_title?: string | null;
  lesson_slug?: string | null;
  lesson_summary?: string | null;
  playback_seconds?: number | null;
  page_path?: string | null;
};

export type RAGChatResponse = {
  answer: string;
  citations: Citation[];
  confidence: number;
  retrieved_chunks: RetrievedChunk[];
  processing_time: number;
  conversation_id: string;
  message_id: string;
};

export type RoadmapStep = {
  id: string;
  title: string;
  description: string;
  kind: "course" | "test" | "practice" | "revision" | "milestone";
  week_start: number;
  duration_weeks: number;
  weekly_hours: number;
  course_slug: string | null;
  important_points: string[];
  completed: boolean;
  progress_percent: number | null;
  progress_source: "course" | "manual" | "none";
};

export type RoadmapPlan = {
  title: string;
  summary: string;
  total_weeks: number;
  assumptions: string[];
  steps: RoadmapStep[];
};

export type Roadmap = {
  id: string;
  title: string;
  status: "draft" | "saved" | "archived";
  answers: {
    goal: string;
    current_level: string;
    target_date: string | null;
    weekly_hours: number;
    focus_areas: string[];
    preferences: string | null;
  };
  plan: RoadmapPlan;
  version: number;
  created_at: string;
  updated_at: string;
};

export type StudentAIContext = {
  id?: string;
  academic_level: string | null;
  degree: string | null;
  institution: string | null;
  target_exams: string[];
  goals: string[];
  interests: string[];
  preferred_language: string | null;
  weekly_study_hours: number | null;
  onboarding_skipped: boolean;
  updated_at?: string;
};

class AIApiError extends Error {}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new AIApiError(payload.detail ?? "AI request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const aiClient = {
  getContext(token: string) {
    return request<StudentAIContext | null>("/ai/context", token);
  },
  updateContext(token: string, context: StudentAIContext) {
    return request<StudentAIContext>("/ai/context", token, {
      method: "PUT",
      body: JSON.stringify(context),
    });
  },
  queryChat(
    token: string,
    question: string,
    conversationId?: string | null,
    filters?: ChatFilters,
    learningContext?: ChatLearningContext | null,
  ) {
    return request<RAGChatResponse>("/chat/query", token, {
      method: "POST",
      body: JSON.stringify({
        question,
        conversation_id: conversationId ?? null,
        filters: filters ?? {},
        learning_context: learningContext ?? null,
      }),
    });
  },
  chatHistory(token: string, conversationId?: string | null) {
    return request<AIMessage[]>("/chat/history", token, {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId ?? null, limit: 100 }),
    });
  },
  regenerateChat(token: string, messageId: string) {
    return request<RAGChatResponse>("/chat/regenerate", token, {
      method: "POST",
      body: JSON.stringify({ message_id: messageId }),
    });
  },
  chatSources(token: string, messageId: string) {
    return request<{ message_id: string; citations: Citation[] }>(`/chat/sources/${messageId}`, token);
  },
  listRoadmaps(token: string) {
    return request<Roadmap[]>("/roadmaps", token);
  },
  generateRoadmap(token: string, answers: Roadmap["answers"]) {
    return request<Roadmap>("/roadmaps", token, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },
  updateRoadmap(token: string, roadmap: Roadmap, changes: Partial<Pick<Roadmap, "title" | "status" | "plan">>) {
    return request<Roadmap>(`/roadmaps/${roadmap.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ ...changes, expected_version: roadmap.version }),
    });
  },
  reviseRoadmap(token: string, id: string, instruction: string) {
    return request<Roadmap>(`/roadmaps/${id}/revisions`, token, {
      method: "POST",
      body: JSON.stringify({ instruction }),
    });
  },
};
