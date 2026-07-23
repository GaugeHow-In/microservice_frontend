"use client";

import {
  ArrowRight,
  CaretLeft,
  ChatCenteredDots,
  ChatCenteredText,
  ClockCounterClockwise,
  Compass,
  Lightbulb,
  Paperclip,
} from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useLearningContext } from "@/components/providers/learning-context-provider";
import { AIMark } from "@/components/shared/ai-mark";
import { MentorComposer, type MentorContext } from "@/components/shared/mentor-composer";
import { MentorHistoryDrawer, formatRelativeTime } from "@/components/shared/mentor-history-drawer";
import { MentorMessage } from "@/components/shared/mentor-message";
import { MentorOrb } from "@/components/shared/mentor-orb";
import { TwinkleField } from "@/components/shared/twinkle-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { aiClient, type AIMessage, type ChatLearningContext, type ConversationSummary } from "@/lib/ai-client";

const genericPrompts = [
  "Explain a tricky engineering concept",
  "Help me plan this week's study",
  "Quiz me on what I just learned",
  "Give me a memory trick for a formula",
];

/* The hub's capabilities strip. Quiz/planning live in the Tests and
   Roadmaps tabs, so this only sells what the chat itself does. Prompt
   entries prefill a new chat; "new" just opens a fresh one. */
const capabilities: {
  icon: typeof Lightbulb;
  title: string;
  description: string;
  action: { type: "prompt"; value: string } | { type: "new" };
}[] = [
  {
    icon: Lightbulb,
    title: "Explain anything",
    description: "Stuck on a lesson or formula? Get a clear breakdown with sources pulled from your actual courses.",
    action: { type: "prompt", value: "Explain this concept I'm stuck on: " },
  },
  {
    icon: Paperclip,
    title: "Add lesson context",
    description: "Type “/” in the chat to pin a course or lesson — answers stay grounded in exactly what you’re studying.",
    action: { type: "new" },
  },
  {
    icon: Compass,
    title: "Lesson recommendations",
    description: "Ask about any topic and get pointed to the exact lessons to learn more about it.",
    action: { type: "prompt", value: "Recommend lessons to learn more about: " },
  },
];

function MentorPageContent() {
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuth();
  const { context } = useLearningContext();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<MentorContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [freshMessageId, setFreshMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handledPromptRef = useRef<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const dashboardPrompt = searchParams.get("prompt")?.trim() ?? "";
  // The page opens as a hub (history + feature cards); "chat" is entered by
  // starting/resuming a conversation. A dashboard prompt jumps straight in.
  const [view, setView] = useState<"hub" | "chat">(dashboardPrompt ? "chat" : "hub");

  const loadConversations = useCallback(() => {
    if (!accessToken) return;
    setConversationsLoading(true);
    void aiClient
      .listConversations(accessToken)
      .then(setConversations)
      .catch(() => setError("Could not load your history."))
      .finally(() => setConversationsLoading(false));
  }, [accessToken]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!accessToken || !active) {
      setMessages([]);
      return;
    }
    void aiClient.chatHistory(accessToken, active).then(setMessages).catch(() => setError("Could not load messages."));
  }, [accessToken, active]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function newConversation() {
    setActive(null);
    setMessages([]);
    setAttached(null);
    setHistoryOpen(false);
    setView("chat");
  }

  function selectConversation(id: string) {
    setActive(id);
    setAttached(null);
    setHistoryOpen(false);
    setView("chat");
  }

  /** Feature cards open a fresh chat with the prompt prefilled, not sent. */
  function startWithPrompt(prompt: string) {
    setActive(null);
    setMessages([]);
    setAttached(null);
    setInput(prompt);
    setView("chat");
  }

  function backToHub() {
    setView("hub");
    loadConversations();
  }

  function removeConversation(id: string) {
    if (!accessToken) return;
    void aiClient.deleteConversation(accessToken, id).then(() => {
      setConversations((items) => items.filter((item) => item.id !== id));
      if (active === id) newConversation();
    });
  }

  const sendMentorMessage = useCallback(async function sendMentorMessage(
    content: string,
    options: { forceNew?: boolean } = {},
  ) {
    if (!accessToken || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    try {
      const pendingMessage: AIMessage = {
        id: `pending-${Date.now()}`,
        role: "user",
        content,
        disposition: "answered",
        created_at: new Date().toISOString(),
      };
      setMessages((items) => (options.forceNew ? [pendingMessage] : [...items, pendingMessage]));
      // A context pinned via the "/" picker wins over the context inferred from the page.
      const filters = attached
        ? { course_id: attached.course_id, lesson_id: attached.lesson_id ?? null }
        : { course_id: context?.course_id ?? null, lesson_id: context?.lesson_id ?? null };
      const learningContext: ChatLearningContext | null = attached
        ? {
            course_id: attached.course_id,
            course_title: attached.course_title,
            course_slug: attached.course_slug,
            lesson_id: attached.lesson_id ?? null,
            lesson_title: attached.lesson_title ?? null,
            lesson_slug: attached.lesson_slug ?? null,
          }
        : context;
      const turn = await aiClient.queryChat(accessToken, content, options.forceNew ? null : active, filters, learningContext);
      const now = new Date().toISOString();
      const userMessage: AIMessage = {
        id: `user-${turn.message_id}`,
        conversation_id: turn.conversation_id,
        role: "user",
        content,
        created_at: now,
      };
      const assistantMessage: AIMessage = {
        id: turn.message_id,
        conversation_id: turn.conversation_id,
        role: "assistant",
        content: turn.answer,
        confidence: turn.confidence,
        citations: turn.citations,
        retrieved_chunks: turn.retrieved_chunks,
        processing_time_ms: Math.round(turn.processing_time * 1000),
        created_at: now,
      };
      setMessages((items) =>
        options.forceNew
          ? [userMessage, assistantMessage]
          : [
              ...items.filter((message) => message.id !== pendingMessage.id),
              userMessage,
              assistantMessage,
            ],
      );
      setFreshMessageId(assistantMessage.id);
      setActive(turn.conversation_id);
      loadConversations();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GaugeHow AI is unavailable.");
    } finally {
      setBusy(false);
    }
  }, [accessToken, active, attached, busy, context, loadConversations]);

  async function regenerate(messageId: string) {
    if (!accessToken) return;
    setRegeneratingId(messageId);
    setError(null);
    try {
      const turn = await aiClient.regenerateChat(accessToken, messageId);
      const now = new Date().toISOString();
      const updated: AIMessage = {
        id: turn.message_id,
        conversation_id: turn.conversation_id,
        role: "assistant",
        content: turn.answer,
        confidence: turn.confidence,
        citations: turn.citations,
        retrieved_chunks: turn.retrieved_chunks,
        processing_time_ms: Math.round(turn.processing_time * 1000),
        created_at: now,
      };
      setMessages((items) => items.map((message) => (message.id === messageId ? updated : message)));
      setFreshMessageId(updated.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not regenerate that answer.");
    } finally {
      setRegeneratingId(null);
    }
  }

  useEffect(() => {
    if (!accessToken || !dashboardPrompt || handledPromptRef.current === dashboardPrompt || busy) return;
    handledPromptRef.current = dashboardPrompt;
    setView("chat");
    void sendMentorMessage(dashboardPrompt, { forceNew: true });
  }, [accessToken, busy, dashboardPrompt, sendMentorMessage]);

  const submit = useCallback(() => {
    const content = input.trim();
    if (!content) return;
    void sendMentorMessage(content);
  }, [input, sendMentorMessage]);

  const firstName = (user?.display_name ?? "there").split(" ")[0];

  const promptChips = useMemo(() => {
    const contextChips: string[] = [];
    if (context?.lesson_title) contextChips.push(`Explain ${context.lesson_title}`);
    if (context?.course_title) contextChips.push(`Quiz me on ${context.course_title}`);
    return [...contextChips, ...genericPrompts].slice(0, 4);
  }, [context]);

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;

  if (view === "hub") {
    const recentConversations = conversations.slice(0, 5);
    return (
      <AppShell>
        <div className="mx-auto flex w-full max-w-4xl flex-col pb-12">
          {/* Hero band */}
          <div className="relative overflow-hidden py-10 text-center">
            <TwinkleField count={50} />
            <div className="relative flex flex-col items-center gap-4">
              <AIMark className="ai-mark-free size-24 md:size-28" />
              <div>
                <h1 className="text-3xl font-extrabold text-slate-950 md:text-4xl">GaugeHow AI</h1>
                <p className="mx-auto mt-2 max-w-md text-base text-slate-500">
                  Hey {firstName} — your engineering mentor knows your courses, your progress, and what to do next.
                </p>
              </div>
              <Button size="lg" className="rounded-full px-6" onClick={newConversation}>
                <ChatCenteredDots />
                Start a new chat
              </Button>
            </div>
          </div>

          {/* Capabilities: one continuous panel with hairline dividers —
              no repeated boxy cards. Each segment is clickable. */}
          <div className="chrome-surface grid overflow-hidden rounded-2xl md:grid-cols-3">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <button
                  key={capability.title}
                  type="button"
                  onClick={() =>
                    capability.action.type === "new"
                      ? newConversation()
                      : startWithPrompt(capability.action.value)
                  }
                  className="group flex items-start gap-4 border-t border-slate-200/70 p-5 text-left transition hover:bg-[color:var(--surface-secondary)] first:border-t-0 md:border-l md:border-t-0 md:p-6 md:first:border-l-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-extrabold text-slate-950">
                      {capability.title}
                      <ArrowRight className="size-4 shrink-0 text-accent opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">
                      {capability.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recent chats */}
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-950">Pick up where you left off</h2>
              {conversations.length > 5 && (
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="text-sm font-bold text-accent hover:underline"
                >
                  View all
                </button>
              )}
            </div>
            {conversationsLoading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : recentConversations.length ? (
              <div className="chrome-surface overflow-hidden rounded-2xl">
                {recentConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className="flex w-full items-center gap-3 border-t border-slate-200/70 px-5 py-3.5 text-left transition first:border-t-0 hover:bg-[color:var(--surface-secondary)]"
                  >
                    <ChatCenteredText className="size-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-950">
                      {conversation.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatRelativeTime(conversation.updated_at)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="chrome-surface rounded-2xl p-5 text-sm text-slate-500">
                No conversations yet — start your first chat above.
              </p>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>

        <MentorHistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          conversations={conversations}
          loading={conversationsLoading}
          activeId={active}
          onSelect={selectConversation}
          onDelete={removeConversation}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col">
        <div className="flex items-center justify-between gap-2 pb-4">
          <Button variant="ghost" size="sm" onClick={backToHub}>
            <CaretLeft />
            GaugeHow AI
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={newConversation}>
              <ChatCenteredDots />
              New chat
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
              <ClockCounterClockwise />
              History
            </Button>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 text-center">
            <MentorOrb size="lg" state="idle" />
            <div>
              <h1 className="text-3xl font-extrabold text-slate-950 md:text-4xl">Hey {firstName}.</h1>
              <p className="mt-2 text-base text-slate-500">What are we figuring out today?</p>
            </div>

            <MentorComposer
              value={input}
              onChange={setInput}
              onSubmit={submit}
              busy={busy}
              variant="hero"
              placeholder="Ask about lessons, formulas, or your next study move..."
              attached={attached}
              onAttach={setAttached}
            />

            <div className="flex flex-wrap justify-center gap-2">
              {promptChips.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full surface-secondary px-4 py-2 text-xs font-bold text-slate-500 transition hover:text-accent"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 pb-6">
              {messages.map((message) => (
                <MentorMessage
                  key={message.id}
                  message={message}
                  isFresh={message.id === freshMessageId}
                  onRegenerate={message.id === lastAssistantId ? () => regenerate(message.id) : undefined}
                  regenerating={regeneratingId === message.id}
                />
              ))}
              {busy && (
                <div className="flex items-center gap-3">
                  <MentorOrb size="sm" state="thinking" />
                  <span className="text-sm text-slate-400">Thinking…</span>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div ref={transcriptEndRef} />
            </div>

            <div className="sticky bottom-4 mx-auto w-full max-w-2xl">
              <MentorComposer
                value={input}
                onChange={setInput}
                onSubmit={submit}
                busy={busy}
                variant="docked"
                placeholder="Ask a follow-up..."
                attached={attached}
                onAttach={setAttached}
              />
            </div>
          </div>
        )}
      </div>

      <MentorHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        loading={conversationsLoading}
        activeId={active}
        onSelect={selectConversation}
        onDelete={removeConversation}
      />
    </AppShell>
  );
}

export default function MentorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-transparent" />}>
      <MentorPageContent />
    </Suspense>
  );
}
