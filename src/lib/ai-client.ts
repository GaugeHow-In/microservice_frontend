import { API_BASE_URL } from "@/lib/api-base";

export type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  disposition: "answered" | "refused" | "crisis_support";
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  interface: "mentor" | "quick_chat";
  created_at: string;
  updated_at: string;
};

export type ChatTurn = {
  conversation: Conversation;
  user_message: AIMessage;
  assistant_message: AIMessage;
  suggested_actions: string[];
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
  createConversation(token: string, interfaceName: Conversation["interface"]) {
    return request<Conversation>("/ai/conversations", token, {
      method: "POST",
      body: JSON.stringify({ interface: interfaceName }),
    });
  },
  listConversations(token: string) {
    return request<Conversation[]>("/ai/conversations", token);
  },
  listMessages(token: string, id: string) {
    return request<AIMessage[]>(`/ai/conversations/${id}/messages`, token);
  },
  sendMessage(token: string, id: string, content: string, route?: string) {
    return request<ChatTurn>(`/ai/conversations/${id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ content, screen_context: route ? { route } : null }),
    });
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
